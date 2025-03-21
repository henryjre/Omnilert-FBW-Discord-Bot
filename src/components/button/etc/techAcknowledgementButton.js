const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const techRole = "1314815091908022373";
const finalTargetChannel = "1352693339421671608";

module.exports = {
  data: {
    name: `technologyAcknowledgement`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const replyEmbed = new EmbedBuilder();

    if (!interaction.member.roles.cache.has(techRole)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`memberRequest_${interaction.id}`)
      .setTitle(`Input Odoo Details`);

    const details = new TextInputBuilder()
      .setCustomId(`pinCodeInput`)
      .setLabel(`Employee PIN`)
      .setPlaceholder(`Insert the employe PIN.`)
      .setMaxLength(4)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const badgeUrl = new TextInputBuilder()
      .setCustomId(`badgeUrl`)
      .setLabel(`Badge URL`)
      .setPlaceholder(`Insert the employe badge URL.`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(details);
    const secondRow = new ActionRowBuilder().addComponents(badgeUrl);
    modal.addComponents(firstRow, secondRow);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `memberRequest_${interaction.id}` &&
          i.user.id === interaction.user.id;

        if (f) {
          await i.deferUpdate();
        }
        return f;
      },
      time: 120000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const pinCode = modalResponse.fields.getTextInputValue("pinCodeInput");
        const badgeUrl = modalResponse.fields.getTextInputValue("badgeUrl");
        const memberId = messageEmbed.data.fields.find(
          (f) => f.name === "Discord ID"
        );

        messageEmbed.data.footer.text += `\nTD Acknowledgement: ${interaction.member.nickname.replace(
          /^[🔴🟢]\s*/,
          ""
        )}`;

        messageEmbed.data.fields.push(
          { name: "Employee PIN", value: pinCode },
          { name: "Badge URL", value: badgeUrl }
        );

        messageEmbed.data.color = 5763719;

        await client.channels.cache
          .get(finalTargetChannel)
          .send({
            content: `<@${memberId.value}>`,
            embeds: [messageEmbed],
          })
          .then((msg) => {
            interaction.message.delete();
          });
      }
    } catch (error) {
      console.log(error);
      // await modalResponse.followUp({
      //   content: `🔴 ERROR: An error occurred while creating your signature request. Please try again.`,
      //   ephemeral: true,
      // });
    }
  },
};
