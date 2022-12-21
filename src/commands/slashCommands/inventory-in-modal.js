const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventory-in")
    .setDescription("Add a product in the inventory!"),
  async execute(interaction, client) {
    if (interaction.channelId != 1049166582829559918) {
      await interaction
        .reply({
          content: `This command can only be used in ${interaction.guild.channels.cache
            .get("1049166582829559918")
            .toString()}`,
        })
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId("inventory-in")
      .setTitle(`Add a Product in the Inventory`);

    const barcodeModal = new TextInputBuilder()
      .setCustomId(`barcode`)
      .setLabel(`Product Barcode`)
      .setStyle(TextInputStyle.Short)
      .setMinLength(10)
      .setPlaceholder("Input the Product barcode here.");

    const quantityModal = new TextInputBuilder()
      .setCustomId(`quantity`)
      .setLabel(`Product Quantity`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Product quantity must be numbers ONLY.");

    const priceModal = new TextInputBuilder()
      .setCustomId(`price`)
      .setLabel(`Inventory Price`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Inventory price must be numbers ONLY.");

    const firstActionRow = new ActionRowBuilder().addComponents(barcodeModal);
    const secondActionRow = new ActionRowBuilder().addComponents(quantityModal);
    const thirdActionRow = new ActionRowBuilder().addComponents(priceModal);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
    await interaction.showModal(modal);
  },
};
