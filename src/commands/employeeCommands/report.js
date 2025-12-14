const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  LabelBuilder,
} = require('discord.js');

const commandsChannel = '1372559141071228998';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report something..')
    .addSubcommand((subcommand) =>
      subcommand.setName('case').setDescription('Create a case management report.')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('incident').setDescription('Create an asset incident report.')
    ),

  async execute(interaction, client) {
    const permissionRole = '1314413671245676685';
    const subcommand = interaction.options.getSubcommand();

    // Check if the command was invoked in a thread
    if (interaction.channel.isThread()) {
      return await interaction.reply({
        content: `🔴 ERROR: This command cannot be used in a thread channel.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // let channel;
    if (subcommand === 'case') {
      if (!interaction.member.roles.cache.has(permissionRole)) {
        await interaction.reply({
          content: `🔴 ERROR: This command can only be used by <@&${permissionRole}>.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      // channel = "1342895351631187970";

      const modal = buildCaseReportModal();
      await interaction.showModal(modal);
    } else if (subcommand === 'incident') {
      if (interaction.channel.id !== commandsChannel) {
        return await interaction.reply({
          content: 'This command can only be used in the <#1372559141071228998> channel.',
          flags: MessageFlags.Ephemeral,
        });
      }
      if (interaction.channel.isThread()) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this command on a thread.`,
          flags: MessageFlags.Ephemeral,
        });
      }
      const modal = buildIncidentReportModal();
      await interaction.showModal(modal);
    }
  },
};

function buildCaseReportModal() {
  const modal = new ModalBuilder();

  modal.setCustomId('createCaseReportModal').setTitle(`CASE MANAGEMENT REPORT`);

  const firstInput = new TextInputBuilder()
    .setCustomId(`titleInput`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const firstLabel = new LabelBuilder()
    .setLabel('Case Title (Exclude Case Number)')
    .setDescription('A short, clear name for the issue.')
    .setTextInputComponent(firstInput);

  const secondInput = new TextInputBuilder()
    .setCustomId(`problemInput`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  const secondLabel = new LabelBuilder()
    .setLabel('Problem Description')
    .setDescription('Describe the problem in a detailed explanation.')
    .setTextInputComponent(secondInput);

  // const fourthInput = new TextInputBuilder()
  //   .setCustomId(`channelInput`)
  //   .setLabel(`Channel (DO NOT CHANGE)`)
  //   .setStyle(TextInputStyle.Short)
  //   .setValue(channel)
  //   .setRequired(true);

  modal.addLabelComponents(firstLabel, secondLabel);
  // const fourthActionRow = new ActionRowBuilder().addComponents(fourthInput);

  return modal;
}

function buildIncidentReportModal() {
  const modal = new ModalBuilder();

  modal.setCustomId('createIncidentReportModal').setTitle(`ASSET INCIDENT REPORT`);

  const firstInput = new TextInputBuilder()
    .setCustomId(`dateInput`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const firstLabel = new LabelBuilder()
    .setLabel('Date Reported')
    .setDescription('Enter the date this incident was reported.')
    .setTextInputComponent(firstInput);

  const secondInput = new TextInputBuilder()
    .setCustomId(`branchInput`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const secondLabel = new LabelBuilder()
    .setLabel('Branch')
    .setDescription('Enter the store branch for this incident.')
    .setTextInputComponent(secondInput);

  const thirdInput = new TextInputBuilder()
    .setCustomId(`assetInput`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  const thirdLabel = new LabelBuilder()
    .setLabel('Damaged/Lost Asset')
    .setDescription('Provide the damaged/lost item.')
    .setTextInputComponent(thirdInput);

  const fourthInput = new TextInputBuilder()
    .setCustomId(`detailsInput`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  const fourthLabel = new LabelBuilder()
    .setLabel('Incident Details')
    .setDescription('Briefly describe the incident and include other relevant details.')
    .setTextInputComponent(fourthInput);

  const fifthInput = new TextInputBuilder()
    .setCustomId(`maintenanceRequestInput`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(false);

  const fifthLabel = new LabelBuilder()
    .setLabel('Maintenance Request (if applicable)')
    .setDescription('Provide the needed maintenance request on the asset if applicable.')
    .setTextInputComponent(fifthInput);

  modal.addLabelComponents(firstLabel, secondLabel, thirdLabel, fourthLabel, fifthLabel);

  return modal;
}
