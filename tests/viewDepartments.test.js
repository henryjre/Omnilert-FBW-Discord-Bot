const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { MessageFlags } = require('discord.js');

const sqliteFunctionsPath = path.resolve(__dirname, '../src/sqliteFunctions.js');
const adminRoleId = '1523620813599936623';

function loadWithSqliteStub(relativePath, sqliteExports) {
  const modulePath = path.resolve(__dirname, relativePath);
  delete require.cache[modulePath];
  require.cache[sqliteFunctionsPath] = {
    id: sqliteFunctionsPath,
    filename: sqliteFunctionsPath,
    loaded: true,
    exports: sqliteExports,
  };
  return require(modulePath);
}

function createRoleCache(roleIds = [adminRoleId]) {
  const roles = new Map(roleIds.map((id) => [id, { id }]));
  return {
    get: (id) => roles.get(id),
    has: (id) => roles.has(id),
  };
}

function createCommandInteraction(roleIds = [adminRoleId]) {
  const replies = [];
  return {
    interaction: {
      member: {
        roles: {
          cache: createRoleCache(roleIds),
        },
      },
      options: {
        getSubcommand: () => 'departments',
      },
      reply: async (payload) => replies.push(payload),
    },
    replies,
  };
}

function createButtonInteraction(customId, roleIds = [adminRoleId]) {
  const replies = [];
  const updates = [];
  return {
    interaction: {
      customId,
      member: {
        roles: {
          cache: createRoleCache(roleIds),
        },
      },
      reply: async (payload) => replies.push(payload),
      update: async (payload) => updates.push(payload),
    },
    replies,
    updates,
  };
}

function createModalInteraction({ customId, fields, roleIds = [adminRoleId], guild }) {
  const replies = [];
  const edits = [];
  return {
    interaction: {
      customId,
      member: {
        roles: {
          cache: createRoleCache(roleIds),
        },
      },
      fields: {
        getTextInputValue: (id) => fields[id] || '',
      },
      guild,
      reply: async (payload) => replies.push(payload),
      deferReply: async (payload) => replies.push(payload),
      editReply: async (payload) => edits.push(payload),
    },
    replies,
    edits,
  };
}

function getPayloadText(payload) {
  return JSON.stringify(payload);
}

test('/view departments rejects users without command administrator role', async () => {
  const viewCommand = loadWithSqliteStub('../src/commands/employeeCommands/view.js', {
    getDepartments: () => {
      throw new Error('should not read');
    },
  });
  const { interaction, replies } = createCommandInteraction([]);

  await viewCommand.execute(interaction, {});

  assert.equal(replies.length, 1);
  assert.equal(replies[0].flags, MessageFlags.Ephemeral);
  assert.match(replies[0].content, /1523620813599936623/);
});

test('/view departments renders empty Components V2 state', async () => {
  const viewCommand = loadWithSqliteStub('../src/commands/employeeCommands/view.js', {
    getDepartments: () => [],
  });
  const { interaction, replies } = createCommandInteraction();

  await viewCommand.execute(interaction, {});

  assert.equal(replies.length, 1);
  assert.equal(replies[0].flags, MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral);
  assert.match(getPayloadText(replies[0]), /No departments have been created yet/);
});

test('department list renders formatted name, role, channel, and pagination controls', () => {
  const { buildDepartmentListPayload } = require('../src/functions/helpers/departmentUtils');
  const departments = [
    { id: 1, name: 'Alpha', emoji: '🅰️', role_id: 'role-1', channel_id: 'channel-1' },
    { id: 2, name: 'Beta', emoji: '🅱️', role_id: 'role-2', channel_id: 'channel-2' },
    { id: 3, name: 'Gamma', emoji: '🇬', role_id: null, channel_id: null },
    { id: 4, name: 'Delta', emoji: '🇩', role_id: 'role-4', channel_id: 'channel-4' },
  ];

  const payloadText = getPayloadText(buildDepartmentListPayload(departments, 0));

  assert.match(payloadText, /🅰️┃Alpha/);
  assert.match(payloadText, /<@&role-1>/);
  assert.match(payloadText, /<#channel-1>/);
  assert.match(payloadText, /departmentEdit:1:0/);
  assert.match(payloadText, /departmentDelete:1:0/);
  assert.match(payloadText, /departmentPage:1/);
});

test('department delete button first shows confirmation', async () => {
  const deleteButton = loadWithSqliteStub(
    '../src/components/button/department/departmentDelete.js',
    {
      getDepartmentById: () => ({
        id: 7,
        name: 'Delete Me',
        emoji: '🧾',
        role_id: 'role-7',
        channel_id: 'channel-7',
      }),
    }
  );
  const { interaction, updates } = createButtonInteraction('departmentDelete:7:0');

  await deleteButton.execute(interaction, {});

  assert.equal(updates.length, 1);
  assert.match(getPayloadText(updates[0]), /Confirm Department Delete/);
  assert.match(getPayloadText(updates[0]), /departmentDeleteConfirm:7:0/);
});

test('department delete cancel returns to list without deleting', async () => {
  const cancelButton = loadWithSqliteStub(
    '../src/components/button/department/departmentDeleteCancel.js',
    {
      getDepartments: () => [
        { id: 1, name: 'Alpha', emoji: '🅰️', role_id: 'role-1', channel_id: 'channel-1' },
      ],
    }
  );
  const { interaction, updates } = createButtonInteraction('departmentDeleteCancel:0');

  await cancelButton.execute(interaction, {});

  assert.equal(updates.length, 1);
  assert.match(getPayloadText(updates[0]), /🅰️┃Alpha/);
});

test('department delete confirm deletes channel, role, and db row', async () => {
  const deleted = [];
  const confirmButton = loadWithSqliteStub(
    '../src/components/button/department/departmentDeleteConfirm.js',
    {
      getDepartmentById: () => ({
        id: 9,
        name: 'Delete Me',
        emoji: '🗑️',
        role_id: 'role-9',
        channel_id: 'channel-9',
      }),
      getDepartments: () => [],
      deleteDepartment: (id) => deleted.push(['db', id]),
    }
  );
  const { interaction, updates } = createButtonInteraction('departmentDeleteConfirm:9:0');
  interaction.guild = {
    channels: {
      cache: {
        get: () => ({ delete: async () => deleted.push(['channel', 'channel-9']) }),
      },
      fetch: async () => null,
    },
    roles: {
      cache: {
        get: () => ({ delete: async () => deleted.push(['role', 'role-9']) }),
      },
      fetch: async () => null,
    },
  };

  await confirmButton.execute(interaction, {});

  assert.deepEqual(deleted, [
    ['channel', 'channel-9'],
    ['role', 'role-9'],
    ['db', 9],
  ]);
  assert.equal(updates.length, 1);
  assert.match(getPayloadText(updates[0]), /No departments have been created yet/);
});

test('edit department modal updates db and renames channel when formatted name changes', async () => {
  const updates = [];
  const renamed = [];
  const editModal = loadWithSqliteStub('../src/components/modal/department/editDepartmentModal.js', {
    getDepartmentById: () => ({
      id: 3,
      name: 'Old',
      emoji: '🟦',
      role_id: 'role-3',
      channel_id: 'channel-3',
    }),
    updateDepartment: (department) => {
      updates.push(department);
      return {
        id: department.id,
        name: department.name,
        emoji: department.emoji,
        role_id: department.roleId,
        channel_id: department.channelId,
      };
    },
  });
  const guild = {
    roles: {
      cache: { get: () => ({ id: 'role-4' }) },
      fetch: async () => null,
    },
    channels: {
      cache: {
        get: () => ({
          id: 'channel-4',
          setName: async (name) => renamed.push(name),
        }),
      },
      fetch: async () => null,
    },
  };
  const { interaction, edits } = createModalInteraction({
    customId: 'editDepartmentModal:3:0',
    guild,
    fields: {
      departmentName: 'New',
      emojiIcon: '🟩',
      roleId: 'role-4',
      channelId: 'channel-4',
    },
  });

  await editModal.execute(interaction, {});

  assert.deepEqual(renamed, ['🟩┃New']);
  assert.deepEqual(updates[0], {
    id: 3,
    name: 'New',
    emoji: '🟩',
    roleId: 'role-4',
    channelId: 'channel-4',
  });
  assert.equal(edits.at(-1).flags, MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral);
});
