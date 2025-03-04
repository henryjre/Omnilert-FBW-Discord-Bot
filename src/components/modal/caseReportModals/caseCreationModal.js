const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

const sqliteDb = require("../../../sqliteConnection.js");
const chalk = require("chalk");

module.exports = {
  data: {
    name: "createCaseReportModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const caseTitle = interaction.fields.getTextInputValue("titleInput");
    const caseProblem = interaction.fields.getTextInputValue("problemInput");
    // const channelInput = interaction.fields.getTextInputValue("channelInput");

    const caseChannel = await client.channels.cache.get("1342895351631187970");

    if (!caseChannel) {
      return await interaction.editReply({
        content:
          "🔴 ERROR: Cannot get the proposal channel. Please try again. Do not change the Channel input when submitting your proposal.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const caseId = getNextId();

    const caseFullTitle = `CASE ${caseId} | ${caseTitle}`;

    const caseMessage = await caseChannel.send({
      content: `# ${caseFullTitle}`,
    });

    const caseThread = await caseMessage.startThread({
      name: `🟢 ${caseFullTitle}`,
      autoArchiveDuration: 1440, // Archive after 60 minutes
    });

    const memberId = interaction.member?.user.id || interaction.user.id;
    // const memberName =
    //   interaction.member?.nickname || interaction.user.globalName;
    const threadId = caseThread.id;

    const managementRole = await interaction.guild.roles.cache.get(
      "1314413671245676685"
    );

    const membersWithRoles = await managementRole.members.map((m) => {
      const name = m.nickname.replace(/^[🔴🟢]\s*/, "") || m.user.username;
      return new StringSelectMenuOptionBuilder().setLabel(name).setValue(name);
    });

    const caseReportEmbed = new EmbedBuilder()
      .setTitle(`📌 ${caseFullTitle}`)
      .addFields([
        {
          name: "Case Leader",
          value: "To be added",
        },
        {
          name: "Case Title",
          value: caseTitle,
        },
        {
          name: "Problem Description",
          value: caseProblem,
        },
        {
          name: "Immediate Corrective Actions",
          value: "To be added",
        },
        {
          name: "Resolution",
          value: "To be added",
        },
      ])
      // .setFooter({
      //   iconURL: interaction.user.displayAvatarURL(),
      //   text: `Reported by: ${memberName}`,
      // })
      .setColor("DarkGreen");

    const editCorrectiveActionButton = new ButtonBuilder()
      .setCustomId("editCorrectiveActionButton")
      .setLabel("Edit Corrective Action")
      .setStyle(ButtonStyle.Primary);
    const editResolutionButton = new ButtonBuilder()
      .setCustomId("editResolutionButton")
      .setLabel("Edit Resolution")
      .setStyle(ButtonStyle.Success);
    const closeCaseButton = new ButtonBuilder()
      .setCustomId("closeCaseButton")
      .setLabel("Close Case")
      .setStyle(ButtonStyle.Danger);

    const userMenu = new StringSelectMenuBuilder()
      .setCustomId("managementUserMenu")
      .setOptions(membersWithRoles)
      .setPlaceholder("Select the case leader.");

    const buttonRow = new ActionRowBuilder().addComponents(
      editCorrectiveActionButton,
      editResolutionButton,
      closeCaseButton
    );
    const menuRow = new ActionRowBuilder().addComponents(userMenu);

    await caseThread.send({
      embeds: [caseReportEmbed],
      components: [buttonRow, menuRow],
    });

    addCaseReport(caseTitle, memberId, threadId);

    const replyEmbed = new EmbedBuilder()
      .setDescription(
        `## Case Report Submitted\nPlease check the <#1342895351631187970> to check your report.`
      )
      .setColor("Green");

    await interaction.editReply({
      embeds: [replyEmbed],
      flags: MessageFlags.Ephemeral,
    });
  },
};

function getNextId() {
  const row = sqliteDb
    .prepare("SELECT id FROM CASE_REPORTS ORDER BY id DESC LIMIT 1")
    .get();
  if (!row) return "0001"; // If no existing data, start at 0001

  const nextId = String(parseInt(row.id) + 1).padStart(4, "0"); // Convert to number, increment, then pad
  return nextId;
}

function addCaseReport(caseTitle, memberId, threadId) {
  const newId = getNextId();
  const insert = sqliteDb.prepare(
    "INSERT INTO CASE_REPORTS (id, case_title, case_leader_id, case_thread_id) VALUES (?, ?, ?, ?)"
  );
  insert.run(newId, caseTitle, memberId, threadId);
  console.log(chalk.green(`🟢 New case report added with ID: #${newId}`));
}
