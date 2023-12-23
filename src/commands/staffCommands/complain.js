const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("complain")
    .setDescription("File an anonymous complaint/s to a specific core member.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The target core member of your complaint/s.")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const validRoles = ["1185935514042388520"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1185935514042388520>.`,
        ephemeral: true,
      });
      return;
    }

    const user = interaction.options.getUser("user");

    const member = interaction.guild.members.cache.get(user.id);

    if (!member.roles.cache.has("1185935514042388520")) {
      await interaction.reply({
        content: `🔴 ERROR: ${member.nickname} is not a <@&1185935514042388520> member.`,
        ephemeral: true,
      });
      return;
    }

    const modal = buildModal();
    await interaction.showModal(modal);

    function buildModal() {
      const modal = new ModalBuilder()
        .setCustomId("coreComplaint")
        .setTitle(`File a complaint to ${member.nickname}`);

      const secondInput = new TextInputBuilder()
        .setCustomId(`userId`)
        .setLabel(`Member (DO NOT CHANGE)`)
        .setStyle(TextInputStyle.Short)
        .setValue(user.id);

      const thirdInput = new TextInputBuilder()
        .setCustomId(`complainInput`)
        .setLabel(`Complaint Details`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Write your complaint in detail.")
        .setRequired(true);

      const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);

      modal.addComponents(secondActionRow, thirdActionRow);

      return modal;
    }
  },
};
