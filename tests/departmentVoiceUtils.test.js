const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const sqliteFunctionsPath = path.resolve(__dirname, '../src/sqliteFunctions.js');
const allowedUserId = '748568303219245117';

function loadDepartmentVoiceUtils(sqliteExports = {}) {
  const modulePath = path.resolve(__dirname, '../src/utils/departmentVoiceUtils.js');
  delete require.cache[modulePath];
  require.cache[sqliteFunctionsPath] = {
    id: sqliteFunctionsPath,
    filename: sqliteFunctionsPath,
    loaded: true,
    exports: {
      getDepartments: () => [],
      getActiveDepartmentVoiceSessionByThreadUser: () => null,
      getDepartmentVoiceSessionByUserDate: () => null,
      markActiveDepartmentVoiceSessionCheckedOut: () => null,
      recordDepartmentVoiceSessionUpdate: () => null,
      upsertDepartmentVoiceSession: () => null,
      ...sqliteExports,
    },
  };
  return require(modulePath);
}

function createRoleCache(roleIds = []) {
  const roles = new Map(roleIds.map((id) => [id, { id }]));
  return {
    has: (id) => roles.has(id),
  };
}

function createMember(roleIds = ['role-1']) {
  return {
    id: allowedUserId,
    nickname: 'Nick',
    displayName: 'Display',
    user: {
      username: 'username',
      tag: 'username#0001',
    },
    roles: {
      cache: createRoleCache(roleIds),
    },
  };
}

test('findMemberDepartment uses the first matching department by id', () => {
  const { findMemberDepartment } = loadDepartmentVoiceUtils();
  const department = findMemberDepartment(createMember(['role-2', 'role-5']), [
    { id: 5, role_id: 'role-5' },
    { id: 2, role_id: 'role-2' },
  ]);

  assert.equal(department.id, 2);
});

test('department voice feature only allows configured test users', async () => {
  const { handleDepartmentVoiceCheckIn, isDepartmentVoiceTestUser } = loadDepartmentVoiceUtils({
    getDepartments: () => {
      throw new Error('should not read departments for disallowed users');
    },
  });

  const result = await handleDepartmentVoiceCheckIn({
    member: {
      ...createMember(),
      id: 'someone-else',
    },
  });

  assert.equal(isDepartmentVoiceTestUser(allowedUserId), true);
  assert.equal(isDepartmentVoiceTestUser('someone-else'), false);
  assert.equal(result, null);
});

test('department voice thread name strips leading status emoji from member nickname', () => {
  const { buildDepartmentVoiceThreadName } = loadDepartmentVoiceUtils();
  const member = {
    ...createMember(),
    nickname: '🟢 | Nick',
  };

  assert.equal(
    buildDepartmentVoiceThreadName('🟢', member, new Date('2026-07-06T01:30:00.000Z')),
    '🟢 | Jul 06, 2026 | Nick'
  );

  member.nickname = '🔴 Nick';
  assert.equal(
    buildDepartmentVoiceThreadName('🔴', member, new Date('2026-07-06T01:30:00.000Z')),
    '🔴 | Jul 06, 2026 | Nick'
  );
});

test('department voice check-in reuses saved daily thread and schedules jobs', async () => {
  const scheduledSessions = [];
  const sentPayloads = [];
  const renamedThreads = [];
  const permissionEdits = [];
  const now = new Date('2026-07-06T01:30:00.000Z');
  const savedThread = {
    id: 'thread-1',
    name: '🔴 | Jul 06, 2026 | Old',
    send: async (payload) => sentPayloads.push(payload),
    setName: async (name) => renamedThreads.push(name),
    members: {
      add: async () => null,
    },
  };
  const { handleDepartmentVoiceCheckIn } = loadDepartmentVoiceUtils({
    getDepartments: () => [
      { id: 1, role_id: 'role-1', channel_id: 'dept-channel' },
    ],
    getDepartmentVoiceSessionByUserDate: () => ({ id: 10, thread_id: 'thread-1' }),
    upsertDepartmentVoiceSession: (session) => ({
      id: 10,
      timer_version: 2,
      user_id: session.userId,
      thread_id: session.threadId,
      guild_id: session.guildId,
      voice_channel_id: session.voiceChannelId,
    }),
  });
  const departmentChannel = {
    id: 'dept-channel',
    threads: {},
    permissionOverwrites: {
      edit: async (...args) => permissionEdits.push(args),
    },
  };
  const state = {
    member: createMember(),
    guild: {
      id: 'guild-1',
      client: {
        channels: {
          fetch: async () => savedThread,
        },
      },
      channels: {
        cache: {
          get: () => departmentChannel,
        },
        fetch: async () => departmentChannel,
      },
      members: {
        me: { id: 'bot-1' },
      },
    },
  };

  const result = await handleDepartmentVoiceCheckIn(
    state,
    async (session) => scheduledSessions.push(session),
    now
  );

  assert.equal(result.session.id, 10);
  assert.deepEqual(renamedThreads, ['🟢 | Jul 06, 2026 | Nick']);
  assert.equal(sentPayloads.length, 1);
  assert.equal(scheduledSessions.length, 1);
  assert.equal(permissionEdits[0][0], 'role-1');
});

test('department voice update records update and reschedules jobs', async () => {
  const scheduledSessions = [];
  const { handleDepartmentVoiceUpdateMessage } = loadDepartmentVoiceUtils({
    getActiveDepartmentVoiceSessionByThreadUser: () => ({ id: 4, active: 1 }),
    recordDepartmentVoiceSessionUpdate: () => ({
      id: 4,
      timer_version: 3,
      user_id: allowedUserId,
      thread_id: 'thread-1',
    }),
  });

  const updatedSession = await handleDepartmentVoiceUpdateMessage(
    {
      author: { id: allowedUserId, bot: false },
      channel: {
        id: 'thread-1',
        isThread: () => true,
      },
    },
    async (session) => scheduledSessions.push(session),
    new Date('2026-07-06T01:45:00.000Z')
  );

  assert.equal(updatedSession.timer_version, 3);
  assert.equal(scheduledSessions.length, 1);
});

test('department voice checkout marks session out, renames thread red, and logs checkout', async () => {
  const sentPayloads = [];
  const renamedThreads = [];
  const { handleDepartmentVoiceCheckOut } = loadDepartmentVoiceUtils({
    markActiveDepartmentVoiceSessionCheckedOut: () => ({
      id: 2,
      thread_id: 'thread-1',
      user_id: allowedUserId,
    }),
  });
  const thread = {
    id: 'thread-1',
    name: '🟢 | Jul 06, 2026 | Nick',
    setName: async (name) => renamedThreads.push(name),
    send: async (payload) => sentPayloads.push(payload),
  };

  await handleDepartmentVoiceCheckOut(
    {
      member: createMember(),
      guild: {
        channels: {
          cache: {
            get: () => thread,
          },
        },
      },
    },
    {
      channels: {
        fetch: async () => thread,
      },
    },
    new Date('2026-07-06T02:00:00.000Z')
  );

  assert.deepEqual(renamedThreads, ['🔴 | Jul 06, 2026 | Nick']);
  assert.equal(sentPayloads.length, 1);
});
