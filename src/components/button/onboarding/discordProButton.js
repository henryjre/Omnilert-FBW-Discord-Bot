const {
  MessageFlags,
  ButtonStyle,
  ContainerBuilder,
  ChannelType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

const hrRole = '1314815153421680640';
const techRole = '1314815091908022373';

module.exports = {
  data: {
    name: `discordProButton`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const hasAnyRole = interaction.member && interaction.member.roles.cache.size > 1;

    if (!hasAnyRole) {
      return await interaction.followUp({
        content: `You cannot use this button.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const hasChannel = await interaction.channel.threads.cache.find((thread) =>
      thread.name.includes(`Onboarding - ${interaction.user.username}`)
    );

    if (hasChannel) {
      return await interaction.followUp({
        content: `You are already in the onboarding process. please go to ${hasChannel.toString()} to continue.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const privateThread = await interaction.channel.threads.create({
      name: `Onboarding - ${interaction.user.username}`,
      autoArchiveDuration: 1440,
      type: ChannelType.PrivateThread,
    });

    const onboardingContainer = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `||${interaction.user.toString()} <@&${techRole}>||\n# Select employee role.`
        )
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`Please select your employee type in the dropdown below.`)
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId('requestHelpButton')
              .setLabel('Need help?')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji({ name: '❓' })
          )
      )
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new StringSelectMenuBuilder()
            .setCustomId('onboardingRoleMenu')
            .setPlaceholder('Select here.')
            .setOptions([
              new StringSelectMenuOptionBuilder()
                .setLabel('Management')
                .setDescription('Join the Omnilert management team.')
                .setValue('1314413671245676685'),
              new StringSelectMenuOptionBuilder()
                .setLabel('Service Crew')
                .setDescription('Join as a service crew.')
                .setValue('1314413960274907238'),
              new StringSelectMenuOptionBuilder()
                .setLabel('Others')
                .setDescription('Select this if you are not part of the Omnilert organization.')
                .setValue('1449677551365521419'), //Temporary role
            ])
        )
      );

    await privateThread.send({
      components: [onboardingContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
