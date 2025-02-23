const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: {
    name: "editCorrectiveActionModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
      .setDescription(`### Corrective Action Edited!`)
      .setColor("Blurple");

    await interaction.editReply({
      embeds: [replyEmbed],
      flags: MessageFlags.Ephemeral,
    });
  },
};
