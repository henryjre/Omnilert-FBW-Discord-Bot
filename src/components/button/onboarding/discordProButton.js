const {
  MessageFlags,
  ChannelType,
} = require('discord.js');
const {
  BLOCKED_ONBOARDING_ROLE_IDS,
  addOnboardingRole,
  buildDiscordThreadUrl,
  buildOnboardingThreadName,
  sendVerificationPrompt,
} = require('../../../functions/helpers/onboardingUtils');

module.exports = {
  data: {
    name: `discordProButton`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    if (interaction.member.roles.cache.some((role) => BLOCKED_ONBOARDING_ROLE_IDS.includes(role.id))) {
      return await interaction.followUp({
        content: `You cannot use this button.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const hasChannel = await interaction.channel.threads.cache.find((thread) =>
      thread.name.includes(`Onboarding | ${interaction.user.id} |`)
    );

    if (hasChannel) {
      return await interaction.followUp({
        content: `You are already in the onboarding process. please go to ${hasChannel.toString()} to continue.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const privateThread = await interaction.channel.threads.create({
      name: buildOnboardingThreadName(interaction.user),
      autoArchiveDuration: 1440,
      type: ChannelType.PrivateThread,
    });

    await privateThread.members.add(interaction.user.id);
    await addOnboardingRole(interaction.member);
    await sendVerificationPrompt(
      privateThread,
      buildDiscordThreadUrl(interaction.guild.id, privateThread.id)
    );

    return await interaction.followUp({
      content: `Your onboarding thread is ready: ${privateThread.toString()}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
