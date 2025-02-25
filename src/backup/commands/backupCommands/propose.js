const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("propose")
    .setDescription("Propose a new idea to the system of Leviosa.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("executives")
        .setDescription("Write an executive proposal.")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Submit privately or publicly.")
            .setRequired(true)
            .addChoices(
              { name: "🔓 Submit public proposal", value: "public" },
              { name: "🔒 Submit private proposal", value: "private" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("directors")
        .setDescription("Write a proposal for the board of directors.")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Submit privately or publicly.")
            .setRequired(true)
            .addChoices(
              { name: "🔓 Submit public proposal", value: "public" },
              { name: "🔒 Submit private proposal", value: "private" }
            )
        )
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    let channel;
    if (subcommand === "executives") {
      if (!interaction.member.roles.cache.has("1185935514042388520")) {
        await interaction.reply({
          content: `🔴 ERROR: This command can only be used by <@&1185935514042388520>.`,
          ephemeral: true,
        });
        return;
      }
      channel = "1204006892100128778";
    } else {
      if (!interaction.member.roles.cache.has("1196806310524629062")) {
        await interaction.reply({
          content: `🔴 ERROR: This command can only be used by <@&1196806310524629062>.`,
          ephemeral: true,
        });
        return;
      }
      channel = "1186661117146181773";
    }

    const type = interaction.options.getString("type");

    const modal = buildModal(type, subcommand, channel);
    await interaction.showModal(modal);

    function buildModal(type, subcommand, channel) {
      const modal = new ModalBuilder();

      if (subcommand === "executives") {
        if (type === "public") {
          modal
            .setCustomId("coreProposalPublic")
            .setTitle(`PUBLIC EXECUTIVE PROPOSAL`);
        } else {
          modal
            .setCustomId("coreProposalPrivate")
            .setTitle(`PRIVATE EXECUTIVE PROPOSAL`);
        }
      } else {
        if (type === "public") {
          modal
            .setCustomId("coreProposalPublic")
            .setTitle(`PUBLIC DIRECTORS PROPOSAL`);
        } else {
          modal
            .setCustomId("coreProposalPrivate")
            .setTitle(`PRIVATE DIRECTORS PROPOSAL`);
        }
      }

      const firstInput = new TextInputBuilder()
        .setCustomId(`titleInput`)
        .setLabel(`Title`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("The title of your proposal")
        .setMaxLength(100)
        .setRequired(true);

      const secondInput = new TextInputBuilder()
        .setCustomId(`issueInput`)
        .setLabel(`Statement of the Problem`)
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(500)
        .setPlaceholder("The issue you want to address")
        .setRequired(true);

      const thirdInput = new TextInputBuilder()
        .setCustomId(`abstractInput`)
        .setLabel(`Proposed Solution`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("The abstract/content of your proposal.")
        .setRequired(true);

      const fourthInput = new TextInputBuilder()
        .setCustomId(`channelInput`)
        .setLabel(`Channel (DO NOT CHANGE)`)
        .setStyle(TextInputStyle.Short)
        .setValue(channel)
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
      const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);
      const fourthActionRow = new ActionRowBuilder().addComponents(fourthInput);

      modal.addComponents(
        firstActionRow,
        secondActionRow,
        thirdActionRow,
        fourthActionRow
      );

      return modal;
    }
  },
};
