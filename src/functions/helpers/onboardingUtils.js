const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
} = require('discord.js');

const ONBOARDING_ROLE_ID = '1451964458791604244';
const HR_ROLE_ID = '1314815153421680640';
const TECH_ROLE_ID = '1314815091908022373';
const ONBOARDING_ROLE_REMOVAL_DELAY_MS = 24 * 60 * 60 * 1000;
const REGISTRATION_URL = 'https://omnilert.app/register';
const OMNILERT_API_BASE_URL = 'https://yevette-hydrotropic-pseudoeconomically.ngrok-free.dev/api/v1/integrations/discord';

const BLOCKED_ONBOARDING_ROLE_IDS = [
  '1314413671245676685',
  '1449677551365521419',
  '1314413960274907238',
];

function buildOnboardingThreadName(user) {
  return `Onboarding | ${user.id} | ${user.username}`;
}

function buildDiscordThreadUrl(guildId, threadId) {
  return `https://discord.com/channels/${guildId}/${threadId}`;
}

function buildRegisterUrl(threadUrl) {
  const url = new URL(REGISTRATION_URL);
  url.searchParams.set('source', threadUrl);
  return url.toString();
}

function buildOnboardingRoleRemovalJobOptions(guildId, userId) {
  return {
    delay: ONBOARDING_ROLE_REMOVAL_DELAY_MS,
    jobId: `remove-onboarding-role:${guildId}:${userId}`,
  };
}

function normalizeRegistrationStatus(responseBody) {
  const registration = responseBody?.data?.registration;

  if (!registration?.exists) return 'not_found';
  if (registration.status === 'pending') return 'pending';
  if (registration.status === 'approved') return 'approved';
  return 'unavailable';
}

function getUserRolesFromLookup(responseBody) {
  const roles = responseBody?.data?.user?.roles;
  if (!Array.isArray(roles)) return [];
  return roles.filter((role) => role?.discord_role_id);
}

function buildVerificationContainer(threadUrl, options = {}) {
  const registerUrl = buildRegisterUrl(threadUrl);
  const title = options.title || '🔎 Verify website registration';
  const intro =
    options.message ||
    'Have you completed your Omnilert website registration? If you have not registered yet, select **Register** and complete the onboarding form on the website. Once finished, return to this thread and select **Verify**.';

  return new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`## ${title}\n${intro}`)
    )
    .addSeparatorComponents((separator) =>
      separator.setDivider(false).setSpacing(SeparatorSpacingSize.Large)
    )
    .addActionRowComponents((actionRow) =>
      actionRow.setComponents(
        new ButtonBuilder()
          .setCustomId('verifyRegistrationButton')
          .setLabel('Verify')
          .setEmoji({ name: '✅' })
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setLabel('Register')
          .setEmoji({ name: '📝' })
          .setStyle(ButtonStyle.Link)
          .setURL(registerUrl),
        new ButtonBuilder()
          .setCustomId('requestHelpButton')
          .setLabel('Need help?')
          .setEmoji({ name: '❓' })
          .setStyle(ButtonStyle.Secondary)
      )
    );
}

function buildPendingContainer() {
  return new ContainerBuilder()
    .setAccentColor(0xf1c40f)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `## Registration verified\nYour website registration has been verified and is currently pending HR approval. Please wait for <@${HR_ROLE_ID}> to complete the review. While waiting, prepare your bank information and employment requirements.`
      )
    );
}

function buildApprovedContainer() {
  return new ContainerBuilder()
    .setAccentColor(0x2ecc71)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent('## 🎉 Registration approved\nYour registration has been approved. Welcome to Omnilert!')
    )
    .addSeparatorComponents((separator) => separator)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '**Next steps**',
          '1. View your POS PIN in `My Account > My Profile`.',
          '2. Submit your bank details in `My Account > My Profile`.',
          '3. Upload your employment requirements in `My Account > My Profile`.',
          '4. Enable notifications in `My Account > Settings`.',
        ].join('\n')
      )
    );
}

function buildRetryVerificationContainer(threadUrl) {
  return buildVerificationContainer(threadUrl, {
    message:
      'No active website registration is ready for verification yet. Please select **Register** to complete your onboarding form, then return here and select **Verify** again.',
  });
}

function buildNoRegistrationRecordContainer(email, threadUrl) {
  return buildVerificationContainer(threadUrl, {
    title: '🔍 No registration record found',
    message: `There was no registration record found for the email:\n\n**${email}**\n\nIs the email correct? Please select **Verify** again and use the email address you entered during website registration.`,
  });
}

async function sendVerificationPrompt(channel, threadUrl) {
  return channel.send({
    components: [buildVerificationContainer(threadUrl)],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function addOnboardingRole(member) {
  if (!member.roles.cache.has(ONBOARDING_ROLE_ID)) {
    await member.roles.add(ONBOARDING_ROLE_ID);
  }
}

async function syncApprovedDiscordRoles(member, roles) {
  const addedRoleIds = [];
  const skippedRoleIds = [];

  for (const websiteRole of roles) {
    const discordRoleId = websiteRole.discord_role_id;

    try {
      const role = await member.guild.roles.fetch(discordRoleId);
      if (!role) {
        skippedRoleIds.push(discordRoleId);
        console.warn(`Onboarding role sync skipped missing Discord role: ${discordRoleId}`);
        continue;
      }

      if (!member.roles.cache.has(discordRoleId)) {
        await member.roles.add(role);
      }
      addedRoleIds.push(discordRoleId);
    } catch (error) {
      skippedRoleIds.push(discordRoleId);
      console.error(`Onboarding role sync failed for Discord role ${discordRoleId}:`, error.message);
    }
  }

  return { addedRoleIds, skippedRoleIds };
}

const onboardingUtils = {
  BLOCKED_ONBOARDING_ROLE_IDS,
  HR_ROLE_ID,
  ONBOARDING_ROLE_ID,
  ONBOARDING_ROLE_REMOVAL_DELAY_MS,
  OMNILERT_API_BASE_URL,
  TECH_ROLE_ID,
  addOnboardingRole,
  buildApprovedContainer,
  buildDiscordThreadUrl,
  buildOnboardingRoleRemovalJobOptions,
  buildOnboardingThreadName,
  buildNoRegistrationRecordContainer,
  buildPendingContainer,
  buildRegisterUrl,
  buildRetryVerificationContainer,
  buildVerificationContainer,
  getUserRolesFromLookup,
  normalizeRegistrationStatus,
  sendVerificationPrompt,
  syncApprovedDiscordRoles,
};

module.exports = Object.assign(() => onboardingUtils, onboardingUtils);
