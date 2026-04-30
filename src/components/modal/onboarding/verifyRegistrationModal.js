const { MessageFlags } = require('discord.js');
const {
  getRegistrationStatus,
  linkApprovedUserDiscordId,
  linkRegistrationRequestDiscordId,
  lookupApprovedUser,
} = require('../../../functions/helpers/onboardingApi');
const {
  buildApprovedContainer,
  buildDiscordThreadUrl,
  buildNoRegistrationRecordContainer,
  buildPendingContainer,
  buildRetryVerificationContainer,
  getUserRolesFromLookup,
  normalizeRegistrationStatus,
  syncApprovedDiscordRoles,
} = require('../../../functions/helpers/onboardingUtils');
const { scheduleOnboardingRoleRemoval } = require('../../../queue/onboardingRoleRemovalQueue');

module.exports = {
  data: {
    name: 'verifyRegistrationModal',
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const email = interaction.fields.getTextInputValue('emailInput').trim().toLowerCase();
    const threadUrl = buildDiscordThreadUrl(interaction.guild.id, interaction.channel.id);

    try {
      if (interaction.message?.deletable) {
        try {
          await interaction.message.delete();
        } catch (error) {
          console.error('Failed to delete verification prompt:', error.message);
        }
      }

      const statusResponse = await getRegistrationStatus(email);
      const status = normalizeRegistrationStatus(statusResponse);

      if (status === 'pending') {
        const linkResponse = await linkRegistrationRequestDiscordId(email, interaction.user.id);
        if (!linkResponse?.success) {
          throw new Error('Registration request Discord ID link failed');
        }

        return await interaction.channel.send({
          components: [buildPendingContainer()],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      if (status === 'approved') {
        const linkResponse = await linkApprovedUserDiscordId(email, interaction.user.id);
        if (!linkResponse?.success) {
          throw new Error('Approved user Discord ID link failed');
        }

        await interaction.channel.send({
          components: [buildApprovedContainer()],
          flags: MessageFlags.IsComponentsV2,
        });

        const lookupResponse = await lookupApprovedUser(email);
        await syncApprovedDiscordRoles(interaction.member, getUserRolesFromLookup(lookupResponse));
        await scheduleOnboardingRoleRemoval(interaction.guild.id, interaction.user.id);
        return;
      }

      if (status === 'not_found') {
        return await interaction.channel.send({
          components: [buildNoRegistrationRecordContainer(email, threadUrl)],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      return await interaction.channel.send({
        components: [buildRetryVerificationContainer(threadUrl)],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error('Onboarding registration verification failed:', error.response?.data || error.message);

      return await interaction.followUp({
        content:
          '🔴 ERROR: We could not verify your website registration right now. Please try again in a few minutes or select Need help.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
