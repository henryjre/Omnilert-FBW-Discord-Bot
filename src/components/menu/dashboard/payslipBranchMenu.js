const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const { getEmployeePayslipData, createViewOnlyPayslip } = require('../../../odooRpc.js');
const departments = require('../../../config/departments.json');

module.exports = {
  data: {
    name: `payslipBranchMenu`
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
      .setDescription('*Computing current payslip details... Please wait.*')
      .setColor('Orange');

    await interaction.message.edit({ embeds: [preloadEmbed], components: [] });

    await interaction.deferUpdate();

    const selectedBranch = interaction.values[0];
    const department = departments.find((d) => d.name === selectedBranch);

    let payslipData = await getEmployeePayslipData(interaction.user.id, department.id);

    if (!payslipData) {
      payslipData = await createViewOnlyPayslip(interaction.user.id, department.id);
    }

    // SALARY COMPUTATION

    const description = formatEmbedTable(payslipData.lines);

    // WORKED DAYS

    const headers = ['Description', 'Days', 'Hours', 'Amount'];

    const totalDays = payslipData.worked_days.reduce((sum, d) => sum + d.number_of_days, 0);
    const totalHours = payslipData.worked_days.reduce((sum, d) => sum + d.number_of_hours, 0);
    const totalAmount = payslipData.worked_days.reduce((sum, d) => sum + d.amount, 0);

    const rows = payslipData.worked_days.map((d) => [
      d.name,
      d.number_of_days.toFixed(2),
      d.number_of_hours.toFixed(2),
      `₱${d.amount.toFixed(2)}`
    ]);

    rows.push(['TOTAL', totalDays.toFixed(2), totalHours.toFixed(2), `₱${totalAmount.toFixed(2)}`]);

    const dateRange = getDateRange();

    const salaryComputationEmbed = EmbedBuilder.from(messageEmbed)
      .setDescription(
        `## 📈 PAYSLIP DETAILS\n### PERIOD: ${dateRange.date_from} - ${
          dateRange.date_to
        }\n\u200b\n**WORKED DAYS**\n${makeEmbedTable(
          headers,
          rows
        )}\n\u200b\n**SALARY COMPUTATION**\n${description}`
      )
      .setFooter({
        text: `This is an unofficial payslip and is not entirely accurate.`
      });

    const backButton = new ButtonBuilder()
      .setCustomId('backToDashboard')
      .setLabel('Back')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.message.edit({ embeds: [salaryComputationEmbed], components: [buttonRow] });
  }
};

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
  const rule = '─'.repeat(Math.min(maxWidth, headerLine.length));
  const body = rows
    .filter((r) => r[0] !== 'TOTAL')
    .map((r) => join(r.map((c, i) => pad(c, widths[i]))));
  const totalRow = rows.find((r) => r[0] === 'TOTAL')
    ? join(rows.find((r) => r[0] === 'TOTAL').map((c, i) => pad(c, widths[i])))
    : null;

  return (
    '```\n' +
    headerLine +
    '\n' +
    rule +
    '\n' +
    body.join('\n') +
    '\n' +
    rule +
    '\n' +
    totalRow +
    '\n```'
  );
}

//////

const TOTAL_WIDTH = 46; // sweet spot for Discord mobile
const SEP = ' | ';

const LEFT_RATIO = 0.8;

const COL_LEFT = Math.floor((TOTAL_WIDTH - SEP.length) * LEFT_RATIO);
const COL_RIGHT = TOTAL_WIDTH - SEP.length - COL_LEFT;

const formatPeso = (n) =>
  `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fit(text, width) {
  const s = String(text ?? '');
  return s.length > width ? s.slice(0, width - 1) + '…' : s.padEnd(width, ' ');
}

function dash() {
  return '─'.repeat(TOTAL_WIDTH);
}

function centerTitle(text) {
  const t = text.toUpperCase();
  const totalPad = TOTAL_WIDTH - t.length;
  const left = Math.floor(totalPad / 2);
  const right = totalPad - left;
  return ' '.repeat(left) + t + ' '.repeat(right);
}

function renderBlock(title, rows) {
  const lines = [
    centerTitle(title),
    dash(),
    ...rows.map(([l, r]) => `${fit(l, COL_LEFT)}${SEP}${fit(r, COL_RIGHT)}`),
    dash()
  ];
  return lines.join('\n');
}

function formatEmbedTable(lines) {
  // sort by sequence and normalize data
  const items = [...lines].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  for (const it of items) if (it.code === 'OTHERINC') it.name = 'Other Income';

  const isTitle = (it) => it.category_id?.[1] === 'Title' && (it.name || '').trim();
  const sections = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (isTitle(it)) sections.push({ title: it.name.trim(), start: i });
    if (it.code === 'NET') sections.push({ title: 'NET SALARY', start: i, isNet: true });
  }

  const blocks = [];
  for (let s = 0; s < sections.length; s++) {
    const { title, start, isNet } = sections[s];
    const end = s + 1 < sections.length ? sections[s + 1].start : items.length;

    if (isNet) {
      const net = items[start];
      blocks.push(renderBlock(title, [['Net Salary', formatPeso(net.total ?? net.amount ?? 0)]]));
      continue;
    }

    const rows = [];
    for (let i = start + 1; i < end; i++) {
      const it = items[i];
      if (isTitle(it) || !it.name?.trim() || it.code === 'NET') continue;
      rows.push([it.name.trim(), formatPeso(it.total ?? it.amount ?? 0)]);
    }
    if (rows.length) blocks.push(renderBlock(title, rows));
  }

  // wrap in a code block so Discord uses monospace on mobile
  return '```\n' + blocks.join('\n\n') + '\n```';
}

function getDateRange() {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth();
  const year = today.getFullYear();

  // if current day >= 15 → start from 15th, else start from 1st of the same month
  const dateFrom = new Date(year, month, day >= 15 ? 15 : 1);
  const dateTo = today;

  // format as "MMM DD, YYYY"
  const options = { month: 'short', day: '2-digit', year: 'numeric' };
  const format = (d) => d.toLocaleDateString('en-US', options);

  return {
    date_from: format(dateFrom),
    date_to: format(dateTo)
  };
}
