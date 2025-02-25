const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `financeRequestReject`,
  },
  async execute(interaction, client) {
    const interactionMember = interaction.guild.members.cache.get(
      interaction.user.id
    );
    if (!interactionMember.roles.cache.has("1174612428206641182")) {
      await interaction.reply({
        content: `You cannot reject this request.`,
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder();

    modal
      .setCustomId(`rejectReason_${interaction.id}`)
      .setTitle(`Reject Request`);

    const reason = new TextInputBuilder()
      .setCustomId(`reasonInput`)
      .setLabel(`Details`)
      .setPlaceholder("The reason for rejection.")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(reason);
    modal.addComponents(firstRow);

    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `rejectReason_${interaction.id}` &&
          i.user.id === interaction.user.id;

        if (f) {
          await i.deferReply({ ephemeral: true });
        }
        return f;
      },
      time: 180000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const reason = modalResponse.fields.getTextInputValue("reasonInput");

        const message = await interaction.message.channel.messages.fetch(
          interaction.message.id
        );

        const messageEmbed = interaction.message.embeds[0];

        const requestUser = messageEmbed.data.fields[0].value;
        const match = requestUser.match(/<@(\d+)>/);
        const userId = match && match[1];

        let channel;
        if (messageEmbed.data.title.includes("Expense Reimbursement")) {
          channel = "1199308508005408839";
        } else {
          channel = "1199308889242468472";
        }

        const newEmbed = new EmbedBuilder(messageEmbed.data)
          .setColor("Red")
          .setDescription(`> ${reason}`)
          .setFooter({
            text: "REJECTED",
          });

        await client.channels.cache
          .get(channel)
          .send({
            content: `<@${userId}>`,
            embeds: [newEmbed],
          })
          .then((msg) => {
            message.delete();
            msg.react("❌");
          });

        await modalResponse.editReply({
          content: `Request rejected.`,
        });
      }
    } catch (error) {
      console.log(error);
      // await modalResponse.editReply({
      //   content: `🔴 ERROR: An error occurred while rejecting this request. Please try again.`,
      //   ephemeral: true,
      // });
    }
  },
};
