const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `cancelAuthRequest`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let messageEmbed = interaction.message.embeds[0];

    const ownerField = messageEmbed.data.fields.find(
      (f) =>
        f.name === "Assigned Name" ||
        f.name === "Employee Name" ||
        f.name.includes("Reported By")
    );

    const replyEmbed = new EmbedBuilder();

    if (!ownerField.value.includes(interaction.user.id)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.editReply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (interaction.message.hasThread) {
      const thread = interaction.message.thread;
      await thread.delete();
    }

    await interaction.message.delete();

    replyEmbed.setDescription(`You cancelled the request.`).setColor("Red");

    await interaction.editReply({ embeds: [replyEmbed] });
  },
};
