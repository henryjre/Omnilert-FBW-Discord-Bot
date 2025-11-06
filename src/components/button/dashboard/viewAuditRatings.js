const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const moment = require('moment-timezone');

const { getEmployeeAuditRatings } = require('../../../odooRpc.js');
const { saveAuditRatings } = require('../../../sqliteFunctions.js');
const auditTypes = require('../../../config/audit_types.json');

module.exports = {
  data: {
    name: `viewAuditRatings`
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
      .setDescription('*Retrieving audit ratings... Please wait.*')
      .setColor('Orange');

    await interaction.message.edit({ embeds: [preloadEmbed], components: [] });

    await interaction.deferUpdate();

    const employeeDataFetch = await getEmployeeAuditRatings(interaction.user.id);
    if (!employeeDataFetch) {
      replyEmbed.setDescription(`🔴 ERROR: No employee data found.`).setColor('Red');
      return await interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral });
    }

    saveAuditRatings(interaction.user.id, employeeDataFetch);

    const headers = ['Date', 'Audit', 'Rate'];
    const rows = buildRowsFromOdoo(employeeDataFetch);
    const { pageRows, page, totalPages, total, start, end } = paginateRows(rows, 1, 5);
    const tableStr = makeEmbedTable(headers, pageRows, 60);

    const auditRatingsEmbed = EmbedBuilder.from(messageEmbed)
      .setDescription(`## 📈 AUDIT RATINGS\n\u200b\n${tableStr}`)
      .setFooter({
        text: `Page ${page} of ${totalPages} | Showing ${start + 1} - ${end} of ${total} entries`
      });

    const nextButton = new ButtonBuilder()
      .setCustomId('nextAuditRatings')
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
      .setCustomId('previousAuditRatings')
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

    const epiDashboardButton = new ButtonBuilder()
      .setCustomId('viewEpiDashboard')
      .setLabel('View EPI')
      .setEmoji('📈')
      .setStyle(ButtonStyle.Success);

    const backButton = new ButtonBuilder()
      .setCustomId('backToDashboard')
      .setLabel('Back To Dashboard')
      .setEmoji('↩️')
      .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(backButton, epiDashboardButton);

    await interaction.message.edit({
      embeds: [auditRatingsEmbed],
      components: [paginationButtonRow, buttonRow]
    });
  }
};

function buildRowsFromOdoo(data) {
  return data.map((e) => {
    const localDate = moment.utc(e.x_audit_date).tz('Asia/Manila').format('MMM DD, YYYY hh:mm A');
    return [localDate, e.x_name, String(e.x_rating + ' ⭐' ?? '')];
  });
}

function makeEmbedTable(headers, rows, maxWidth = 60) {
  const s = (v) =>
    String(v ?? '')
      .replace(/\n/g, ' ')
      .trim();

  const cols = headers.length;
  const widths = headers.map((h, i) =>
    Math.max(4, s(h).length, ...rows.map((r) => s(r[i]).length))
  );

  const sepOverhead = 3 * (cols - 1);
  const totalWidth = () => widths.reduce((a, b) => a + b, 0) + sepOverhead;

  while (totalWidth() > maxWidth) {
    let widest = 0;
    for (let i = 1; i < cols; i++) if (widths[i] > widths[widest]) widest = i;
    if (widths[widest] <= 4) break;
    widths[widest]--;
  }

  const cut = (text, w) => {
    const t = s(text);
    return t.length <= w ? t : w <= 1 ? t.slice(0, w) : t.slice(0, w - 1) + '…';
  };
  const pad = (text, w) => cut(text, w).padEnd(w, ' ');
  const join = (arr) => arr.join(' | ');

  const headerLine = join(headers.map((h, i) => pad(h, widths[i])));
  const rule = '-'.repeat(Math.min(maxWidth, headerLine.length));
  const body = rows.map((r) => join(r.map((c, i) => pad(c, widths[i]))));

  return '```\n' + headerLine + '\n' + rule + '\n' + body.join('\n') + '\n```';
}

function paginateRows(rows, page = 1, pageSize = 5) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(Math.max(page, 1), totalPages);
  const start = (cur - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  return { pageRows, page: cur, totalPages, total, start, end: start + pageRows.length };
}
