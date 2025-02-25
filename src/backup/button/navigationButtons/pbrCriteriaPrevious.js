const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

const criterias = require("../coreButtons/pbrCriteria.json");

module.exports = {
  data: {
    name: `pbrCriteriaPrevious`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();
    const embed = interaction.message.embeds[0].data;

    const criteriaIndex = criterias.findIndex(
      (c) => c.description === embed.description
    );

    const currentPage = criteriaIndex + 1;
    const nextPreviousPage = currentPage - 1;

    const nextCriteria = new EmbedBuilder(
      criterias[criteriaIndex - 1]
    ).setFooter({
      text: `Page ${nextPreviousPage} of ${criterias.length}`,
    });

    const prev = new ButtonBuilder()
      .setCustomId("pbrCriteriaPrevious")
      .setLabel("‹")
      .setDisabled(false)
      .setStyle(ButtonStyle.Primary);

    const next = new ButtonBuilder()
      .setCustomId("pbrCriteriaNext")
      .setLabel("›")
      .setDisabled(false)
      .setStyle(ButtonStyle.Primary);

    if (nextPreviousPage === 1) {
      prev.setDisabled(true).setStyle(ButtonStyle.Secondary);
    }

    const buttonRow = new ActionRowBuilder().addComponents(prev, next);

    const messagePayload = {
      embeds: [nextCriteria],
      components: [buttonRow],
    };

    interaction.editReply(messagePayload);
  },
};
