const {
    SlashCommandBuilder,
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
  } = require("discord.js");
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName("addprofile")
      .setDescription("Adds a profile in the database."),
    async execute(interaction, client) {
  
      const modal = new ModalBuilder()
        .setCustomId("add-profile")
        .setTitle(`Add a Profile in the Database`);
  
      const firstModal = new TextInputBuilder()
        .setCustomId(`profileName`)
        .setLabel(`Name`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Input your FULL NAME here.");
  
      const secondModal = new TextInputBuilder()
        .setCustomId(`referrerId`)
        .setLabel(`Refferer ID`)
        .setMinLength(20)
        .setMaxLength(20)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("ID should start with LEV and ends with IOSA")
        .setRequired(false);
  
    //   const thirdModal = new TextInputBuilder()
    //     .setCustomId(`price`)
    //     .setLabel(`Inventory Price`)
    //     .setStyle(TextInputStyle.Short)
    //     .setPlaceholder("Inventory price must be numbers ONLY.");
  
      const firstActionRow = new ActionRowBuilder().addComponents(firstModal);
      const secondActionRow = new ActionRowBuilder().addComponents(secondModal);
    //   const thirdActionRow = new ActionRowBuilder().addComponents(thirdModal);
  
      modal.addComponents(firstActionRow, secondActionRow);
      await interaction.showModal(modal);
    },
  };
  