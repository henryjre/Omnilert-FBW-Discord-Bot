const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("report")
    .setDescription("Report something..")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("case")
        .setDescription("Create a case management report.")
    ),

  async execute(interaction, client) {
    const permissionRole = "1314413671245676685";
    const subcommand = interaction.options.getSubcommand();

    let channel;
    if (subcommand === "case") {
      if (!interaction.member.roles.cache.has(permissionRole)) {
        await interaction.reply({
          content: `🔴 ERROR: This command can only be used by <@&${permissionRole}>.`,
          ephemeral: true,
        });
        return;
      }
      channel = "1342895351631187970";

      const modal = buildCaseReportModal(channel);
      await interaction.showModal(modal);
    }
  },
};

function buildCaseReportModal(channel) {
  const modal = new ModalBuilder();

  modal.setCustomId("createCaseReportModal").setTitle(`CASE MANAGEMENT REPORT`);

  const firstInput = new TextInputBuilder()
    .setCustomId(`titleInput`)
    .setLabel(`Case Title`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("A short, clear name for the issue.")
    .setMaxLength(100)
    .setRequired(true);

  const secondInput = new TextInputBuilder()
    .setCustomId(`problemInput`)
    .setLabel(`Problem Description`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(500)
    .setPlaceholder("Describe the problem in a detailed explanation.")
    .setRequired(true);

  const fourthInput = new TextInputBuilder()
    .setCustomId(`channelInput`)
    .setLabel(`Channel (DO NOT CHANGE)`)
    .setStyle(TextInputStyle.Short)
    .setValue(channel)
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
  const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
  const fourthActionRow = new ActionRowBuilder().addComponents(fourthInput);

  modal.addComponents(firstActionRow, secondActionRow, fourthActionRow);

  return modal;
}
