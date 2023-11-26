const { EmbedBuilder } = require("discord.js");

module.exports = {
  data: {
    name: `cancelWithdrawal`,
  },
  async execute(interaction, client) {
    if (interaction.user.id !== interaction.message.interaction.user.id) {
      await interaction.reply({
        content: "You cannot use this button.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const claimedEmbed = new EmbedBuilder()
      .setTitle(`WITHDRAWAL CANCELLED`)
      .setColor("Red")
      .setDescription(
        `🚫 ${interaction.user.globalName} cancelled the withdrawal.`
      )
      .setTimestamp(Date.now());

    await interaction.editReply({
      embeds: [claimedEmbed],
      components: [],
    });
  },
};
