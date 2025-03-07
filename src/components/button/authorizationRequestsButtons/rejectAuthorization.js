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

const hrDepartmentChannel = "1342837776017657940";
const financeDepartmentChannel = "1342837676700602471";

const hrLogsChannel = "1343869449455009833";
const financeLogsChannel = "1346465399369367645";

const hrRole = "1314815153421680640";
const financeRole = "1314815202679590984";
const ehRole = "1314414836926386257";

module.exports = {
  data: {
    name: `rejectAuthorization`,
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

    if (
      (!interaction.member.roles.cache.has(hrRole) &&
        !interaction.member.roles.cache.has(financeRole) &&
        !interaction.member.roles.cache.has(ehRole)) ||
      (interaction.member.roles.cache.has(hrRole) &&
        interaction.message.channelId !== hrDepartmentChannel) ||
      (interaction.member.roles.cache.has(financeRole) &&
        interaction.message.channelId !== financeDepartmentChannel)
    ) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    let logsChannel;

    if (interaction.member.roles.cache.has(financeRole)) {
      logsChannel = financeLogsChannel;
    } else if (interaction.member.roles.cache.has(hrRole)) {
      logsChannel = hrLogsChannel;
    }

    const modal = new ModalBuilder()
      .setCustomId(`rejectRequest_${interaction.id}`)
      .setTitle(`Reject Authorization`);

    const details = new TextInputBuilder()
      .setCustomId(`additionalNotes`)
      .setLabel(`Reason for Rejection`)
      .setPlaceholder(`Insert the rejection details here.`)
      .setMaxLength(1000)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(details);
    modal.addComponents(firstRow);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `rejectRequest_${interaction.id}` &&
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
          messageEmbed.data.description += `\n\u200b\nReason for Rejection:\n> *"${details}"*\n\u200b`;
        }

        messageEmbed.data.footer = {
          text: `Rejected By: ${interaction.member.nickname.replace(
            /^[🔴🟢]\s*/,
            ""
          )}`,
        };

        messageEmbed.data.color = 15548997;

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
