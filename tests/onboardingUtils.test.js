const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ONBOARDING_ROLE_REMOVAL_DELAY_MS,
  buildCompletedOnboardingThreadName,
  buildDiscordAlreadyLinkedContainer,
  buildDiscordThreadUrl,
  buildNoRegistrationRecordContainer,
  buildOnboardingRoleRemovalJobOptions,
  buildRegisterUrl,
  getUserDiscordIdFromLookup,
  getUserRolesFromLookup,
  isDiscordAlreadyLinkedResponse,
  normalizeRegistrationStatus,
  syncApprovedDiscordRoles,
} = require('../src/functions/helpers/onboardingUtils');

test('buildRegisterUrl includes encoded onboarding thread source', () => {
  const threadUrl = buildDiscordThreadUrl('guild123', 'thread456');
  const registerUrl = new URL(buildRegisterUrl(threadUrl));

  assert.equal(registerUrl.origin + registerUrl.pathname, 'https://omnilert.app/register');
  assert.equal(registerUrl.searchParams.get('source'), threadUrl);
});

test('normalizeRegistrationStatus maps registration API responses', () => {
  assert.equal(
    normalizeRegistrationStatus({
      success: true,
      data: { registration: { exists: true, status: 'pending' } },
    }),
    'pending'
  );
  assert.equal(
    normalizeRegistrationStatus({
      success: true,
      data: { registration: { exists: true, status: 'approved' } },
    }),
    'approved'
  );
  assert.equal(
    normalizeRegistrationStatus({
      success: true,
      data: { registration: { exists: true, status: 'rejected' } },
    }),
    'unavailable'
  );
  assert.equal(
    normalizeRegistrationStatus({
      success: true,
      data: { registration: { exists: false, status: null } },
    }),
    'not_found'
  );
});

test('buildCompletedOnboardingThreadName prefixes green check once', () => {
  assert.equal(
    buildCompletedOnboardingThreadName('Onboarding | 123 | person'),
    '✅ Onboarding | 123 | person'
  );
  assert.equal(
    buildCompletedOnboardingThreadName('✅ Onboarding | 123 | person'),
    '✅ Onboarding | 123 | person'
  );
});

test('buildNoRegistrationRecordContainer includes submitted email and retry action', () => {
  const containerJson = buildNoRegistrationRecordContainer(
    'person@example.com',
    'https://discord.com/channels/guild123/thread456'
  ).toJSON();
  const textContent = containerJson.components
    .filter((component) => component.type === 10)
    .map((component) => component.content)
    .join('\n');

  assert.match(textContent, /## 🔍 No registration record found/);
  assert.match(textContent, /\*\*person@example\.com\*\*/);
  assert.match(textContent, /select \*\*Verify\*\* again/i);
});

test('buildDiscordAlreadyLinkedContainer explains linked Discord ID response', () => {
  const containerJson = buildDiscordAlreadyLinkedContainer(
    'person@example.com',
    'https://discord.com/channels/guild123/thread456'
  ).toJSON();
  const textContent = containerJson.components
    .filter((component) => component.type === 10)
    .map((component) => component.content)
    .join('\n');

  assert.match(textContent, /## ⚠️ Discord account already linked/);
  assert.match(textContent, /\*\*person@example\.com\*\*/);
  assert.match(textContent, /skipped linking it again/i);
});

test('isDiscordAlreadyLinkedResponse detects API conflict response', () => {
  assert.equal(
    isDiscordAlreadyLinkedResponse({
      success: false,
      error: 'Discord ID is already linked to another user',
    }),
    true
  );
  assert.equal(isDiscordAlreadyLinkedResponse({ success: false, error: 'Other error' }), false);
  assert.equal(isDiscordAlreadyLinkedResponse({ success: true }), false);
});

test('getUserRolesFromLookup returns only roles with discord_role_id', () => {
  const roles = getUserRolesFromLookup({
    success: true,
    data: {
      user: {
        roles: [
          { id: 'role-1', discord_role_id: '111' },
          { id: 'role-2', discord_role_id: null },
          { id: 'role-3' },
          { id: 'role-4', discord_role_id: '444' },
        ],
      },
    },
  });

  assert.deepEqual(
    roles.map((role) => role.discord_role_id),
    ['111', '444']
  );
});

test('getUserDiscordIdFromLookup returns linked Discord ID', () => {
  assert.equal(
    getUserDiscordIdFromLookup({
      success: true,
      data: {
        user: {
          discord_user_id: '1234567890',
        },
      },
    }),
    '1234567890'
  );
  assert.equal(
    getUserDiscordIdFromLookup({
      success: true,
      data: {
        user: {
          discord_id: '0987654321',
        },
      },
    }),
    '0987654321'
  );
  assert.equal(getUserDiscordIdFromLookup({ success: true, data: { user: {} } }), null);
});

test('syncApprovedDiscordRoles skips missing roles and adds valid roles', async () => {
  const added = [];
  const existingRoleIds = new Set();
  const availableRoles = new Map([['111', { id: '111' }]]);
  const member = {
    guild: {
      roles: {
        fetch: async (roleId) => availableRoles.get(roleId) || null,
      },
    },
    roles: {
      cache: {
        has: (roleId) => existingRoleIds.has(roleId),
      },
      add: async (role) => {
        added.push(role.id);
        existingRoleIds.add(role.id);
      },
    },
  };

  const result = await syncApprovedDiscordRoles(member, [
    { discord_role_id: '111' },
    { discord_role_id: '222' },
  ]);

  assert.deepEqual(added, ['111']);
  assert.deepEqual(result.addedRoleIds, ['111']);
  assert.deepEqual(result.skippedRoleIds, ['222']);
});

test('buildOnboardingRoleRemovalJobOptions schedules a 24 hour delayed unique job', () => {
  assert.deepEqual(buildOnboardingRoleRemovalJobOptions('guild123', 'user456'), {
    delay: ONBOARDING_ROLE_REMOVAL_DELAY_MS,
    jobId: 'remove-onboarding-role:guild123:user456',
  });
  assert.equal(ONBOARDING_ROLE_REMOVAL_DELAY_MS, 24 * 60 * 60 * 1000);
});
