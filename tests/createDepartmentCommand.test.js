const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { MessageFlags, PermissionFlagsBits } = require('discord.js');

const sqliteFunctionsPath = path.resolve(__dirname, '../src/sqliteFunctions.js');
const createCommand = require('../src/commands/employeeCommands/create.js');

function loadCreateDepartmentModal(createDepartment) {
  const modalPath = path.resolve(
    __dirname,
    '../src/components/modal/department/createDepartmentModal.js'
  );

  delete require.cache[modalPath];
  require.cache[sqliteFunctionsPath] = {
    id: sqliteFunctionsPath,
    filename: sqliteFunctionsPath,
    loaded: true,
    exports: { createDepartment },
  };

  return require(modalPath);
}

function createRoleCache(roleIds = []) {
  const roles = new Map(roleIds.map((id) => [id, { id }]));
  return {
    get: (id) => roles.get(id),
    has: (id) => roles.has(id),
  };
}

function createCommandInteraction({
  roleIds = ['1523620813599936623'],
  roleIdOption = '',
  channelIdOption = '',
} = {}) {
  const replies = [];
  const shownModals = [];

  return {
    interaction: {
      member: {
        roles: {
          cache: createRoleCache(roleIds),
        },
      },
      options: {
        getSubcommand: () => 'department',
        getString: (name) => {
          if (name === 'role_id') return roleIdOption;
          if (name === 'channel_id') return channelIdOption;
          return null;
        },
      },
      reply: async (payload) => {
        replies.push(payload);
      },
      showModal: async (modal) => {
        shownModals.push(modal);
      },
    },
    replies,
    shownModals,
  };
}

function createModalInteraction({ fields, roleIds = ['1523620813599936623'] }) {
  const createdRoles = [];
  const createdChannels = [];
  const replies = [];
  const edits = [];

  const interaction = {
    user: {
      id: 'admin-user',
      tag: 'Admin#0001',
    },
    member: {
      roles: {
        cache: createRoleCache(roleIds),
      },
    },
    customId: fields.customId || 'createDepartmentModal:none:none',
    fields: {
      getTextInputValue: (id) => fields[id] || '',
    },
    guild: {
      roles: {
        everyone: { id: 'everyone-role' },
        cache: {
          get: (id) => (id === 'existing-role' ? { id: 'existing-role' } : null),
        },
        fetch: async (id) => (id === 'existing-role' ? { id: 'existing-role' } : null),
        create: async (payload) => {
          createdRoles.push(payload);
          return { id: 'created-role', ...payload };
        },
      },
      channels: {
        cache: {
          get: (id) => (id === 'existing-channel' ? { id: 'existing-channel' } : null),
        },
        fetch: async (id) => (id === 'existing-channel' ? { id: 'existing-channel' } : null),
        create: async (payload) => {
          createdChannels.push(payload);
          return { id: 'created-channel', ...payload };
        },
      },
      members: {
        me: { id: 'bot-member' },
        fetchMe: async () => ({ id: 'bot-member' }),
      },
    },
    deferReply: async (payload) => {
      replies.push(payload);
    },
    reply: async (payload) => {
      replies.push(payload);
    },
    editReply: async (payload) => {
      edits.push(payload);
    },
  };

  return {
    interaction,
    createdRoles,
    createdChannels,
    replies,
    edits,
  };
}

test('create department modal creates missing role and private management channel', async () => {
  const savedDepartments = [];
  const modal = loadCreateDepartmentModal((department) => {
    savedDepartments.push(department);
    return { id: 1, ...department };
  });
  const { interaction, createdRoles, createdChannels, edits } = createModalInteraction({
    fields: {
      departmentName: 'FBW Test',
      emojiIcon: '🏢',
    },
  });

  await modal.execute(interaction, {});

  assert.equal(createdRoles.length, 1);
  assert.equal(createdRoles[0].name, 'FBW Test');
  assert.equal(createdChannels.length, 1);
  assert.equal(createdChannels[0].name, '🏢┃FBW Test');

  const overwrites = createdChannels[0].permissionOverwrites;
  assert.deepEqual(overwrites[0], {
    id: 'everyone-role',
    deny: [PermissionFlagsBits.ViewChannel],
  });
  assert.deepEqual(overwrites[1], {
    id: '1314413671245676685',
    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
  });

  assert.deepEqual(savedDepartments[0], {
    name: 'FBW Test',
    emoji: '🏢',
    roleId: 'created-role',
    channelId: 'created-channel',
    createdBy: 'admin-user',
  });
  assert.equal(edits.at(-1).flags, MessageFlags.IsComponentsV2);
  assert.equal(Array.isArray(edits.at(-1).components), true);
});

test('/create department opens modal for command administrators', async () => {
  const { interaction, replies, shownModals } = createCommandInteraction();

  await createCommand.execute(interaction, {});

  assert.equal(replies.length, 0);
  assert.equal(shownModals.length, 1);
  assert.equal(shownModals[0].data.custom_id, 'createDepartmentModal:none:none');
});

test('/create department rejects users without command administrator role', async () => {
  const { interaction, replies, shownModals } = createCommandInteraction({ roleIds: [] });

  await createCommand.execute(interaction, {});

  assert.equal(shownModals.length, 0);
  assert.equal(replies.length, 1);
  assert.equal(replies[0].flags, MessageFlags.Ephemeral);
  assert.equal(replies[0].embeds.length, 1);
});

test('/create department passes optional IDs through modal custom id', async () => {
  const { interaction, shownModals } = createCommandInteraction({
    roleIdOption: 'existing-role',
    channelIdOption: 'existing-channel',
  });

  await createCommand.execute(interaction, {});

  assert.equal(shownModals[0].data.custom_id, 'createDepartmentModal:existing-role:existing-channel');
  assert.equal(shownModals[0].components.length, 2);
});

test('create department modal uses command role id and creates only missing channel', async () => {
  const savedDepartments = [];
  const modal = loadCreateDepartmentModal((department) => {
    savedDepartments.push(department);
    return { id: 2, ...department };
  });
  const { interaction, createdRoles, createdChannels } = createModalInteraction({
    fields: {
      departmentName: 'FBW Partial',
      emojiIcon: '⭐',
      customId: 'createDepartmentModal:existing-role:none',
    },
  });

  await modal.execute(interaction, {});

  assert.equal(createdRoles.length, 0);
  assert.equal(createdChannels.length, 1);
  assert.equal(savedDepartments[0].roleId, 'existing-role');
  assert.equal(savedDepartments[0].channelId, 'created-channel');
});

test('create department modal rejects users without command administrator role', async () => {
  const modal = loadCreateDepartmentModal(() => {
    throw new Error('should not save');
  });
  const { interaction, replies } = createModalInteraction({
    roleIds: [],
    fields: {
      departmentName: 'FBW Test',
      emojiIcon: '🏢',
    },
  });

  await modal.execute(interaction, {});

  assert.equal(replies.length, 1);
  assert.equal(replies[0].flags, MessageFlags.Ephemeral);
  assert.match(replies[0].content, /1523620813599936623/);
});
