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
const ehChannel = "1342837500116336823";

const hrLogsChannel = "1343869449455009833";
const financeLogsChannel = "1346465399369367645";

const hrRole = "1314815153421680640";
const financeRole = "1314815202679590984";
const ehRole = "1314414836926386257";

const financeType = [
  "SALARY/WAGE",
  "CASH ADVANCE",
  "EXPENSE REIMBURSEMENT",
  "TRAINING ALLOWANCE",
  "TRANSPORT ALLOWANCE",
  "CASH DEPOSIT",
];

module.exports = {
  data: {
    name: `approveAuthorization`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    let attachments = [];

    if (interaction.message.attachments.size > 0) {
      attachments = Array.from(interaction.message.attachments.values());
    }

    const replyEmbed = new EmbedBuilder();

    const ownerFieldNames = [
      "Assigned Name",
      "Employee Name",
      "Notification By",
      "Reported By",
      "Requested By",
    ];

    const mentionableMembers = messageEmbed.data.fields
      .filter((f) => ownerFieldNames.includes(f.name))
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

    const embedTitle = messageEmbed.data.description;
    const isFinanceType = financeType.some((type) => embedTitle.includes(type));

    let logsChannel;

    if (isFinanceType) {
      logsChannel = financeLogsChannel;
    } else if (interaction.member.roles.cache.has(financeRole)) {
      logsChannel = financeLogsChannel;
    } else if (
      interaction.member.roles.cache.has(hrRole) ||
      interaction.member.roles.cache.has(ehRole)
    ) {
      logsChannel = hrLogsChannel;
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
          messageEmbed.data.description += `\n\u200b\nAdditional notes from **${interaction.member.nickname.replace(
            /^[🔴🟢]\s*/,
            ""
          )}**:\n> *"${details}"*\n\u200b`;
        }

        messageEmbed.data.footer = {
          text: `Approved By: ${interaction.member.nickname.replace(
            /^[🔴🟢]\s*/,
            ""
          )}`,
        };

        messageEmbed.data.color = 5763719;

        const messagePayload = {
          content: mentionableMembers,
          embeds: [messageEmbed],
        };

        if (attachments.length > 0) {
          messagePayload.files = attachments;
        }

        await client.channels.cache
          .get(logsChannel)
          .send(messagePayload)
          .then((msg) => {
            interaction.message.delete();
          });
      }
    } catch (error) {
      console.log(error);
      // await modalResponse.followUp({
      //   content: `🔴 ERROR: An error occurred while creating your signature request. Please try again.`,
      //   flags: MessageFlags.Ephemeral,
      // });
    }
  },
};
