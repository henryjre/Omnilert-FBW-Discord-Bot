const {
  MessageFlags,
  ButtonStyle,
  ButtonBuilder,
  ContainerBuilder,
  SeparatorSpacingSize,
  ChannelType,
} = require('discord.js');

const hrRole = '1314815153421680640';
const techRole = '1314815091908022373';

const managementRole = '1314413671245676685';
const temporaryRole = '1449677551365521419';
const serviceCrewRole = '1314413960274907238';

module.exports = {
  data: {
    name: `newToDiscordButton`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const notValidRoles = [managementRole, temporaryRole, serviceCrewRole];

    if (interaction.member.roles.cache.some((role) => notValidRoles.includes(role.id))) {
      return await interaction.reply({
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
          `||${interaction.user.toString()} <@&${techRole}> <@&${hrRole}>||\n### For our employees who are new to Discord, below are the guides that you may need to familiarize yourself with the Discord application.`
        )
      )
      .addSeparatorComponents((separator) =>
        separator.setDivider(false).setSpacing(SeparatorSpacingSize.Large)
      )
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`## 📺 Basic Discord Video Guide`)
      )
      .addSeparatorComponents((separator) => separator.setDivider(true))
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `A 20-minute video guide for people who are new to Discord. This video contains the important things you need to know.`
            )
          )
          .setButtonAccessory((button) =>
            button
              .setLabel('Watch Video')
              .setStyle(ButtonStyle.Link)
              .setURL(
                'https://drive.google.com/file/d/1-2iHw95g-cwEPWPUq54N_Kq1CtCzMgU-/view?usp=sharing'
              )
          )
      )
      .addSeparatorComponents((separator) =>
        separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`## 📖 Discord Guide Documentation`)
      )
      .addSeparatorComponents((separator) => separator.setDivider(true))
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              `This is a written documentation that has the things you need to know to familiarize with the Discord application.`
            )
          )
          .setButtonAccessory((button) =>
            button
              .setLabel('View Documentation')
              .setStyle(ButtonStyle.Link)
              .setURL(
                'https://docs.google.com/document/d/18uEPbgeWJjPXr91wOkMyFGQqOlJBA0PxgJ8UdQTNAg4/edit?usp=sharing'
              )
          )
      )
      .addSeparatorComponents((separator) =>
        separator.setDivider(false).setSpacing(SeparatorSpacingSize.Large)
      )
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId('acknowledgeOnboardingButton')
            .setLabel('All done!')
            .setEmoji({ name: '✅' })
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('requestHelpButton')
            .setLabel('Need help?')
            .setEmoji({ name: '❓' })
            .setStyle(ButtonStyle.Secondary)
        )
      );

    await privateThread.send({
      components: [onboardingContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
