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

function getPayloadText(payload) {
  return JSON.stringify(payload);
}

test('branch list renders Odoo ID, role, edit buttons, and pagination controls', () => {
  const { buildBranchListPayload } = require('../src/utils/branchUtils');
  const branches = [
    { id: 1, name: 'Main Omnilert', role: null },
    { id: 2, name: 'FBW Primark Center Guagua', role: 'role-2' },
    { id: 3, name: 'FBW DHVSU Bacolor', role: 'role-3' },
    { id: 4, name: 'FBW Robinsons Starmills CSFP', role: 'role-4' },
    { id: 5, name: 'FBW JASA Caldiz Guagua', role: 'role-5' },
    { id: 9, name: 'MS Robinsons Starmills CSFP', role: 'role-9' },
  ];

  const payloadText = getPayloadText(buildBranchListPayload(branches, 0));

  assert.match(payloadText, /Branches/);
  assert.match(payloadText, /Odoo ID/);
  assert.match(payloadText, /FBW Primark Center Guagua/);
  assert.match(payloadText, /<@&role-2>/);
  assert.match(payloadText, /branchEdit:2:0/);
  assert.match(payloadText, /branchPage:1/);
});

test('/view branches rejects users without command administrator role', async () => {
  const viewCommand = loadWithSqliteStub('../src/commands/employeeCommands/view.js', {
    getBranches: () => {
      throw new Error('should not read');
    },
  });
  const replies = [];
  const interaction = {
    member: {
      roles: {
        cache: createRoleCache([]),
      },
    },
    options: {
      getSubcommand: () => 'branches',
    },
    reply: async (payload) => replies.push(payload),
  };

  await viewCommand.execute(interaction, {});

  assert.equal(replies.length, 1);
  assert.equal(replies[0].flags, MessageFlags.Ephemeral);
  assert.match(replies[0].content, /1523620813599936623/);
});

test('/view branches renders SQLite branches', async () => {
  const viewCommand = loadWithSqliteStub('../src/commands/employeeCommands/view.js', {
    getBranches: () => [{ id: 53, name: 'MS LRT Katipunan Station', role: 'role-53' }],
  });
  const replies = [];
  const interaction = {
    member: {
      roles: {
        cache: createRoleCache(),
      },
    },
    options: {
      getSubcommand: () => 'branches',
    },
    reply: async (payload) => replies.push(payload),
  };

  await viewCommand.execute(interaction, {});

  assert.equal(replies.length, 1);
  assert.equal(replies[0].flags, MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral);
  assert.match(getPayloadText(replies[0]), /MS LRT Katipunan Station/);
});

test('/create branch opens modal with Odoo ID and brand defaults', async () => {
  const createCommand = require('../src/commands/employeeCommands/create.js');
  const modals = [];
  const interaction = {
    member: {
      roles: {
        cache: createRoleCache(),
      },
    },
    options: {
      getSubcommand: () => 'branch',
      getInteger: () => 53,
      getString: () => 'monster_siomai',
    },
    showModal: async (modal) => modals.push(modal),
  };

  await createCommand.execute(interaction, {});

  assert.equal(modals.length, 1);
  assert.match(modals[0].data.custom_id, /createBranchModal:53:monster_siomai/);
  assert.match(getPayloadText(modals[0]), /MS/);
});

test('createBranchModal only creates a preview and pending record', async () => {
  const pending = [];
  const createModal = loadWithSqliteStub('../src/components/modal/branch/createBranchModal.js', {
    getBranchById: () => null,
    createPendingBranchCreation: (data, userId) => {
      pending.push({ data, userId });
      return 'pending-1';
    },
  });
  const replies = [];
  const guildCalls = [];
  const interaction = {
    customId: 'createBranchModal:53:monster_siomai',
    user: { id: 'user-1' },
    guild: {
      roles: { create: async () => guildCalls.push('role') },
      channels: { create: async () => guildCalls.push('channel') },
    },
    fields: {
      getTextInputValue(id) {
        return {
          branchName: 'MS LRT Katipunan Station',
          branchNumber: '53',
          rolePrefix: 'MS',
          categoryPrefix: '𝐌𝐒',
          channelPrefix: 'ᴍs',
        }[id];
      },
    },
    reply: async (payload) => replies.push(payload),
  };

  await createModal.execute(interaction, {});

  assert.equal(guildCalls.length, 0);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].data.odooId, 53);
  assert.match(getPayloadText(replies[0]), /Confirm Branch Creation/);
  assert.match(getPayloadText(replies[0]), /branchCreateConfirm:pending-1/);
});

test('branchCreateConfirm creates Discord resources and saves branch', async () => {
  const savedBranches = [];
  const deletedTokens = [];
  const createdChannels = [];
  const confirmButton = loadWithSqliteStub('../src/components/button/branch/branchCreateConfirm.js', {
    getPendingBranchCreation: () => ({
      token: 'pending-1',
      created_by: 'user-1',
      data: {
        odooId: 53,
        brandName: 'Monster Siomai',
        branchName: 'MS LRT Katipunan Station',
        branchNumber: '53',
        rolePrefix: 'MS',
        categoryPrefix: '𝐌𝐒',
        channelPrefix: 'ᴍs',
      },
    }),
    getBranchById: () => null,
    createBranch: (branch) => {
      savedBranches.push(branch);
      return branch;
    },
    deletePendingBranchCreation: (token) => deletedTokens.push(token),
  });
  const edits = [];
  const interaction = {
    customId: 'branchCreateConfirm:pending-1',
    user: { id: 'user-1', tag: 'Tester#0001' },
    deferUpdate: async () => {},
    editReply: async (payload) => edits.push(payload),
    guild: {
      roles: {
        everyone: { id: 'everyone' },
        create: async ({ name }) => ({ id: 'created-role', name }),
      },
      members: {
        me: { id: 'bot-id' },
      },
      channels: {
        create: async (payload) => {
          createdChannels.push(payload);
          return { id: `channel-${createdChannels.length}`, name: payload.name };
        },
      },
    },
  };

  await confirmButton.execute(interaction, {});

  assert.deepEqual(savedBranches, [
    { id: 53, name: 'MS LRT Katipunan Station', role: 'created-role' },
  ]);
  assert.deepEqual(deletedTokens, ['pending-1']);
  assert.equal(createdChannels[0].name, '𝐌𝐒 MS LRT Katipunan Station');
  assert.equal(createdChannels[1].name, 'ᴍs┃53-inquiry');
  assert.match(getPayloadText(edits[0]), /Branch Created/);
});

test('branchCreateCancel deletes pending data without creating resources', async () => {
  const deletedTokens = [];
  const cancelButton = loadWithSqliteStub('../src/components/button/branch/branchCreateCancel.js', {
    deletePendingBranchCreation: (token) => deletedTokens.push(token),
  });
  const updates = [];
  const interaction = {
    customId: 'branchCreateCancel:pending-1',
    update: async (payload) => updates.push(payload),
  };

  await cancelButton.execute(interaction, {});

  assert.deepEqual(deletedTokens, ['pending-1']);
  assert.match(getPayloadText(updates[0]), /Branch Creation Cancelled/);
});
