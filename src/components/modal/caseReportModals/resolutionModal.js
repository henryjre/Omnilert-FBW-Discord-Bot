const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: {
    name: "editResolutionModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    const modalInput = interaction.fields.getTextInputValue("resolutionInput");

    let messageEmbed = interaction.message.embeds[0];

    messageEmbed.data.fields[4].value = modalInput;
    messageEmbed.data.color = 5763719;

    await interaction.message.edit({
      embeds: [messageEmbed],
      //   components: [messageComponents],
    });

    const replyEmbed = new EmbedBuilder()
      .setDescription(
        `## 🔔 UPDATE\n> **${
          interaction.member?.nickname || interaction.user.username
        }** added the following resolution:\n\n*${modalInput}*`
      )
      .setColor("Yellow");

    await interaction.editReply({
      embeds: [replyEmbed],
      flags: MessageFlags.Ephemeral,
    });
  },
};
