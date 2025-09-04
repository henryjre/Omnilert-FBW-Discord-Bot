const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: {
    name: "attendanceTardinessModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const tardinessReasonInput = interaction.fields.getTextInputValue(
      "tardinessReasonInput"
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

    const tardinessReasonField = originalEmbed.fields.find(
      (field) => field.name === "Tardiness Reason"
    );

    if (!tardinessReasonField) {
      originalEmbed.fields.push({
        name: "Tardiness Reason",
        value: `❓ | ${tardinessReasonInput}`,
      });
    } else {
      tardinessReasonField.value = `❓ | ${tardinessReasonInput}`;
    }

    const submit = new ButtonBuilder()
      .setCustomId("attendanceLogSubmit")
      .setLabel("Submit")
      .setDisabled(false)
      .setStyle(ButtonStyle.Success);

    const addReason = new ButtonBuilder()
      .setCustomId("tardinessAddReason")
      .setLabel("Change Reason")
      .setStyle(ButtonStyle.Primary);

    const tardinessButtons = new ActionRowBuilder().addComponents(
      submit,
      addReason
    );

    replyEmbed
      .setDescription("✅ Successfully updated the tardiness reason.")
      .setColor("Green");

    await originalMessage.edit({
      embeds: [originalEmbed],
      components: [tardinessButtons],
    });

    await interaction.editReply({
      embeds: [replyEmbed],
    });
  },
};
