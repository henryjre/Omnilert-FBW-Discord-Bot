const {
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorSpacingSize,
  SeparatorBuilder,
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

    const slashInteraction = interaction.message.interaction;
    if (slashInteraction) {
      const slashUser = slashInteraction.user;
      if (!slashUser.id.includes(interaction.user.id)) {
        replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');
        return await interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral });
      }
    }

    const components = interaction.message.components;

    const preloadContainer = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('# 📊 Employee Dashboard'))
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('*Retrieving attendance records... Please wait.*')
      );

    await interaction.message.edit({
      components: [preloadContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.deferUpdate();

    const containerComponent = components[0];
    // action row
    const actionRow = containerComponent.components.find((component) => component.type === 1);
    // text display components
    const textDisplayComponents = containerComponent.components.filter(
      (component) => component.type === 10
    );
    const lastTextDisplayComponent =
      textDisplayComponents.length > 0
        ? textDisplayComponents[textDisplayComponents.length - 1]
        : null;
    const lastTextDisplayComponentContent = lastTextDisplayComponent.data.content;
    // Extract branch and period from the lastTextDisplayComponentContent
    let branchFromComponent = null;
    let periodFromComponent = null;
    if (lastTextDisplayComponentContent) {
      const branchMatch = lastTextDisplayComponentContent.match(
        /\*\*BRANCH\*\*\n(.+?)\n\*\*PERIOD\*\*/
      );
      if (branchMatch) {
        branchFromComponent = branchMatch[1].trim();
      }
      const periodMatch = lastTextDisplayComponentContent.match(/\*\*PERIOD\*\*\n(.+?)(?:\n|$)/);
      if (periodMatch) {
        periodFromComponent = periodMatch[1].trim();
      }
    }

    const department = departments.find((d) => d.name === branchFromComponent);

    if (!department) {
      const noAttendancesContainer = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent('# 📊 Employee Dashboard')
        )
        .addSeparatorComponents((separator) => separator)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent('*No department found... 🕸️*')
        )
        .addActionRowComponents(actionRow);

      await interaction.message.edit({
        components: [noAttendancesContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const separatorDividerLarge = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);
    const separatorDividerSmall = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
    const separatorSpaceSm = new SeparatorBuilder()
      .setDivider(false)
      .setSpacing(SeparatorSpacingSize.Small);

    const dateRange = getDateRange(periodFromComponent);

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

    if (!employeeDataFetch) {
      const noAttendancesContainer = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent('# 📊 Employee Dashboard')
        )
        .addSeparatorComponents(separatorDividerLarge)
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent('## 📈 ATTENDANCES'))
        .addSeparatorComponents(separatorDividerSmall)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent('*No attendances found... 🕸️*')
        )
        .addSeparatorComponents(separatorDividerLarge)
        .addActionRowComponents((actionRow) =>
          actionRow.setComponents(backButton, salaryComputationButton)
        );

      await interaction.message.edit({
        components: [noAttendancesContainer],
        flags: MessageFlags.IsComponentsV2,
      });
      return;
    }

    const parsedAttendanceRecords = parseAttendanceRecords(employeeDataFetch);

    saveAttendanceRecords(interaction.user.id, parsedAttendanceRecords);

    const headers = ['Date', 'Check In', 'Check Out', 'Hours Worked'];
    const rows = buildRowsFromOdoo(parsedAttendanceRecords);
    const { pageRows, page, totalPages, total, start, end } = paginateRows(rows, 1, 5);
    const tableStr = makeEmbedTable(headers, pageRows, 60);

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

    const viewAttendancesContainer = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('# 📊 Employee Dashboard'))
      .addSeparatorComponents(separatorDividerLarge)
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('## 📈 Attendances'))
      .addSeparatorComponents(separatorDividerSmall)
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent(tableStr))
      .addSeparatorComponents(separatorDividerSmall)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `Page ${page} of ${totalPages} | Showing ${start + 1} - ${end} of ${total} entries`
        )
      )
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(previousButton, blankButton1, blankButton2, nextButton)
      )
      .addSeparatorComponents(separatorDividerLarge)
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(backButton, salaryComputationButton)
      );

    await interaction.message.edit({
      components: [viewAttendancesContainer],
      flags: MessageFlags.IsComponentsV2,
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
