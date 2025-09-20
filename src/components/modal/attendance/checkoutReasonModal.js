const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: {
    name: "checkoutReasonModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const checkoutReasonInput = interaction.fields.getTextInputValue(
      "checkoutReasonInput"
    );
    const messageId = interaction.fields.getTextInputValue("messageId");

    // Find the original message using the messageId
    const originalMessage = await interaction.channel.messages
      .fetch(messageId)
      .catch((error) => {
        console.error("Error fetching message:", error);
        return null;
      });

    const replyEmbed = new EmbedBuilder();

    if (!originalMessage) {
      replyEmbed
        .setDescription(
          "🔴 Error: Could not find the original message. Please do not change the Message ID field."
        )
        .setColor("Red");

      await interaction.editReply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Extract date and branch information from the original message embed
    const originalEmbed = originalMessage.embeds[0];

    const checkoutReasonField = originalEmbed.data.fields.find(
      (field) => field.name === "Reason for Checkout"
    );

    if (!checkoutReasonField) {
      originalEmbed.data.fields.push({
        name: "Reason for Checkout",
        value: `❓ | ${checkoutReasonInput}`,
      });
    } else {
      checkoutReasonField.value = `❓ | ${checkoutReasonInput}`;
    }

    originalEmbed.data.color = 5763719;

    replyEmbed
      .setDescription("✅ Successfully added reason.")
      .setColor("Green");

    await originalMessage.edit({
      embeds: [originalEmbed],
      components: [],
    });

    await interaction.editReply({
      embeds: [replyEmbed],
    });
  },
};
