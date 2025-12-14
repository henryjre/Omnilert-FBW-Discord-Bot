const {
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorSpacingSize,
  SeparatorBuilder,
} = require('discord.js');

const { getEmployeeEPIData } = require('../../../odooRpc.js');
const auditTypes = require('../../../config/audit_types.json');

module.exports = {
  data: {
    name: `viewEpiDashboard`,
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

    const preloadContainer = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('📊 Employee Dashboard'))
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('*Retrieving EPI data... Please wait.*')
      );

    await interaction.message.edit({
      components: [preloadContainer],
      flags: MessageFlags.IsComponentsV2,
    });

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

    const separatorDividerLarge = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);
    const separatorDividerSmall = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
    const separatorSpaceSm = new SeparatorBuilder()
      .setDivider(false)
      .setSpacing(SeparatorSpacingSize.Small);

    const backButton = new ButtonBuilder()
      .setCustomId('backToDashboard')
      .setLabel('Back To Dashboard')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary);

    const viewAuditRatingsButton = new ButtonBuilder()
      .setCustomId('viewAuditRatings')
      .setLabel('View Audit Ratings')
      .setEmoji('🌟')
      .setStyle(ButtonStyle.Success);

    const viewEpiContainer = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('# 📊 Employee Dashboard'))
      .addSeparatorComponents(separatorDividerLarge)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('## 📈 Employee Performance Index')
      )
      .addSeparatorComponents(separatorDividerSmall)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`**EPI Value:** ${employeeData.x_epi} points`)
      )
      .addSeparatorComponents(separatorSpaceSm)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `**Service QA Audit**\n**Average:** ${employeeData.x_average_sqaa} ⭐\n**Merit Amount:** ${sqaaMeritFeedback.merit_amount}\n*${sqaaMeritFeedback.message}*`
        )
      )
      .addSeparatorComponents(separatorSpaceSm)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `**Store CCTV Spot Audit**\n**Average:** ${employeeData.x_average_scsa} ⭐\n**Merit Amount:** ${scsaMeritFeedback.merit_amount}\n*${scsaMeritFeedback.message}*`
        )
      )
      .addSeparatorComponents(separatorDividerLarge)
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(backButton, viewAuditRatingsButton)
      );

    await interaction.message.edit({
      components: [viewEpiContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
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
