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
    name: `posOrderAudit`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

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

    const modal = new ModalBuilder()
      .setCustomId(`orderAudit_${interaction.id}`)
      .setTitle(`POS Order Audit`);

    const details = new TextInputBuilder()
      .setCustomId(`auditReason`)
      .setLabel(`Audit Opinion`)
      .setPlaceholder(`Insert the audit opinion here.`)
      .setMaxLength(1000)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(details);
    modal.addComponents(firstRow);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `orderAudit_${interaction.id}` &&
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
        const details = modalResponse.fields.getTextInputValue("auditReason");

        const auditor = interaction.member.nickname.replace(/^[🔴🟢]\s*/, "");

        if (messageEmbed.data.description) {
          messageEmbed.data.description += `\n\u200b\nAudit Opinion:\n> *"${details}"*\n\u200b`;
        } else {
          messageEmbed.data.description = `Audit Opinion:\n> *"${details}"*`;
        }

        if (messageEmbed.data.footer) {
          messageEmbed.data.footer = {
            text: `${messageEmbed.data.footer.text}\n\u200b\nAudited By: ${auditor}\nAudit Opinion: ${details}`,
          };
        } else {
          messageEmbed.data.footer = {
            text: `Audited By: ${auditor}\nAudit Opinion: ${details}`,
          };
        }

        messageEmbed.data.color = 5793266;

        await interaction.message.edit({
          embeds: [messageEmbed],
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
