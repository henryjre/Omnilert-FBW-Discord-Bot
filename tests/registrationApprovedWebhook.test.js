const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildApprovedMemberNickname,
  completeOnboardingThread,
  createRegistrationApprovedHandler,
  findOnboardingThread,
  getFirstNameFromUser,
  getRoleLabelForMember,
  isValidRegistrationApprovedPayload,
  lookupApprovedUserForNickname,
  markOnboardingThreadCompleted,
  messageHasVerificationActions,
  renameApprovedMember,
  removeVerificationPromptMessages,
} = require('../src/webhook/websiteRoutes/registration/registrationApproved');

const MANAGEMENT_ROLE_ID = '1314413671245676685';
const SERVICE_CREW_ROLE_ID = '1314413960274907238';

function buildPayload(overrides = {}) {
  const payload = {
    event: 'registration.approved',
    discord_user_id: '123456789012345678',
    user: {
      id: 'approved-user-uuid',
      email: 'user@example.com',
      user_key: 'website-user-key',
    },
    roles: [
      {
        id: 'role-uuid',
        name: 'Service Crew',
        discord_role_id: '987654321098765432',
      },
    ],
  };

  return {
    ...payload,
    ...overrides,
    user: { ...payload.user, ...(overrides.user || {}) },
    roles: overrides.roles || payload.roles,
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function createMockClient({ member, role, onboardingChannel }) {
  const guild = {
    members: {
      cache: new Map(member ? [[member.id, member]] : []),
      fetch: async (memberId) => (member?.id === memberId ? member : null),
    },
    roles: {
      fetch: async (roleId) => (role?.id === roleId ? role : null),
    },
  };

  return {
    guilds: {
      cache: new Map([['guild123', guild]]),
      fetch: async (guildId) => (guildId === 'guild123' ? guild : null),
    },
    channels: {
      cache: new Map(onboardingChannel ? [['onboarding-channel', onboardingChannel]] : []),
      fetch: async (channelId) => (channelId === 'onboarding-channel' ? onboardingChannel : null),
    },
  };
}

test('isValidRegistrationApprovedPayload accepts registration approval payload', () => {
  assert.equal(isValidRegistrationApprovedPayload(buildPayload()), true);
});

test('isValidRegistrationApprovedPayload rejects malformed payloads', () => {
  assert.equal(isValidRegistrationApprovedPayload(buildPayload({ event: 'registration.pending' })), false);
  assert.equal(isValidRegistrationApprovedPayload(buildPayload({ discord_user_id: '' })), false);
  assert.equal(isValidRegistrationApprovedPayload(buildPayload({ user: { email: '' } })), false);
  assert.equal(isValidRegistrationApprovedPayload(buildPayload({ roles: [{ discord_role_id: '123' }] })), false);
});

test('registration approved handler returns 401 when authorization is missing', async () => {
  const handler = createRegistrationApprovedHandler({
    clientInstance: createMockClient({}),
    expectedToken: 'expected-token',
    guildId: 'guild123',
  });
  const req = { headers: {}, body: buildPayload() };
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { ok: false, message: 'Unauthorized' });
});

test('registration approved handler returns 400 when payload is invalid', async () => {
  const handler = createRegistrationApprovedHandler({
    clientInstance: createMockClient({}),
    expectedToken: 'expected-token',
    guildId: 'guild123',
  });
  const req = {
    headers: { authorization: 'Bearer expected-token' },
    body: buildPayload({ discord_user_id: '' }),
  };
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { ok: false, message: 'Invalid payload' });
});

test('registration approved handler adds roles to discord_user_id member', async () => {
  const addedRoleIds = [];
  const renamedNicknames = [];
  const existingRoleIds = new Set();
  const role = { id: '987654321098765432' };
  const member = {
    id: '123456789012345678',
    guild: null,
    roles: {
      cache: {
        has: (roleId) => existingRoleIds.has(roleId),
      },
      add: async (roleToAdd) => {
        addedRoleIds.push(roleToAdd.id);
        existingRoleIds.add(roleToAdd.id);
      },
    },
    setNickname: async (nickname) => {
      renamedNicknames.push(nickname);
    },
  };
  const clientInstance = createMockClient({ member, role });
  member.guild = clientInstance.guilds.cache.get('guild123');

  const handler = createRegistrationApprovedHandler({
    approvedUserLookup: async () => ({ success: true, data: { user: null } }),
    clientInstance,
    expectedToken: 'expected-token',
    guildId: 'guild123',
  });
  const req = {
    headers: { authorization: 'Bearer expected-token' },
    body: buildPayload(),
  };
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(addedRoleIds, ['987654321098765432']);
  assert.deepEqual(res.body, {
    ok: true,
    message: 'Registration approval roles synced',
    discord_user_id: '123456789012345678',
    added_role_ids: ['987654321098765432'],
    skipped_role_ids: [],
    nickname_updated: false,
    nickname: null,
    onboarding_thread_marked: false,
    approved_message_sent: false,
    removed_verification_prompt_count: 0,
  });
  assert.deepEqual(renamedNicknames, []);
});

test('registration approved handler renames user after adding service crew role', async () => {
  const addedRoleIds = [];
  const renamedNicknames = [];
  const role = { id: SERVICE_CREW_ROLE_ID };
  const member = {
    id: '123456789012345678',
    guild: null,
    roles: {
      cache: {
        has: () => false,
      },
      add: async (roleToAdd) => {
        addedRoleIds.push(roleToAdd.id);
      },
    },
    setNickname: async (nickname) => {
      renamedNicknames.push(nickname);
    },
  };
  const clientInstance = createMockClient({ member, role });
  member.guild = clientInstance.guilds.cache.get('guild123');

  const handler = createRegistrationApprovedHandler({
    approvedUserLookup: async () => ({
      success: true,
      data: {
        user: {
          first_name: 'Juan',
        },
      },
    }),
    clientInstance,
    expectedToken: 'expected-token',
    guildId: 'guild123',
  });
  const req = {
    headers: { authorization: 'Bearer expected-token' },
    body: buildPayload({
      user: { first_name: 'Ojie' },
      roles: [
        {
          id: 'role-uuid',
          name: 'Service Crew',
          discord_role_id: SERVICE_CREW_ROLE_ID,
        },
      ],
    }),
  };
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(addedRoleIds, [SERVICE_CREW_ROLE_ID]);
  assert.deepEqual(renamedNicknames, ['Juan - Service Crew']);
  assert.equal(res.body.nickname_updated, true);
  assert.equal(res.body.nickname, 'Juan - Service Crew');
});

test('getFirstNameFromUser prefers first name fields and falls back to email prefix', () => {
  assert.equal(getFirstNameFromUser({ first_name: 'Jane Marie', email: 'fallback@example.com' }), 'Jane');
  assert.equal(getFirstNameFromUser({ firstName: 'John Paul', email: 'fallback@example.com' }), 'John');
  assert.equal(getFirstNameFromUser({ name: 'Alex Smith', email: 'fallback@example.com' }), 'Alex');
  assert.equal(getFirstNameFromUser({ email: 'ojiechan@example.com' }), 'ojiechan');
});

test('buildApprovedMemberNickname uses Service Crew when both role labels apply', () => {
  const member = {
    roles: {
      cache: {
        has: (roleId) => roleId === MANAGEMENT_ROLE_ID,
      },
    },
  };
  const nickname = buildApprovedMemberNickname(
    { first_name: 'Ojie' },
    member,
    [{ discord_role_id: SERVICE_CREW_ROLE_ID }]
  );

  assert.equal(nickname, 'Ojie - Service Crew');
});

test('renameApprovedMember renames management and service crew users', async () => {
  const nicknames = [];
  const member = {
    roles: {
      cache: {
        has: (roleId) => roleId === MANAGEMENT_ROLE_ID,
      },
    },
    setNickname: async (nickname) => {
      nicknames.push(nickname);
    },
  };

  const result = await renameApprovedMember(member, { first_name: 'Mara' }, []);

  assert.deepEqual(result, { updated: true, nickname: 'Mara - Management' });
  assert.deepEqual(nicknames, ['Mara - Management']);
});

test('lookupApprovedUserForNickname returns user from approved user lookup', async () => {
  const user = await lookupApprovedUserForNickname('person@example.com', async (email) => ({
    success: true,
    data: {
      user: {
        email,
        first_name: 'Juan',
      },
    },
  }));

  assert.deepEqual(user, {
    email: 'person@example.com',
    first_name: 'Juan',
  });
});

test('findOnboardingThread returns thread matching discord user id in name', async () => {
  const expectedThread = {
    name: 'Onboarding | 123456789012345678 | ojiechan',
  };
  const parentChannel = {
    threads: {
      cache: new Map([
        ['other', { name: 'Onboarding | 000000000000000000 | someone' }],
        ['expected', expectedThread],
      ]),
    },
  };

  const thread = await findOnboardingThread(parentChannel, '123456789012345678');

  assert.equal(thread, expectedThread);
});

test('markOnboardingThreadCompleted prefixes green check on matched thread', async () => {
  const renamedThreads = [];
  const thread = {
    name: 'Onboarding | 123456789012345678 | ojiechan',
    setName: async (name) => {
      renamedThreads.push(name);
      thread.name = name;
    },
  };
  const onboardingChannel = {
    threads: {
      cache: new Map([['thread123', thread]]),
    },
  };
  const clientInstance = createMockClient({ onboardingChannel });

  const marked = await markOnboardingThreadCompleted(
    clientInstance,
    'onboarding-channel',
    '123456789012345678'
  );

  assert.equal(marked, true);
  assert.deepEqual(renamedThreads, ['✅ Onboarding | 123456789012345678 | ojiechan']);
});

test('messageHasVerificationActions detects Verify and Register actions', () => {
  assert.equal(
    messageHasVerificationActions({
      components: [
        {
          components: [
            { data: { custom_id: 'verifyRegistrationButton' } },
            { data: { label: 'Register' } },
          ],
        },
      ],
    }),
    true
  );
  assert.equal(messageHasVerificationActions({ components: [{ components: [{ data: { label: 'Other' } }] }] }), false);
});

test('removeVerificationPromptMessages deletes thread messages with Verify/Register actions', async () => {
  const deletedMessageIds = [];
  const messages = new Map([
    [
      'verify',
      {
        components: [{ components: [{ data: { custom_id: 'verifyRegistrationButton' } }] }],
        delete: async () => deletedMessageIds.push('verify'),
      },
    ],
    [
      'other',
      {
        components: [{ components: [{ data: { label: 'Other' } }] }],
        delete: async () => deletedMessageIds.push('other'),
      },
    ],
  ]);
  const thread = {
    messages: {
      fetch: async () => messages,
    },
  };

  const removedCount = await removeVerificationPromptMessages(thread);

  assert.equal(removedCount, 1);
  assert.deepEqual(deletedMessageIds, ['verify']);
});

test('completeOnboardingThread marks thread, sends approved message, and removes verification prompts', async () => {
  const sentMessages = [];
  const deletedMessageIds = [];
  const thread = {
    name: 'Onboarding | 123456789012345678 | ojiechan',
    setName: async (name) => {
      thread.name = name;
    },
    send: async (payload) => {
      sentMessages.push(payload);
    },
    messages: {
      fetch: async () =>
        new Map([
          [
            'verify',
            {
              components: [{ components: [{ data: { custom_id: 'verifyRegistrationButton' } }] }],
              delete: async () => deletedMessageIds.push('verify'),
            },
          ],
        ]),
    },
  };
  const onboardingChannel = {
    threads: {
      cache: new Map([['thread123', thread]]),
    },
  };
  const clientInstance = createMockClient({ onboardingChannel });

  const result = await completeOnboardingThread(
    clientInstance,
    'onboarding-channel',
    '123456789012345678'
  );

  assert.deepEqual(result, {
    marked: true,
    approvedMessageSent: true,
    removedPromptCount: 1,
  });
  assert.equal(thread.name, '✅ Onboarding | 123456789012345678 | ojiechan');
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].flags, require('discord.js').MessageFlags.IsComponentsV2);
  assert.deepEqual(deletedMessageIds, ['verify']);
});

test('registration approved handler completes onboarding thread after syncing roles', async () => {
  const addedRoleIds = [];
  const renamedNicknames = [];
  const role = { id: '987654321098765432' };
  const sentMessages = [];
  const deletedMessageIds = [];
  const thread = {
    name: 'Onboarding | 123456789012345678 | ojiechan',
    setName: async (name) => {
      thread.name = name;
    },
    send: async (payload) => {
      sentMessages.push(payload);
    },
    messages: {
      fetch: async () =>
        new Map([
          [
            'register',
            {
              components: [{ components: [{ data: { label: 'Register' } }] }],
              delete: async () => deletedMessageIds.push('register'),
            },
          ],
        ]),
    },
  };
  const onboardingChannel = {
    threads: {
      cache: new Map([['thread123', thread]]),
    },
  };
  const member = {
    id: '123456789012345678',
    guild: null,
    roles: {
      cache: {
        has: () => false,
      },
      add: async (roleToAdd) => {
        addedRoleIds.push(roleToAdd.id);
      },
    },
    setNickname: async (nickname) => {
      renamedNicknames.push(nickname);
    },
  };
  const clientInstance = createMockClient({ member, role, onboardingChannel });
  member.guild = clientInstance.guilds.cache.get('guild123');

  const handler = createRegistrationApprovedHandler({
    approvedUserLookup: async () => ({ success: true, data: { user: null } }),
    clientInstance,
    expectedToken: 'expected-token',
    guildId: 'guild123',
    onboardingParentChannelId: 'onboarding-channel',
  });
  const req = {
    headers: { authorization: 'Bearer expected-token' },
    body: buildPayload(),
  };
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(addedRoleIds, ['987654321098765432']);
  assert.deepEqual(renamedNicknames, []);
  assert.equal(thread.name, '✅ Onboarding | 123456789012345678 | ojiechan');
  assert.equal(res.body.onboarding_thread_marked, true);
  assert.equal(res.body.approved_message_sent, true);
  assert.equal(res.body.removed_verification_prompt_count, 1);
  assert.equal(sentMessages.length, 1);
  assert.deepEqual(deletedMessageIds, ['register']);
});
