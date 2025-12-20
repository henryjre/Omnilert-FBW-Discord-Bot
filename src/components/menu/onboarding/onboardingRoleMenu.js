const {
  MessageFlags,
  ModalBuilder,
  TextDisplayBuilder,
  LabelBuilder,
  TextInputBuilder,
  TextInputStyle,
  FileUploadBuilder,
} = require('discord.js');

module.exports = {
  data: {
    name: `onboardingRoleMenu`,
  },
  async execute(interaction, client) {
    const channelName = interaction.message.channel.name;
    const userChannelName = channelName.split('-')[1];
    const username = interaction.user.username;

    if (userChannelName.trim().toLowerCase() !== username.trim().toLowerCase()) {
      return await interaction.reply({
        content: `You cannot use this menu.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // const hasAnyRole = interaction.member && interaction.member.roles.cache.size > 1;

    // if (hasAnyRole) {
    //   return await interaction.reply({
    //     content: `You cannot use this menu.`,
    //     flags: MessageFlags.Ephemeral,
    //   });
    // }

    if (channelName.startsWith('⏳')) {
      return await interaction.reply({
        content: `You already have a pending request. Please wait for the request to be confirmed.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const selectedRole = interaction.values[0];

    const textDisplay = new TextDisplayBuilder().setContent(
      `## Confirm your selection.\nThis will request the **HR Department** to grant you the <@&${selectedRole}> role. If this is correct, please submit your confirmation.`
    );

    const fileUpload = new FileUploadBuilder()
      .setCustomId(`fileUpload`)
      .setMaxValues(1)
      .setRequired(true);

    const fileUploadLabel = new LabelBuilder()
      .setLabel(`Upload your 1x1 formal picture.`)
      .setDescription('Make sure that the image is clear and in a square format.')
      .setFileUploadComponent(fileUpload);

    const textInput = new TextInputBuilder()
      .setCustomId(`confirmationRoleInput`)
      .setStyle(TextInputStyle.Short)
      .setValue(`${selectedRole}`)
      .setRequired(true);

    const confirmationLabel = new LabelBuilder()
      .setLabel(`DO NOT CHANGE THIS`)
      .setTextInputComponent(textInput);

    const modal = new ModalBuilder()
      .setCustomId(`onboardingConfirmationModal`)
      .setTitle(`CONFIRMATION`)
      .addTextDisplayComponents(textDisplay)
      .addLabelComponents(fileUploadLabel)
      .addLabelComponents(confirmationLabel);

    await interaction.showModal(modal);
  },
};
