const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: {
    name: "editCorrectiveActionModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    const modalInput = interaction.fields.getTextInputValue(
      "correctiveActionInput"
    );

    let messageEmbed = interaction.message.embeds[0];

    messageEmbed.data.fields[3].value = modalInput;
    messageEmbed.data.color = 5793266;

    await interaction.message.edit({
      embeds: [messageEmbed],
      //   components: [messageComponents],
    });

    const replyEmbed = new EmbedBuilder()
      .setDescription(
        `## 🔔 UPDATE\n> **${
          interaction.member?.nickname.replace(/^[🔴🟢]\s*/, "") ||
          interaction.user.globalName
        }** added the following corrective actions:\n\n*${modalInput}*`
      )
      .setColor("Yellow");

    await interaction.editReply({
      embeds: [replyEmbed],
    });
  },
};
