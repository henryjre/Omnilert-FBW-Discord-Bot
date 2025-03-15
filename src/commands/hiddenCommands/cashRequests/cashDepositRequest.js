const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("cash_deposit_request"),
  pushToArray: false,
  async execute(interaction, client, attachmentFile) {
    const modal = await buildModal(interaction);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const isValid =
          i.customId === `cdrModal_${interaction.id}` &&
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
          .get("cdr_data")
          .execute(interaction, client, modalResponse, attachmentFile);
      }
    } catch (error) {
      console.log(error);
      await interaction.followUp({
        content: "❌ An error occurred while processing your request.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

async function buildModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(`cdrModal_${interaction.id}`)
    .setTitle(`CASH DEPOSIT REQUEST`);

  const firstInput = new TextInputBuilder()
    .setCustomId(`dateInput`)
    .setLabel(`📆 Date`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Enter the date of the request.")
    .setRequired(true)
    .setMaxLength(100);

  const secondInput = new TextInputBuilder()
    .setCustomId(`branchInput`)
    .setLabel(`🛒 Branch`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setPlaceholder("Enter the store branch.")
    .setRequired(true);

  const thirdInput = new TextInputBuilder()
    .setCustomId(`employeesInput`)
    .setLabel(`👤 Employees on Duty`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setPlaceholder("Enter the name of the employees on duty.")
    .setRequired(true);

  const fourthInput = new TextInputBuilder()
    .setCustomId(`reasonInput`)
    .setLabel(`❓ Reason`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setPlaceholder("Enter the reason for the deposit request.")
    .setRequired(true);

  const fifthInput = new TextInputBuilder()
    .setCustomId(`amountInput`)
    .setLabel(`💵 Amount`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setPlaceholder("Enter the requested deposit amount.")
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
  const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(fifthInput);
  const fourthActionRow = new ActionRowBuilder().addComponents(thirdInput);
  const fifthActionRow = new ActionRowBuilder().addComponents(fourthInput);

  modal.addComponents(
    firstActionRow,
    secondActionRow,
    thirdActionRow,
    fourthActionRow,
    fifthActionRow
  );
  return modal;
}
