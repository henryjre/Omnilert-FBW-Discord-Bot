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
        .setLabel(`Full Name`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Input your first name followed by your last name.");
  
      const secondModal = new TextInputBuilder()
        .setCustomId(`referrerId`)
        .setLabel(`Refferer ID (Optional)`)
        .setMinLength(20)
        .setMaxLength(20)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Leave blank if no referral ID")
        .setRequired(false);
  
      const thirdModal = new TextInputBuilder()
        .setCustomId(`email`)
        .setLabel(`Email Address`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Input your email address here.");
  
      const firstActionRow = new ActionRowBuilder().addComponents(firstModal);
      const secondActionRow = new ActionRowBuilder().addComponents(secondModal);
      const thirdActionRow = new ActionRowBuilder().addComponents(thirdModal);
  
      modal.addComponents(thirdActionRow, firstActionRow, secondActionRow);
      await interaction.showModal(modal);
    },
  };
  