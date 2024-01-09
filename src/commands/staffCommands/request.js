const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("request")
    .setDescription("Request something!"),

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

    switch (interaction.channel.id) {
      case "1194304369001250945":
        const modal = buildDesignRequestModal();
        await interaction.showModal(modal);
        break;

      default:
        break;
    }

    function buildDesignRequestModal() {
      const modal = new ModalBuilder();

      modal
        .setCustomId("coreDesignRequest")
        .setTitle(`Request to the Design Department`);

      const first = new TextInputBuilder()
        .setCustomId(`requestInput`)
        .setLabel(`Request Details`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Explain your request in a detailed manner.")
        .setRequired(true);

      const second = new TextInputBuilder()
        .setCustomId(`reference1`)
        .setLabel(`Reference #1`)
        .setPlaceholder("(OPTIONAL) Reference link of your request.")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const third = new TextInputBuilder()
        .setCustomId(`reference2`)
        .setLabel(`Reference #2`)
        .setPlaceholder("(OPTIONAL) Additional reference link.")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const fourth = new TextInputBuilder()
        .setCustomId(`reference3`)
        .setLabel(`Reference #3`)
        .setPlaceholder("(OPTIONAL) Additional reference link.")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const firstRow = new ActionRowBuilder().addComponents(first);
      const secondRow = new ActionRowBuilder().addComponents(second);
      const thirdRow = new ActionRowBuilder().addComponents(third);
      const fourthRow = new ActionRowBuilder().addComponents(fourth);

      modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

      return modal;
    }
  },
};
