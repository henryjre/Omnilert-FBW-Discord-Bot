const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription(
      "Suggest improvements that can be made by a specific core member."
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("publicly")
        .setDescription("Suggest publicly to another executive.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The target executive.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("privately")
        .setDescription("Suggest privately to another executive.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The target executive.")
            .setRequired(true)
        )
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
    const type = interaction.options.getSubcommand();

    const member = interaction.guild.members.cache.get(user.id);

    if (!member.roles.cache.has("1185935514042388520")) {
      await interaction.reply({
        content: `🔴 ERROR: ${member.nickname} is not an <@&1185935514042388520>.`,
        ephemeral: true,
      });
      return;
    }

    let titleName;
    if (member.nickname.includes("-")) {
      titleName = member.nickname.split("-")[0].trim();
    } else {
      titleName = member.nickname;
    }

    const modal = buildModal(type);
    await interaction.showModal(modal);

    function buildModal(type) {
      const modal = new ModalBuilder();

      if (type === "publicly") {
        modal
          .setCustomId("coreSuggestionPublic")
          .setTitle(`Suggest to ${titleName} PUBLICLY`);
      } else {
        modal
          .setCustomId("coreSuggestionPrivate")
          .setTitle(`Suggest to ${titleName} PRIVATELY`);
      }

      const secondInput = new TextInputBuilder()
        .setCustomId(`userId`)
        .setLabel(`Member (DO NOT CHANGE)`)
        .setStyle(TextInputStyle.Short)
        .setValue(user.id);

      const thirdInput = new TextInputBuilder()
        .setCustomId(`suggestionInput`)
        .setLabel(`Suggestion`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Suggest something that the member should improve on.")
        .setRequired(true);

      const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);

      modal.addComponents(secondActionRow, thirdActionRow);

      return modal;
    }
  },
};
