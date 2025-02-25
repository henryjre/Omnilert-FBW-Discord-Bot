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

const logsChannel = "1343869449455009833";
const hrRole = "1314815153421680640";

module.exports = {
  data: {
    name: `approveAuthorization`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const replyEmbed = new EmbedBuilder();

    const mentionableMembers = messageEmbed.data.fields
      .filter(
        (f) =>
          f.name === "Assigned Name" ||
          f.name === "Employee Name" ||
          f.name === "Reliever Name"
      )
      .map((f) => f.value)
      .join("\n");

    if (!interaction.member.roles.cache.has(hrRole)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`approveRequest_${interaction.id}`)
      .setTitle(`Additional Details`);

    const details = new TextInputBuilder()
      .setCustomId(`additionalNotes`)
      .setLabel(`Notes (OPTIONAL)`)
      .setPlaceholder(
        `Add some additional details/notes for the employees assigned.`
      )
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const firstRow = new ActionRowBuilder().addComponents(details);
    modal.addComponents(firstRow);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `approveRequest_${interaction.id}` &&
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
        const details =
          modalResponse.fields.getTextInputValue("additionalNotes");

        if (details) {
          messageEmbed.data.description += `\n\u200b\nAdditional notes from **${interaction.member.nickname}**:\n> *"${details}"*\n\u200b`;
        }

        messageEmbed.data.footer = {
          text: `Approved By: ${interaction.member.nickname}`,
        };

        messageEmbed.data.color = 5763719;

        await client.channels.cache
          .get(logsChannel)
          .send({
            content: mentionableMembers,
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
