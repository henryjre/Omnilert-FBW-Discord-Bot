const { MessageFlags, EmbedBuilder } = require("discord.js");

module.exports = {
  data: {
    name: `thread_unlock`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const replyEmbed = new EmbedBuilder();

    const permittedField = messageEmbed.data.fields.find(
      (f) => f.name === "Locked By"
    );

    if (!permittedField.value.includes(interaction.user.id)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await interaction.deferUpdate();

      // Unlock and unarchive the thread
      await interaction.channel.setLocked(false);
      await interaction.channel.setArchived(false);

      // Create success embed for ephemeral reply
      const successEmbed = new EmbedBuilder()
        .setDescription("✅ Thread has been successfully unlocked.")
        .setColor("Green");

      // Send ephemeral success message to the user
      await interaction.followUp({
        embeds: [successEmbed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      // Create error embed for any issues during thread unlocking
      const errorEmbed = new EmbedBuilder()
        .setDescription(`🔴 ERROR: Failed to unlock thread. ${error.message}`)
        .setColor("Red");

      // Reply with error message
      await interaction.followUp({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });

      // Log the error for debugging
      console.error("Error unlocking thread:", error);
    }
  },
};
