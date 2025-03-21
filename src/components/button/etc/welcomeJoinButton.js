const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");

const serviceCrewRole = "1314413960274907238";

module.exports = {
  data: {
    name: `welcomeJoinButton`,
  },
  async execute(interaction, client) {
    if (interaction.member.roles.cache.has(serviceCrewRole)) {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this button.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const modal = buildJoinModal();
    await interaction.showModal(modal);
  },
};

function buildJoinModal() {
  const modal = new ModalBuilder()
    .setCustomId("welcomeJoinModal")
    .setTitle(`Join the Omnilert Discord!`);

  const firstInput = new TextInputBuilder()
    .setCustomId(`nameInput`)
    .setLabel(`FULL NAME`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(200)
    .setRequired(true);

  const secondInput = new TextInputBuilder()
    .setCustomId(`emailInput`)
    .setLabel(`ACTIVE EMAIL ADDRESS`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(200)
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
  const secondActionRow = new ActionRowBuilder().addComponents(secondInput);

  modal.addComponents(firstActionRow, secondActionRow);

  return modal;
}
