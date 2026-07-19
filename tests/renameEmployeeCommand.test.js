const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');

const renameCommand = require('../src/commands/employeeCommands/rename.js');
const renameModal = require('../src/components/modal/employee/renameEmployeeModal.js');
const {
  HUMAN_RESOURCE_ROLE_ID,
  buildRenameBudget,
  buildRenameModalCustomId,
  buildRenamedNickname,
  extractStatusPrefix,
  parseRenameModalCustomId,
} = require('../src/utils/renameUtils.js');

function createRoleCache(roleIds = []) {
  const roles = new Map(roleIds.map((id) => [id, { id }]));
  return {
    get: (id) => roles.get(id),
    has: (id) => roles.has(id),
  };
}

function createMember({
  nickname = null,
  username = 'employee',
  manageable = true,
  id = 'target-user',
} = {}) {
  const member = {
    id,
    nickname,
    manageable,
    user: { id, username },
    guild: { ownerId: 'guild-owner' },
    setNickname: async (value) => {
      member.nickname = value;
      member.nicknameWrites.push(value);
    },
    nicknameWrites: [],
    toString: () => `<@${id}>`,
  };

  return member;
}

function createCommandInteraction({
  roleIds = [HUMAN_RESOURCE_ROLE_ID],
  targetMember = createMember(),
} = {}) {
  const replies = [];
  const shownModals = [];

  return {
    interaction: {
      member: { roles: { cache: createRoleCache(roleIds) } },
      user: { id: 'hr-user' },
      options: {
        getSubcommand: () => 'employee',
        getMember: () => targetMember,
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
    targetMember,
  };
}

function createModalInteraction({
  roleIds = [HUMAN_RESOURCE_ROLE_ID],
  targetMember = createMember(),
  newName = 'Jane Doe',
  customId = null,
} = {}) {
  const replies = [];
  const edits = [];

  return {
    interaction: {
      customId: customId || buildRenameModalCustomId(targetMember.id),
      member: { roles: { cache: createRoleCache(roleIds) } },
      user: { id: 'hr-user' },
      guild: {
        members: {
          fetch: async (id) => {
            if (id !== targetMember.id) throw new Error('Unknown member');
            return targetMember;
          },
        },
      },
      fields: {
        getTextInputValue: (id) => (id === 'newName' ? newName : ''),
      },
      reply: async (payload) => {
        replies.push(payload);
      },
      deferReply: async () => {},
      editReply: async (payload) => {
        edits.push(payload);
      },
    },
    replies,
    edits,
    targetMember,
  };
}

function describeOf(payload) {
  return payload.embeds[0].data.description;
}

function inputsOf(modal) {
  return modal.components.map((row) => row.components[0].data);
}

// --- command: guards and modal construction ---

test('/rename employee rejects users without the human resource role', async () => {
  const { interaction, replies, shownModals } = createCommandInteraction({ roleIds: [] });

  await renameCommand.execute(interaction, {});

  assert.equal(shownModals.length, 0);
  assert.equal(replies.length, 1);
  assert.equal(replies[0].flags, MessageFlags.Ephemeral);
  assert.match(replies[0].content, /🔴 ERROR/);
});

test('/rename employee refuses when role hierarchy blocks the change', async () => {
  const targetMember = createMember({ nickname: '🟢 Old Name', manageable: false });
  const { interaction, replies, shownModals } = createCommandInteraction({ targetMember });

  await renameCommand.execute(interaction, {});

  assert.equal(shownModals.length, 0);
  assert.match(replies[0].content, /role/i);
});

test('/rename employee refuses to rename the server owner', async () => {
  const targetMember = createMember({ id: 'guild-owner', nickname: '🟢 Owner' });
  const { interaction, replies, shownModals } = createCommandInteraction({ targetMember });

  await renameCommand.execute(interaction, {});

  assert.equal(shownModals.length, 0);
  assert.match(replies[0].content, /owner/i);
});

test('/rename employee shows a modal prefilled with the current nickname', async () => {
  const targetMember = createMember({ nickname: '🟢 Old Name' });
  const { interaction, shownModals } = createCommandInteraction({ targetMember });

  await renameCommand.execute(interaction, {});

  assert.equal(shownModals.length, 1);
  const [currentName, newName] = inputsOf(shownModals[0]);
  assert.equal(currentName.value, '🟢 Old Name');
  assert.equal(newName.max_length, 29);
  assert.match(newName.label, /29/);
});

test('/rename employee caps the modal at 32 for a member with no prefix', async () => {
  const targetMember = createMember({ nickname: null, username: 'plainuser' });
  const { interaction, shownModals } = createCommandInteraction({ targetMember });

  await renameCommand.execute(interaction, {});

  const [currentName, newName] = inputsOf(shownModals[0]);
  assert.equal(currentName.value, 'plainuser');
  assert.equal(newName.max_length, 32);
});

test('/rename employee caps the modal below 29 for the pipe-variant prefix', async () => {
  const targetMember = createMember({ nickname: '🟢 | Old Name' });
  const { interaction, shownModals } = createCommandInteraction({ targetMember });

  await renameCommand.execute(interaction, {});

  const [, newName] = inputsOf(shownModals[0]);
  assert.equal(newName.max_length, 32 - [...'🟢 | '].length);
});

// --- modal submit: the actual rename ---

test('modal rejects submitters without the human resource role', async () => {
  const { interaction, replies, targetMember } = createModalInteraction({ roleIds: [] });

  await renameModal.execute(interaction, {});

  assert.equal(targetMember.nicknameWrites.length, 0);
  assert.match(replies[0].content, /🔴 ERROR/);
});

test('modal preserves a 🟢 prefix', async () => {
  const targetMember = createMember({ nickname: '🟢 Old Name' });
  const { interaction, edits } = createModalInteraction({ targetMember, newName: 'New Name' });

  await renameModal.execute(interaction, {});

  assert.deepEqual(targetMember.nicknameWrites, ['🟢 New Name']);
  assert.match(describeOf(edits[0]), /✅/);
});

test('modal preserves a 🔴 prefix', async () => {
  const targetMember = createMember({ nickname: '🔴 Old Name' });
  const { interaction } = createModalInteraction({ targetMember, newName: 'New Name' });

  await renameModal.execute(interaction, {});

  assert.deepEqual(targetMember.nicknameWrites, ['🔴 New Name']);
});

test('modal adds no prefix when the member has none', async () => {
  const targetMember = createMember({ nickname: null });
  const { interaction } = createModalInteraction({ targetMember, newName: 'New Name' });

  await renameModal.execute(interaction, {});

  assert.deepEqual(targetMember.nicknameWrites, ['New Name']);
});

test('modal strips a status prefix typed into the new name field', async () => {
  const targetMember = createMember({ nickname: '🟢 Old Name' });
  const { interaction } = createModalInteraction({ targetMember, newName: '🟢 New Name' });

  await renameModal.execute(interaction, {});

  assert.deepEqual(targetMember.nicknameWrites, ['🟢 New Name']);
});

test('modal rejects a whitespace-only name', async () => {
  const targetMember = createMember({ nickname: '🟢 Old Name' });
  const { interaction, edits } = createModalInteraction({ targetMember, newName: '   ' });

  await renameModal.execute(interaction, {});

  assert.equal(targetMember.nicknameWrites.length, 0);
  assert.match(describeOf(edits[0]), /not blank/);
});

test('modal explains the prefix when rejecting an over-long name', async () => {
  const targetMember = createMember({ nickname: '🟢 Old Name' });
  const { interaction, edits } = createModalInteraction({
    targetMember,
    newName: 'a'.repeat(30),
  });

  await renameModal.execute(interaction, {});

  assert.equal(targetMember.nicknameWrites.length, 0);
  const description = describeOf(edits[0]);
  assert.match(description, /29/);
  assert.match(description, /shift-status prefix/);
});

test('modal re-checks hierarchy at submit time', async () => {
  const targetMember = createMember({ nickname: '🟢 Old Name', manageable: false });
  const { interaction, edits } = createModalInteraction({ targetMember });

  await renameModal.execute(interaction, {});

  assert.equal(targetMember.nicknameWrites.length, 0);
  assert.match(describeOf(edits[0]), /role/i);
});

test('modal reports when the member has left the server', async () => {
  const targetMember = createMember({ nickname: '🟢 Old Name' });
  const { interaction, edits } = createModalInteraction({
    targetMember,
    customId: buildRenameModalCustomId('someone-else'),
  });

  await renameModal.execute(interaction, {});

  assert.equal(targetMember.nicknameWrites.length, 0);
  assert.match(describeOf(edits[0]), /no longer a member/);
});

// --- customId round-trip ---

test('rename modal customId round-trips the member id', () => {
  assert.equal(parseRenameModalCustomId(buildRenameModalCustomId('12345')), '12345');
  assert.equal(parseRenameModalCustomId('someOtherModal:12345'), null);
  assert.equal(parseRenameModalCustomId('renameEmployeeModal:'), null);
});

// --- budget arithmetic ---

test('extractStatusPrefix detects both status emojis and the pipe variant', () => {
  assert.equal(extractStatusPrefix('🟢 Jane'), '🟢 ');
  assert.equal(extractStatusPrefix('🔴 Jane'), '🔴 ');
  assert.equal(extractStatusPrefix('🟢 | Jane'), '🟢 | ');
  assert.equal(extractStatusPrefix('Jane'), null);
  assert.equal(extractStatusPrefix(null), null);
});

test('buildRenameBudget agrees with the modal cap for each prefix shape', () => {
  assert.equal(buildRenameBudget(createMember({ nickname: '🟢 X' })).maxNameLength, 29);
  assert.equal(buildRenameBudget(createMember({ nickname: '🔴 X' })).maxNameLength, 29);
  assert.equal(buildRenameBudget(createMember({ nickname: null })).maxNameLength, 32);
  assert.equal(buildRenameBudget(createMember({ nickname: '🟢 | X' })).maxNameLength, 28);
});

test('prefixed member accepts a 29-character name and stays within 32', () => {
  const member = createMember({ nickname: '🟢 Old Name' });
  const result = buildRenamedNickname(member, 'a'.repeat(29));

  assert.equal(result.ok, true);
  assert.equal([...result.nickname].length, 31);
  assert.ok([...result.nickname].length <= 32);
});

test('prefixed member rejects a 30-character name with a 29 budget', () => {
  const member = createMember({ nickname: '🟢 Old Name' });
  const result = buildRenamedNickname(member, 'a'.repeat(30));

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'too_long');
  assert.equal(result.maxNameLength, 29);
});

test('unprefixed member accepts a full 32-character name', () => {
  const member = createMember({ nickname: null });
  const result = buildRenamedNickname(member, 'a'.repeat(32));

  assert.equal(result.ok, true);
  assert.equal([...result.nickname].length, 32);
});

test('unprefixed member rejects a 33-character name with a 32 budget', () => {
  const member = createMember({ nickname: null });
  const result = buildRenamedNickname(member, 'a'.repeat(33));

  assert.equal(result.ok, false);
  assert.equal(result.maxNameLength, 32);
});

test('pipe-variant prefix computes a budget below 29', () => {
  const member = createMember({ nickname: '🟢 | Old Name' });
  const result = buildRenamedNickname(member, 'a'.repeat(29));

  assert.equal(result.ok, false);
  assert.ok(result.maxNameLength < 29);
  assert.equal(result.maxNameLength, 32 - [...'🟢 | '].length);
});

test('astral characters are counted as code points, not UTF-16 units', () => {
  const member = createMember({ nickname: '🟢 Old Name' });
  // 29 code points, but 39 UTF-16 units — a `.length` check would wrongly reject.
  const name = '🎉'.repeat(10) + 'a'.repeat(19);

  assert.equal([...name].length, 29);
  assert.ok(name.length > 29);

  const result = buildRenamedNickname(member, name);
  assert.equal(result.ok, true);
});
