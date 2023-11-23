const {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: {
    name: `confirmWithdrawal`,
  },
  async execute(interaction, client) {
    if (interaction.user.id !== interaction.message.interaction.user.id) {
      await interaction.reply({
        content: "You cannot use this button.",
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId("livestreamWithdrawal")
      .setTitle(`Bank Details`);

    const bankNameModal = new TextInputBuilder()
      .setCustomId(`bankName`)
      .setLabel(`Bank Name`)
      // .setValue("")
      .setPlaceholder("Input your bank / e-wallet name.")
      .setStyle(TextInputStyle.Short);

    const bankAccountModal = new TextInputBuilder()
      .setCustomId(`accountName`)
      .setLabel(`Bank Account Name`)
      // .setValue("")
      .setPlaceholder("Input your bank / e-wallet account name.")
      .setStyle(TextInputStyle.Short);

    const bankNumberModal = new TextInputBuilder()
      .setCustomId(`accountNumber`)
      .setLabel(`Bank Account Number`)
      // .setValue("")
      .setPlaceholder("Input your bank / e-wallet account number.")
      .setStyle(TextInputStyle.Short);

    const first = new ActionRowBuilder().addComponents(bankNameModal);
    const second = new ActionRowBuilder().addComponents(bankAccountModal);
    const third = new ActionRowBuilder().addComponents(bankNumberModal);

    modal.addComponents(first, second, third);
    await interaction.showModal(modal);
  },
};
