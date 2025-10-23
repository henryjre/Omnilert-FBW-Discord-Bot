const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags
} = require('discord.js');
const { getAuditRatingByCode, meritDemerit } = require('../../../odooRpc.js');

const auditTypes = require('../../../config/audit_types.json');

module.exports = {
  data: {
    name: 'posAuditCompleteConfirmation'
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const messageId = interaction.fields.getTextInputValue('posSessionMessageId');
    const message = await interaction.channel.messages.fetch(messageId);
    if (!message) {
      return await interaction.followUp({
        content: `🔴 ERROR: No message found.`,
        flags: MessageFlags.Ephemeral
      });
    }
    const messageSessionName = message.content.split('|')[2];

    if (!messageSessionName) {
      return await interaction.followUp({
        content: `🔴 ERROR: No session name found.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const sessionName = messageSessionName.trim();

    const auditRating = await getAuditRatingByCode(sessionName);

    if (auditRating.length === 0) {
      return await interaction.followUp({
        content: `🔴 ERROR: No audit rating found.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const employeeAverageAndMerit = getEmployeeAverageAndMerit(auditRating, 'PSA');

    const payload = {
      audit_title: 'POS Session Audits',
      audit_code: sessionName,
      data: employeeAverageAndMerit
    };

    await meritDemerit(payload);

    interaction.followUp({
      content: `🟢 Audit completed successfully.`,
      flags: MessageFlags.Ephemeral
    });
  }
};

function getEmployeeAverageAndMerit(data, auditCode) {
  const auditType = auditTypes.find((type) => type.code === auditCode);
  const grouped = Object.create(null);

  // --- Step 1: Aggregate totals per employee (single pass) ---
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const emp = item.x_employee_id;
    if (!emp || !Array.isArray(emp)) continue;

    const id = emp[0];
    const rating = Number(item.x_rating) || 0;

    if (!grouped[id]) {
      grouped[id] = { total: rating, count: 1 };
    } else {
      grouped[id].total += rating;
      grouped[id].count++;
    }
  }

  const results = [];
  const merits = auditType.merit;

  // --- Step 2: Compute averages and merit mapping ---
  for (const id in grouped) {
    const g = grouped[id];
    const avg = g.count ? +(g.total / g.count).toFixed(2) : 0;

    let merit_amount = 0;
    for (let j = 0; j < merits.length; j++) {
      const m = merits[j];
      if (avg >= m.avg_min && avg <= m.avg_max) {
        merit_amount = m.merit_amount;
        break;
      }
    }

    results.push({
      x_employee_id: Number(id),
      x_average: avg,
      merit_amount
    });
  }

  return results;
}
