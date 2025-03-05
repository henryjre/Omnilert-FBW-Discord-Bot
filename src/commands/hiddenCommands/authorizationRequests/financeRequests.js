const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require("discord.js");

const requestType = [
  {
    name: "💳 PAYMENT",
    value: "payment",
    color: "#000eff",
  },
  {
    name: "💰 REPLENISHMENT",
    value: "replenishment",
    color: "#ffb700",
  },
];

const financeRole = "1314815202679590984";

module.exports = {
  data: new SlashCommandBuilder().setName("finance_request"),
  pushToArray: false,
  async execute(interaction, client, option) {
    if (!interaction.member.roles.cache.has(financeRole)) {
      const replyEmbed = new EmbedBuilder()
        .setDescription(`🔴 ERROR: You cannot use this command.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }
    const type = requestType.find((t) => t.value === option);

    const modal = await buildModal(interaction, type);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const isValid =
          i.customId === `modal_${type.value}_${interaction.id}` &&
          i.user.id === interaction.user.id;

        if (!isValid) return false;

        await i.deferUpdate();
        return true;
      },
      time: 300000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        return await client.commands
          .get("finance_request_data")
          .execute(interaction, client, type, modalResponse);
      }
    } catch (error) {
      console.log(error);
      await interaction.followUp({
        content: "❌ An error occurred while processing your request.",
        ephemeral: true,
      });
    }
  },
};

async function buildModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_${type.value}_${interaction.id}`)
    .setTitle(`${type.name} REQUEST`);

  const firstInput = new TextInputBuilder()
    .setCustomId(`referenceNumber`)
    .setLabel(`🔗 Reference Number`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Enter the reference number/digits.")
    .setRequired(true)
    .setMaxLength(100);

  const secondInput = new TextInputBuilder()
    .setCustomId(`requestedAmount`)
    .setLabel(`💲 Requested Amount`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setPlaceholder("Enter the amount requested.")
    .setRequired(true);

  const thirdInput = new TextInputBuilder()
    .setCustomId(`bankNameInput`)
    .setLabel(`🏛️ Bank Name`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setPlaceholder("Enter the name of the bank.")
    .setRequired(true);

  const fourthInput = new TextInputBuilder()
    .setCustomId(`accountNameInput`)
    .setLabel(`👤 Account Name`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setPlaceholder("Enter the name of the bank account.")
    .setRequired(true);

  const fifthInput = new TextInputBuilder()
    .setCustomId(`accountNumberInput`)
    .setLabel(`🔢 Account Number`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setPlaceholder("Enter the account number of the bank account.")
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
  const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);
  const fourthActionRow = new ActionRowBuilder().addComponents(fourthInput);
  const fifthActionRow = new ActionRowBuilder().addComponents(fifthInput);

  modal.addComponents(
    firstActionRow,
    secondActionRow,
    thirdActionRow,
    fourthActionRow,
    fifthActionRow
  );
  return modal;
}
