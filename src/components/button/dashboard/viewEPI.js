const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const { getEmployeeEPIData, getEmployeeAuditRatings } = require('../../../odooRpc.js');
const auditTypes = require('../../../config/audit_types.json');

module.exports = {
  data: {
    name: `viewEpiDashboard`
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
      .setDescription('*Retrieving EPI data... Please wait.*')
      .setColor('Orange');

    await interaction.message.edit({ embeds: [preloadEmbed], components: [] });

    await interaction.deferUpdate();

    const employeeDataFetch = await getEmployeeEPIData(interaction.user.id);
    if (!employeeDataFetch) {
      replyEmbed.setDescription(`🔴 ERROR: No employee data found.`).setColor('Red');
      return await interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral });
    }

    const employeeData = employeeDataFetch[0];
    const scsaAudit = auditTypes.find((audit) => audit.code === 'SCSA');
    const sqaaAudit = auditTypes.find((audit) => audit.code === 'SQAA');

    const scsaMeritFeedback = getMeritFeedback(scsaAudit, employeeData.x_average_scsa);
    const sqaaMeritFeedback = getMeritFeedback(sqaaAudit, employeeData.x_average_sqaa);

    const viewEpiEmbed = EmbedBuilder.from(messageEmbed)
      .setDescription('## 📈 EMPLOYEE PERFORMANCE INDEX')
      .setFields(
        { name: 'EPI Value', value: `${employeeData.x_epi} points` },
        {
          name: 'Service QA Audit',
          value: `**Average:** ${employeeData.x_average_sqaa} ⭐\n**Merit Amount:** ${sqaaMeritFeedback.merit_amount}\n*${sqaaMeritFeedback.message}*`
        },
        {
          name: 'Store CCTV Spot Audit',
          value: `**Average:** ${employeeData.x_average_scsa} ⭐\n**Merit Amount:** ${scsaMeritFeedback.merit_amount}\n*${scsaMeritFeedback.message}*`
        }
      );

    if (viewEpiEmbed.data.footer) {
      delete viewEpiEmbed.data.footer;
    }

    const backButton = new ButtonBuilder()
      .setCustomId('backToDashboard')
      .setLabel('Back')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary);

    const viewAuditRatingsButton = new ButtonBuilder()
      .setCustomId('viewAuditRatings')
      .setLabel('View Audit Ratings')
      .setEmoji('🌟')
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(backButton, viewAuditRatingsButton);

    await interaction.message.edit({ embeds: [viewEpiEmbed], components: [buttonRow] });
  }
};

function getMeritFeedback(audit, average) {
  if (!audit || !audit.merit) {
    return { merit_amount: 0, message: 'No merit configuration found for this audit type.' };
  }

  const merit = audit.merit.find((m) => average >= m.avg_min && average <= m.avg_max);
  if (!merit) {
    return { merit_amount: 0, message: 'Average is out of defined merit range.' };
  }

  const { merit_amount } = merit;
  let message = '';

  if (merit_amount === audit.merit[0].merit_amount) {
    message = 'Your ratings are in the lowest possible range. Immediate improvement is needed.';
  } else if (merit_amount === audit.merit[audit.merit.length - 1].merit_amount) {
    message = 'Excellent work! Your ratings are in the highest possible range. Keep it up!';
  } else if (merit_amount < 0) {
    message =
      'Your current ratings indicate room for improvement. Focus on consistency and quality.';
  } else if (merit_amount === 0) {
    message = 'You’re performing at an average level. Keep striving for better results.';
  } else {
    message =
      'Good job! Your ratings are above average. Continue maintaining this level of performance.';
  }

  return { merit_amount, message };
}
