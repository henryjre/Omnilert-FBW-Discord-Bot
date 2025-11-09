const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const moment = require('moment-timezone');

const { getAttendanceByEmployee } = require('../../../odooRpc.js');
const { makeEmbedTable } = require('../../../functions/code/repeatFunctions.js');
const { saveAttendanceRecords } = require('../../../sqliteFunctions.js');
const departments = require('../../../config/departments.json');

module.exports = {
  data: {
    name: `viewAttendances`,
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

    const preloadEmbed = new EmbedBuilder()
      .setTitle('📊Employee Dashboard')
      .setDescription('*Retrieving attendance records... Please wait.*')
      .setColor('Orange');

    await interaction.message.edit({ embeds: [preloadEmbed], components: [] });

    await interaction.deferUpdate();

    const branchField = messageEmbed.data.fields.find((f) => f.name === 'Branch');
    const branch = branchField.value;
    const department = departments.find((d) => d.name === branch);

    if (!department) {
      replyEmbed.setDescription(`🔴 ERROR: No department found.`).setColor('Red');
      await interaction.followUp({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral });
      await interaction.message.edit({
        embeds: interaction.message.embeds,
        components: interaction.message.components,
      });
      return;
    }

    const dateRangeField = messageEmbed.data.fields.find((f) => f.name === 'Period');
    const dateRangeStr = dateRangeField.value;
    const dateRange = getDateRange(dateRangeStr);

    const employeeDataFetch = await getAttendanceByEmployee(
      interaction.user.id,
      department.id,
      dateRange.dateStart,
      dateRange.dateEnd
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

    if (!employeeDataFetch) {
      const noAttendancesEmbed = EmbedBuilder.from(messageEmbed).setDescription(
        `## 📈 ATTENDANCES\n\u200b\n*No attendances found... 🕸️* `
      );

      return await interaction.message.edit({
        embeds: [noAttendancesEmbed],
        components: [buttonRow],
      });
    }

    const parsedAttendanceRecords = parseAttendanceRecords(employeeDataFetch);

    saveAttendanceRecords(interaction.user.id, parsedAttendanceRecords);

    const headers = ['Date', 'Check In', 'Check Out', 'Hours Worked'];
    const rows = buildRowsFromOdoo(parsedAttendanceRecords);
    const { pageRows, page, totalPages, total, start, end } = paginateRows(rows, 1, 5);
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

function getDateRange(dateRangeStr) {
  // Expects dateRangeStr like: "Nov 01, 2025 - Nov 09, 2025"
  if (!dateRangeStr) throw new Error('No date range string provided');
  const [startStr, endStr] = dateRangeStr.split(' - ').map((s) => s.trim());
  if (!startStr || !endStr) throw new Error('Invalid date range string format');

  // Parse using moment-timezone as Manila time
  const start = moment.tz(`${startStr} 12:00 AM`, 'MMM DD, YYYY hh:mm A', 'Asia/Manila');
  const end = moment.tz(`${endStr} 11:59 PM`, 'MMM DD, YYYY hh:mm A', 'Asia/Manila');

  if (!start.isValid() || !end.isValid()) throw new Error('Invalid date string(s)');

  // To UTC ISO string (without timezone)
  const dateStartUtc = start.utc().format('YYYY-MM-DD HH:mm:ss');
  const dateEndUtc = end.utc().format('YYYY-MM-DD HH:mm:ss');

  return {
    dateStart: dateStartUtc,
    dateEnd: dateEndUtc,
  };
}

function parseAttendanceRecords(records, tz = 'Asia/Manila') {
  return records.map((r) => {
    const checkInLocal = moment.utc(r.check_in).tz(tz);
    const checkOutLocal = moment.utc(r.check_out).tz(tz);

    // Determine if checkout is the next day (in local time)
    const isNextDay = checkOutLocal.isAfter(checkInLocal, 'day');

    // Convert worked_hours (e.g. 1.75) → "1 hr 45 min"
    const totalMinutes = Math.round((r.worked_hours || 0) * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const workedHoursText =
      hrs > 0 && mins > 0 ? `${hrs} hr ${mins} min` : hrs > 0 ? `${hrs} hr` : `${mins} min`;

    return {
      ...r,
      check_in_time: checkInLocal.format('h:mm A'),
      check_out_time: checkOutLocal.format('h:mm A') + (isNextDay ? ' (ND)' : ''),
      attendance_date: checkInLocal.format('MMM DD'),
      worked_hours_text: workedHoursText,
    };
  });
}
