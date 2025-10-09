const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const managementRole = "1314413671245676685";

module.exports = {
  data: {
    name: `posAuditRatingMenu`,
  },
  async execute(interaction, client) {
    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const replyEmbed = new EmbedBuilder();

    if (!interaction.member.roles.cache.has(managementRole)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const rating = interaction.values[0];
    const color = getColor(rating);

    const modal = new ModalBuilder()
      .setCustomId(`posAuditRating_${interaction.id}`)
      .setTitle(`POS Audit Rating`);

    const details = new TextInputBuilder()
      .setCustomId(`ratingReason`)
      .setLabel(`Rating Reason`)
      .setPlaceholder(`Insert the rating reason here.`)
      .setMaxLength(1000)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(details);
    modal.addComponents(firstRow);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `posAuditRating_${interaction.id}` &&
          i.user.id === interaction.user.id;

        if (f) {
          await i.deferUpdate();
        }
        return f;
      },
      time: 300000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const details = modalResponse.fields.getTextInputValue("ratingReason");

        const auditor = interaction.member.nickname.replace(/^[🔴🟢]\s*/, "");

        if (messageEmbed.data.footer) {
          messageEmbed.data.footer = {
            text: `${messageEmbed.data.footer.text}\n\u200b\nAudited By: ${auditor}\nRating: ${rating}\nRating Reason: ${details}`,
          };
        } else {
          messageEmbed.data.footer = {
            text: `Audited By: ${auditor}\nRating: ${rating}\nRating Reason: ${details}`,
          };
        }

        messageEmbed.data.color = color;

        await interaction.message.edit({
          embeds: allEmbeds,
          components: [],
        });
      }
    } catch (error) {
      console.log(error);
      await modalResponse.followUp({
        content: `🔴 ERROR: An error occurred while creating your signature request. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

function getColor(rating) {
  switch (rating) {
    case "⭐":
      return 0x1a1f73;
    case "⭐⭐":
      return 0x2e38a3;
    case "⭐⭐⭐":
      return 0x434ecf;
    case "⭐⭐⭐⭐":
      return 0x4e5be8;
    case "⭐⭐⭐⭐⭐":
      return 0x5865f2;
    default:
      return 0x5865f2;
  }
}
