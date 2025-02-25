const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10);

const nameArray = require("./filipinoNames.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cashback")
    .setDescription("Claim a fake cashback."),

  async execute(interaction, client) {
    const validRoles = ["1177271188997804123"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1177271188997804123>.`,
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId("fakeCashback")
      .setTitle(`Fake Cashback Claim`);

    const reward = Math.floor(Math.random() * (10000 - 500 + 1)) + 500;

    const randomIndex = Math.floor(Math.random() * nameArray.length);
    const name = nameArray[randomIndex];

    const firstInput = new TextInputBuilder()
      .setCustomId(`idInput`)
      .setLabel(`Cashback ID`)
      .setStyle(TextInputStyle.Short)
      .setValue(nanoid())
      .setMinLength(10)
      .setMaxLength(10)
      .setRequired(true);

    const secondInput = new TextInputBuilder()
      .setCustomId(`nameInput`)
      .setLabel(`Name`)
      .setStyle(TextInputStyle.Short)
      .setValue(name)
      .setRequired(true);

    const thirdInput = new TextInputBuilder()
      .setCustomId(`amountInput`)
      .setLabel(`Amount (₱)`)
      .setStyle(TextInputStyle.Short)
      .setValue(String(reward))
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
    const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

    await interaction.showModal(modal);
  },
};
