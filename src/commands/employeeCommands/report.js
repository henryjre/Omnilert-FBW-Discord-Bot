const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");

const commandsChannel = "1372559141071228998";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("report")
    .setDescription("Report something..")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("case")
        .setDescription("Create a case management report.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("incident")
        .setDescription("Create an asset incident report.")
    ),

  async execute(interaction, client) {
    const permissionRole = "1314413671245676685";
    const subcommand = interaction.options.getSubcommand();

    // let channel;
    if (subcommand === "case") {
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
    } else if (subcommand === "incident") {
      if (interaction.channel.id !== commandsChannel) {
        return await interaction.reply({
          content:
            "This command can only be used in the <#1372559141071228998> channel.",
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

  modal.setCustomId("createCaseReportModal").setTitle(`CASE MANAGEMENT REPORT`);

  const firstInput = new TextInputBuilder()
    .setCustomId(`titleInput`)
    .setLabel(`Case Title (Exclude Case Number)`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("A short, clear name for the issue.")
    .setMaxLength(100)
    .setRequired(true);

  const secondInput = new TextInputBuilder()
    .setCustomId(`problemInput`)
    .setLabel(`Problem Description`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setPlaceholder("Describe the problem in a detailed explanation.")
    .setRequired(true);

  // const fourthInput = new TextInputBuilder()
  //   .setCustomId(`channelInput`)
  //   .setLabel(`Channel (DO NOT CHANGE)`)
  //   .setStyle(TextInputStyle.Short)
  //   .setValue(channel)
  //   .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
  const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
  // const fourthActionRow = new ActionRowBuilder().addComponents(fourthInput);

  modal.addComponents(firstActionRow, secondActionRow);

  return modal;
}

function buildIncidentReportModal() {
  const modal = new ModalBuilder();

  modal
    .setCustomId("createIncidentReportModal")
    .setTitle(`ASSET INCIDENT REPORT`);

  const firstInput = new TextInputBuilder()
    .setCustomId(`dateInput`)
    .setLabel(`📆 Date Reported`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Enter the date this incident was reported.")
    .setMaxLength(100)
    .setRequired(true);

  const secondInput = new TextInputBuilder()
    .setCustomId(`branchInput`)
    .setLabel(`🛒 Branch`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setPlaceholder("Enter the store branch for this incident.")
    .setRequired(true);

  const thirdInput = new TextInputBuilder()
    .setCustomId(`assetInput`)
    .setLabel(`📦 Damaged/Lost Asset`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setPlaceholder("Provide the damaged/lost item.")
    .setRequired(true);

  const fourthInput = new TextInputBuilder()
    .setCustomId(`detailsInput`)
    .setLabel(`📝 Incident Details`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setPlaceholder(
      "Brieflly describe the incident and include other relevant details."
    )
    .setRequired(true);

  const fifthInput = new TextInputBuilder()
    .setCustomId(`maintenanceRequestInput`)
    .setLabel(`🛠️ Maintenance Request (if applicable)`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setPlaceholder(
      "Provide the needed maintenance request on the asset if applicable."
    )
    .setRequired(false);

  const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
  const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);
  const fourthActionRow = new ActionRowBuilder().addComponents(fourthInput);
  const fifthActionRow = new ActionRowBuilder().addComponents(fifthInput);

  modal.addComponents(
    firstActionRow,
    secondActionRow,
    thirdActionRow,
    fourthActionRow,
    fifthActionRow
  );

  return modal;
}
