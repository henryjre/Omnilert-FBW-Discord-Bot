const {
  MessageFlags,
  ModalBuilder,
  TextDisplayBuilder,
  LabelBuilder,
  TextInputBuilder,
  TextInputStyle,
  FileUploadBuilder,
} = require('discord.js');

const onboardingRole = '1451964458791604244';

const managementRole = '1314413671245676685';
const temporaryRole = '1449677551365521419';
const serviceCrewRole = '1314413960274907238';

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

    const notValidRoles = [managementRole, temporaryRole, serviceCrewRole];

    if (interaction.member.roles.cache.some((role) => notValidRoles.includes(role.id))) {
      return await interaction.reply({
        content: `You cannot use this menu.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (interaction.member.roles.cache.has(onboardingRole)) {
      return await interaction.reply({
        content: `You already have a pending request. Please wait for the request to be confirmed.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const selectedRole = interaction.values[0];

    const textDisplay = new TextDisplayBuilder().setContent(
      `## Confirm your selection.\nThis will request the **HR Department** to grant you the <@&${selectedRole}> role. If this is correct, please submit your confirmation.`
    );

    const nameInput = new TextInputBuilder()
      .setCustomId(`nameInput`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const nameInputLabel = new LabelBuilder()
      .setLabel(`Name`)
      .setDescription(`Enter your first and last name.`)
      .setTextInputComponent(nameInput);

    const emailInput = new TextInputBuilder()
      .setCustomId(`emailInput`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const emailInputLabel = new LabelBuilder()
      .setLabel(`Email`)
      .setDescription(`Enter your valid email address.`)
      .setTextInputComponent(emailInput);

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
      .addLabelComponents(nameInputLabel)
      .addLabelComponents(emailInputLabel)
      .addLabelComponents(fileUploadLabel)
      .addLabelComponents(confirmationLabel);

    await interaction.showModal(modal);
  },
};
