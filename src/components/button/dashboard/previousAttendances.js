const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const { getAttendanceRecords } = require('../../../sqliteFunctions.js');
const { makeEmbedTable } = require('../../../functions/code/repeatFunctions.js');

module.exports = {
  data: {
    name: `previousAttendances`,
  },
  async execute(interaction, client) {
    const replyEmbed = new EmbedBuilder();

    const allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const slashInteraction = interaction.message.interaction;
    if (slashInteraction) {
      const slashUser = slashInteraction.user;
      if (!slashUser.id.includes(interaction.user.id)) {
        replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');
        return await interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral });
      }
    }

    // const preloadEmbed = new EmbedBuilder()
    //   .setTitle('📊Employee Dashboard')
    //   .setDescription('## 📈 AUDIT RATINGS\n\u200b\n*Retrieving next page... Please wait.*')
    //   .setColor('Orange');

    // await interaction.message.edit({ embeds: [preloadEmbed], components: [] });

    await interaction.deferUpdate();

    const attendanceRecords = await getAttendanceRecords(interaction.user.id);
    if (!attendanceRecords) {
      replyEmbed.setDescription(`🔴 ERROR: No attendance records found.`).setColor('Red');
      return await interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral });
    }

    const pageFooter = messageEmbed.data.footer.text.split('|')[0];
    const pageNumber = parseInt(pageFooter.match(/Page (\d+) of/)[1]) - 1;

    const headers = ['Date', 'Check In', 'Check Out', 'Hours Worked'];
    const rows = buildRowsFromOdoo(attendanceRecords);
    const { pageRows, page, totalPages, total, start, end } = paginateRows(rows, pageNumber, 5);
    const tableStr = makeEmbedTable(headers, pageRows, 60);

    const attendancesEmbed = EmbedBuilder.from(messageEmbed)
      .setDescription(`## 📈 ATTENDANCES\n\u200b\n${tableStr}`)
      .setFooter({
        text: `Page ${page} of ${totalPages} | Showing ${start + 1} - ${end} of ${total} entries`,
      });

    const nextButton = new ButtonBuilder()
      .setCustomId('nextAttendances')
      .setLabel('Next Page')
      .setDisabled(page === totalPages)
      .setEmoji('➡️')
      .setStyle(page === totalPages ? ButtonStyle.Secondary : ButtonStyle.Primary);

    const blankButton1 = new ButtonBuilder()
      .setCustomId('blankButton1')
      .setLabel('\u200b\u200b')
      .setDisabled(true)
      .setStyle(ButtonStyle.Secondary);

    const blankButton2 = new ButtonBuilder()
      .setCustomId('blankButton2')
      .setLabel('\u200b\u200b')
      .setDisabled(true)
      .setStyle(ButtonStyle.Secondary);

    const previousButton = new ButtonBuilder()
      .setCustomId('previousAttendances')
      .setLabel('Prev Page')
      .setDisabled(page === 1)
      .setEmoji('⬅️')
      .setStyle(page === 1 ? ButtonStyle.Secondary : ButtonStyle.Primary);

    const paginationButtonRow = new ActionRowBuilder().addComponents(
      previousButton,
      blankButton1,
      blankButton2,
      nextButton
    );

    const salaryComputationButton = new ButtonBuilder()
      .setCustomId('salaryComputationDashboard')
      .setLabel('Back To Payslip Details')
      .setEmoji('💵')
      .setStyle(ButtonStyle.Success);

    const backButton = new ButtonBuilder()
      .setCustomId('backToDashboard')
      .setLabel('Back To Dashboard')
      .setEmoji('↩️')
      .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(backButton, salaryComputationButton);

    await interaction.message.edit({
      embeds: [attendancesEmbed],
      components: [paginationButtonRow, buttonRow],
    });
  },
};

function buildRowsFromOdoo(data) {
  return data.map((e) => {
    return [e.attendance_date, e.check_in_time, e.check_out_time, e.worked_hours_text];
  });
}

function paginateRows(rows, page = 1, pageSize = 5) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(Math.max(page, 1), totalPages);
  const start = (cur - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  return { pageRows, page: cur, totalPages, total, start, end: start + pageRows.length };
}
