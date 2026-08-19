const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildArchivedEmployeeKickReason,
  createEmployeeArchivedHandler,
  isValidEmployeeArchivedPayload,
} = require('../src/webhook/websiteRoutes/employees/archive');

function buildPayload(overrides = {}) {
  const payload = {
    event: 'employee.archived',
    version: 1,
    environment: 'development',
    sent_at: '2026-08-19T06:14:00.000Z',
    action: 'kick',
    employee: {
      id: 'employee-user-uuid',
      user_key: 'odoo-website-key-or-null',
      discord_user_id: '123456789012345678',
      email: 'employee@example.com',
      first_name: 'First',
      last_name: 'Last',
    },
    archival: {
      date: '2026-08-19',
      reason_id: 1,
      reason_label: 'Fired',
      description: 'HTML/string archival description',
    },
  };

  return {
    ...payload,
    ...overrides,
    employee: { ...payload.employee, ...(overrides.employee || {}) },
    archival: { ...payload.archival, ...(overrides.archival || {}) },
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

function createMockMember({
  id = '123456789012345678',
  ownerId = 'guild-owner',
  manageable = true,
  kickError,
} = {}) {
  const kicks = [];
  const member = {
    id,
    manageable,
    guild: { ownerId },
    kick: async (reason) => {
      if (kickError) throw kickError;
      kicks.push(reason);
    },
  };

  return { member, kicks };
}

function createMockClient({
  guildId = 'guild123',
  member,
  ownerId = 'guild-owner',
  useFetch = false,
  fetchMember = member,
} = {}) {
  const fetchedMembers = [];
  const guild = {
    id: guildId,
    ownerId,
    members: {
      cache: new Map(!useFetch && member ? [[member.id, member]] : []),
      fetch: async (memberId) => {
        fetchedMembers.push(memberId);
        return fetchMember?.id === memberId ? fetchMember : null;
      },
    },
  };

  if (member) {
    member.guild = guild;
  }

  const client = {
    guilds: {
      cache: new Map([[guildId, guild]]),
      fetch: async (id) => (id === guildId ? guild : null),
    },
  };

  return { client, fetchedMembers, guild };
}

test('isValidEmployeeArchivedPayload accepts a valid employee archive payload', () => {
  assert.equal(isValidEmployeeArchivedPayload(buildPayload()), true);
});

test('isValidEmployeeArchivedPayload rejects malformed payloads', () => {
  assert.equal(isValidEmployeeArchivedPayload(null), false);
  assert.equal(isValidEmployeeArchivedPayload(buildPayload({ event: 'employee.updated' })), false);
  assert.equal(isValidEmployeeArchivedPayload(buildPayload({ version: '1' })), false);
  assert.equal(isValidEmployeeArchivedPayload(buildPayload({ action: 'notify' })), false);
  assert.equal(isValidEmployeeArchivedPayload(buildPayload({ employee: { id: '' } })), false);
  assert.equal(isValidEmployeeArchivedPayload(buildPayload({ employee: { discord_user_id: '' } })), false);
  assert.equal(isValidEmployeeArchivedPayload(buildPayload({ employee: { email: '' } })), false);
  assert.equal(isValidEmployeeArchivedPayload(buildPayload({ archival: { date: '' } })), false);
  assert.equal(isValidEmployeeArchivedPayload(buildPayload({ archival: { reason_label: '' } })), false);
});

test('buildArchivedEmployeeKickReason includes archive label and email', () => {
  assert.equal(
    buildArchivedEmployeeKickReason(buildPayload()),
    'Employee archived: Fired (employee@example.com)'
  );
});

test('handler returns 401 when authorization is missing or wrong', async () => {
  const { member } = createMockMember();
  const { client } = createMockClient({ member });
  const handler = createEmployeeArchivedHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
    guildId: 'guild123',
  });
  const res = createMockRes();

  await handler({ headers: {}, body: buildPayload() }, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { ok: false, message: 'Unauthorized' });
});

test('handler returns 400 for an invalid payload', async () => {
  const { member } = createMockMember();
  const { client } = createMockClient({ member });
  const handler = createEmployeeArchivedHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
    guildId: 'guild123',
  });
  const res = createMockRes();

  await handler(
    { headers: { authorization: 'Bearer expected-token' }, body: buildPayload({ action: 'notify' }) },
    res
  );

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { ok: false, message: 'Invalid payload' });
});

test('handler kicks a cached Discord member', async () => {
  const { member, kicks } = createMockMember();
  const { client, fetchedMembers } = createMockClient({ member });
  const handler = createEmployeeArchivedHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
    guildId: 'guild123',
  });
  const res = createMockRes();

  await handler(
    { headers: { authorization: 'Bearer expected-token' }, body: buildPayload() },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    ok: true,
    discord_user_id: '123456789012345678',
    kicked: true,
  });
  assert.deepEqual(fetchedMembers, []);
  assert.deepEqual(kicks, ['Employee archived: Fired (employee@example.com)']);
});

test('handler fetches and kicks a Discord member when not cached', async () => {
  const { member, kicks } = createMockMember();
  const { client, fetchedMembers } = createMockClient({ member, useFetch: true });
  const handler = createEmployeeArchivedHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
    guildId: 'guild123',
  });
  const res = createMockRes();

  await handler(
    { headers: { authorization: 'Bearer expected-token' }, body: buildPayload() },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    ok: true,
    discord_user_id: '123456789012345678',
    kicked: true,
  });
  assert.deepEqual(fetchedMembers, ['123456789012345678']);
  assert.deepEqual(kicks, ['Employee archived: Fired (employee@example.com)']);
});

test('handler treats a missing Discord member as an idempotent success', async () => {
  const { client, fetchedMembers } = createMockClient({ useFetch: true, fetchMember: null });
  const handler = createEmployeeArchivedHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
    guildId: 'guild123',
  });
  const res = createMockRes();

  await handler(
    { headers: { authorization: 'Bearer expected-token' }, body: buildPayload() },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    ok: true,
    discord_user_id: '123456789012345678',
    kicked: false,
    reason: 'not-found',
  });
  assert.deepEqual(fetchedMembers, ['123456789012345678']);
});

test('handler does not kick the server owner', async () => {
  const { member, kicks } = createMockMember({
    id: '123456789012345678',
  });
  const { client } = createMockClient({ member, ownerId: '123456789012345678' });
  const handler = createEmployeeArchivedHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
    guildId: 'guild123',
  });
  const res = createMockRes();
  const originalConsoleInfo = console.info;
  console.info = () => {};

  try {
    await handler(
      { headers: { authorization: 'Bearer expected-token' }, body: buildPayload() },
      res
    );
  } finally {
    console.info = originalConsoleInfo;
  }

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    ok: true,
    discord_user_id: '123456789012345678',
    kicked: false,
    reason: 'server owner',
  });
  assert.deepEqual(kicks, []);
});

test('handler does not kick an unmanageable Discord member', async () => {
  const { member, kicks } = createMockMember({ manageable: false });
  const { client } = createMockClient({ member });
  const handler = createEmployeeArchivedHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
    guildId: 'guild123',
  });
  const res = createMockRes();
  const originalConsoleInfo = console.info;
  console.info = () => {};

  try {
    await handler(
      { headers: { authorization: 'Bearer expected-token' }, body: buildPayload() },
      res
    );
  } finally {
    console.info = originalConsoleInfo;
  }

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    ok: true,
    discord_user_id: '123456789012345678',
    kicked: false,
    reason: 'role hierarchy',
  });
  assert.deepEqual(kicks, []);
});

test('handler returns 500 when Discord kick fails unexpectedly', async () => {
  const { member } = createMockMember({ kickError: new Error('kick failed') });
  const { client } = createMockClient({ member });
  const handler = createEmployeeArchivedHandler({
    clientInstance: client,
    expectedToken: 'expected-token',
    guildId: 'guild123',
  });
  const res = createMockRes();
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    await handler(
      { headers: { authorization: 'Bearer expected-token' }, body: buildPayload() },
      res
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    ok: false,
    message: 'Failed to kick archived employee',
  });
});
