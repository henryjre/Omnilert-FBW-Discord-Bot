const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("open")
    .setDescription("Open something...")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("purchase-requisition")
        .setDescription("Open a purchase requisition.")
    ),
  async execute(interaction, client) {
    const interactionMember = await interaction.guild.members.cache.get(
      interaction.user.id
    );
    if (!interactionMember.roles.cache.has("1185935514042388520")) {
      await interaction.reply({
        content: "🔴 ERROR: You cannot use this command.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "purchase-requisition":
        await purchaseRequisitionCommand(interaction, client);
        break;

      default:
        await interaction.reply({
          content: "🔴 ERROR: No subcommand.",
          ephemeral: true,
        });
        break;
    }
  },
};

async function purchaseRequisitionCommand(interaction, client) {
  const modal = new ModalBuilder();
  modal
    .setCustomId("purchaseRequisitionOpen")
    .setTitle(`Open a purchase requisition.`);

  const link = new TextInputBuilder()
    .setCustomId(`linkInput`)
    .setLabel(`Google Drive Link`)
    .setPlaceholder("The GDrive link for the PR files.")
    .setMaxLength(100)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const addon = new TextInputBuilder()
    .setCustomId(`addonInput`)
    .setLabel(`Additional Details (OPTIONAL)`)
    .setPlaceholder("Optional message for this purchase requisition.")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  const firstRow = new ActionRowBuilder().addComponents(link);
  const secondRow = new ActionRowBuilder().addComponents(addon);
  modal.addComponents(firstRow, secondRow);

  interaction.showModal(modal);
}
