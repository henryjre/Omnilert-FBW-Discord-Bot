const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorSpacingSize,
  SeparatorBuilder,
} = require('discord.js');

const moment = require('moment-timezone');

const { getEmployeeAuditRatings } = require('../../../odooRpc.js');
const { makeEmbedTable } = require('../../../functions/code/repeatFunctions.js');
const { saveAuditRatings } = require('../../../sqliteFunctions.js');

module.exports = {
  data: {
    name: `viewAuditRatings`,
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
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('# 📊 Employee Dashboard'))
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('*Retrieving audit ratings... Please wait.*')
      );

    await interaction.message.edit({
      components: [preloadContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.deferUpdate();

    const employeeDataFetch = await getEmployeeAuditRatings(interaction.user.id);

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

    const separatorDividerLarge = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);
    const separatorDividerSmall = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
    const separatorSpaceSm = new SeparatorBuilder()
      .setDivider(false)
      .setSpacing(SeparatorSpacingSize.Small);

    if (!employeeDataFetch) {
      const viewAuditRatingsContainer = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent('# 📊 Employee Dashboard')
        )
        .addSeparatorComponents(separatorDividerLarge)
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent('## 📈 Audit Ratings'))
        .addSeparatorComponents(separatorDividerSmall)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent('*No audit ratings found... 🕸️*')
        )
        .addSeparatorComponents(separatorDividerLarge)
        .addActionRowComponents((actionRow) =>
          actionRow.setComponents(backButton, epiDashboardButton)
        );

      return await interaction.message.edit({
        components: [viewAuditRatingsContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    saveAuditRatings(interaction.user.id, employeeDataFetch);

    const headers = ['Date', 'Audit', 'Rate'];
    const rows = buildRowsFromOdoo(employeeDataFetch);
    const { pageRows, page, totalPages, total, start, end } = paginateRows(rows, 1, 5);
    const tableStr = makeEmbedTable(headers, pageRows, 60);

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

    const viewAuditRatingsContainer = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('# 📊 Employee Dashboard'))
      .addSeparatorComponents(separatorDividerLarge)
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('## 📈 Audit Ratings'))
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
        actionRow.setComponents(backButton, epiDashboardButton)
      );

    await interaction.message.edit({
      components: [viewAuditRatingsContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

function buildRowsFromOdoo(data) {
  return data.map((e) => {
    const localDate = moment.utc(e.x_audit_date).tz('Asia/Manila').format('MMM DD, YYYY hh:mm A');
    return [localDate, e.x_name, String(e.x_rating + ' ⭐' ?? '')];
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
