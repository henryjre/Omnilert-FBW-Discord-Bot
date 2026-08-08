const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildStatusNickname,
  canManageMember,
  setAttendanceStatusNickname,
} = require('../src/utils/discordMemberStatus');

function makeMember({ id = 'user1', nickname = null, username = 'someone', ownerId = 'owner1', manageable = true } = {}) {
  return {
    id,
    nickname,
    manageable,
    user: { username },
    guild: { ownerId },
    setNickname(next) {
      this.nickname = next;
      return Promise.resolve(this);
    },
  };
}

test('buildStatusNickname swaps an existing status emoji in place', () => {
  const member = makeMember({ nickname: '🟢 Cristine - Store Manager' });

  assert.equal(buildStatusNickname(member, '🔴'), '🔴 Cristine - Store Manager');
});

test('buildStatusNickname swaps red back to green', () => {
  const member = makeMember({ nickname: '🔴 Cristine - Store Manager' });

  assert.equal(buildStatusNickname(member, '🟢'), '🟢 Cristine - Store Manager');
});

test('buildStatusNickname prepends the emoji when the name has neither', () => {
  const member = makeMember({ nickname: 'Cristine - Store Manager' });

  assert.equal(buildStatusNickname(member, '🟢'), '🟢 Cristine - Store Manager');
});

test('buildStatusNickname falls back to the username when no nickname is set', () => {
  const member = makeMember({ nickname: null, username: 'cristine' });

  assert.equal(buildStatusNickname(member, '🔴'), '🔴 cristine');
});

test('buildStatusNickname is idempotent when the emoji is already correct', () => {
  const member = makeMember({ nickname: '🟢 Cristine - Store Manager' });

  assert.equal(buildStatusNickname(member, '🟢'), '🟢 Cristine - Store Manager');
});

test('canManageMember refuses the server owner', () => {
  const member = makeMember({ id: 'owner1', ownerId: 'owner1' });

  assert.deepEqual(canManageMember(member), { ok: false, reason: 'server owner' });
});

test('canManageMember refuses a member above the bot in role hierarchy', () => {
  const member = makeMember({ manageable: false });

  assert.deepEqual(canManageMember(member), { ok: false, reason: 'role hierarchy' });
});

test('canManageMember reports a missing member rather than throwing', () => {
  assert.deepEqual(canManageMember(undefined), { ok: false, reason: 'member not found' });
});

test('setAttendanceStatusNickname leaves the server owner untouched', async () => {
  const member = makeMember({ id: 'owner1', ownerId: 'owner1', nickname: '🔴 Henry - Tech & Development' });

  const result = await setAttendanceStatusNickname(member, '🟢');

  assert.equal(result.updated, false);
  assert.equal(result.reason, 'server owner');
  assert.equal(member.nickname, '🔴 Henry - Tech & Development');
});

test('setAttendanceStatusNickname writes the new nickname for a manageable member', async () => {
  const member = makeMember({ nickname: '🟢 Cristine - Store Manager' });

  const result = await setAttendanceStatusNickname(member, '🔴');

  assert.equal(result.updated, true);
  assert.equal(member.nickname, '🔴 Cristine - Store Manager');
});

test('setAttendanceStatusNickname does not throw on a missing member', async () => {
  const result = await setAttendanceStatusNickname(undefined, '🔴');

  assert.equal(result.updated, false);
  assert.equal(result.reason, 'member not found');
});
