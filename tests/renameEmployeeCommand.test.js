const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageFlags } = require('discord.js');

const renameCommand = require('../src/commands/employeeCommands/rename.js');
const {
  HUMAN_RESOURCE_ROLE_ID,
  buildRenamedNickname,
  extractStatusPrefix,
} = require('../src/utils/renameUtils.js');

function createRoleCache(roleIds = []) {
  const roles = new Map(roleIds.map((id) => [id, { id }]));
  return {
    get: (id) => roles.get(id),
    has: (id) => roles.has(id),
  };
}

function createMember({ nickname = null, username = 'employee', manageable = true, id = 'target-user' } = {}) {
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

function createInteraction({
  roleIds = [HUMAN_RESOURCE_ROLE_ID],
  targetMember = createMember(),
  name = 'Jane Doe',
} = {}) {
  const edits = [];

  return {
    interaction: {
      member: { roles: { cache: createRoleCache(roleIds) } },
      user: { id: 'hr-user' },
      options: {
        getSubcommand: () => 'employee',
        getMember: () => targetMember,
        getString: (option) => (option === 'name' ? name : null),
      },
      deferReply: async () => {},
      editReply: async (payload) => {
        edits.push(payload);
      },
    },
    edits,
    targetMember,
  };
}

function describeOf(payload) {
  return payload.embeds[0].data.description;
}

test('/rename employee rejects users without the human resource role', async () => {
  const { interaction, edits, targetMember } = createInteraction({ roleIds: [] });

  await renameCommand.execute(interaction, {});

  assert.equal(targetMember.nicknameWrites.length, 0);
  assert.equal(edits.length, 1);
  assert.equal(edits[0].flags, MessageFlags.Ephemeral);
  assert.match(describeOf(edits[0]), /🔴 ERROR/);
});

test('/rename employee preserves a 🟢 prefix', async () => {
  const targetMember = createMember({ nickname: '🟢 Old Name' });
  const { interaction, edits } = createInteraction({ targetMember, name: 'New Name' });

  await renameCommand.execute(interaction, {});

  assert.deepEqual(targetMember.nicknameWrites, ['🟢 New Name']);
  assert.match(describeOf(edits[0]), /✅/);
});

test('/rename employee preserves a 🔴 prefix', async () => {
  const targetMember = createMember({ nickname: '🔴 Old Name' });
  const { interaction } = createInteraction({ targetMember, name: 'New Name' });

  await renameCommand.execute(interaction, {});

  assert.deepEqual(targetMember.nicknameWrites, ['🔴 New Name']);
});

test('/rename employee adds no prefix when the member has none', async () => {
  const targetMember = createMember({ nickname: null });
  const { interaction } = createInteraction({ targetMember, name: 'New Name' });

  await renameCommand.execute(interaction, {});

  assert.deepEqual(targetMember.nicknameWrites, ['New Name']);
});

test('/rename employee strips a status prefix typed into the name option', async () => {
  const targetMember = createMember({ nickname: '🟢 Old Name' });
  const { interaction } = createInteraction({ targetMember, name: '🟢 New Name' });

  await renameCommand.execute(interaction, {});

  assert.deepEqual(targetMember.nicknameWrites, ['🟢 New Name']);
});

test('/rename employee rejects a whitespace-only name', async () => {
  const targetMember = createMember({ nickname: '🟢 Old Name' });
  const { interaction, edits } = createInteraction({ targetMember, name: '   ' });

  await renameCommand.execute(interaction, {});

  assert.equal(targetMember.nicknameWrites.length, 0);
  assert.match(describeOf(edits[0]), /not blank/);
});

test('/rename employee refuses when role hierarchy blocks the change', async () => {
  const targetMember = createMember({ nickname: '🟢 Old Name', manageable: false });
  const { interaction, edits } = createInteraction({ targetMember });

  await renameCommand.execute(interaction, {});

  assert.equal(targetMember.nicknameWrites.length, 0);
  assert.match(describeOf(edits[0]), /role/i);
});

test('/rename employee refuses to rename the server owner', async () => {
  const targetMember = createMember({ id: 'guild-owner', nickname: '🟢 Owner' });
  const { interaction, edits } = createInteraction({ targetMember });

  await renameCommand.execute(interaction, {});

  assert.equal(targetMember.nicknameWrites.length, 0);
  assert.match(describeOf(edits[0]), /owner/i);
});

test('/rename employee explains the prefix when rejecting an over-long name', async () => {
  const targetMember = createMember({ nickname: '🟢 Old Name' });
  const { interaction, edits } = createInteraction({ targetMember, name: 'a'.repeat(30) });

  await renameCommand.execute(interaction, {});

  assert.equal(targetMember.nicknameWrites.length, 0);
  const description = describeOf(edits[0]);
  assert.match(description, /29/);
  assert.match(description, /shift-status prefix/);
});

test('extractStatusPrefix detects both status emojis and the pipe variant', () => {
  assert.equal(extractStatusPrefix('🟢 Jane'), '🟢 ');
  assert.equal(extractStatusPrefix('🔴 Jane'), '🔴 ');
  assert.equal(extractStatusPrefix('🟢 | Jane'), '🟢 | ');
  assert.equal(extractStatusPrefix('Jane'), null);
  assert.equal(extractStatusPrefix(null), null);
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
