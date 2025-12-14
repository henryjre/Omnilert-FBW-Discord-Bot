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

const { getAuditRatings } = require('../../../sqliteFunctions.js');
const { makeEmbedTable } = require('../../../functions/code/repeatFunctions.js');

module.exports = {
  data: {
    name: `previousAuditRatings`,
  },
  async execute(interaction, client) {
    const replyEmbed = new EmbedBuilder();

    const components = interaction.message.components;

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

    const auditRatings = await getAuditRatings(interaction.user.id);
    if (!auditRatings) {
      replyEmbed.setDescription(`🔴 ERROR: No audit ratings found.`).setColor('Red');
      return await interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral });
    }

    const containerComponent = components[0];
    // text display components
    const textDisplayComponents = containerComponent.components.filter(
      (component) => component.type === 10
    );
    const lastTextDisplayComponent =
      textDisplayComponents.length > 0
        ? textDisplayComponents[textDisplayComponents.length - 1]
        : null;
    const lastTextDisplayComponentContent = lastTextDisplayComponent.data.content;

    const pageNumber = parseInt(lastTextDisplayComponentContent.match(/Page (\d+) of/)[1]) - 1;

    const headers = ['Date', 'Audit', 'Rate'];
    const rows = buildRowsFromOdoo(auditRatings);
    const { pageRows, page, totalPages, total, start, end } = paginateRows(rows, pageNumber, 5);
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

    const previousAuditRatingsContainer = new ContainerBuilder()
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
      components: [previousAuditRatingsContainer],
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
