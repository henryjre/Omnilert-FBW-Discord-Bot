const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: {
    name: "attendanceInterimModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const shiftCoverageInput =
      interaction.fields.getTextInputValue("shiftCoverageInput");
    const scopeOfWorkIput =
      interaction.fields.getTextInputValue("scopeOfWorkIput");
    const assignedByInput =
      interaction.fields.getTextInputValue("assignedByInput");
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

    const shiftCoverageField = originalEmbed.fields.find(
      (field) => field.name === "Shift Coverage"
    );
    const scopeOfWorkField = originalEmbed.fields.find(
      (field) => field.name === "Scope of Work"
    );
    const assignedByField = originalEmbed.fields.find(
      (field) => field.name === "Assigned By"
    );

    shiftCoverageField.value = `⏱️ | ${shiftCoverageInput}`;
    scopeOfWorkField.value = `🎯 | ${scopeOfWorkIput}`;
    assignedByField.value = `🤝 | ${assignedByInput}`;

    const submit = new ButtonBuilder()
      .setCustomId("attendanceLogSubmit")
      .setLabel("Submit")
      .setDisabled(false)
      .setStyle(ButtonStyle.Success);

    const addDetails = new ButtonBuilder()
      .setCustomId("interimAddDetails")
      .setLabel("Change Details")
      .setStyle(ButtonStyle.Primary);

    const interimButtons = new ActionRowBuilder().addComponents(
      submit,
      addDetails
    );

    replyEmbed
      .setDescription("✅ Successfully updated the interim duty form details.")
      .setColor("Green");

    await originalMessage.edit({
      embeds: [originalEmbed],
      components: [interimButtons],
    });

    await interaction.editReply({
      embeds: [replyEmbed],
    });
  },
};
