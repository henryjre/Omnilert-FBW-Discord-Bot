const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: {
    name: `incidentTypeMenu`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];
    const messageComponents = interaction.message.components;

    const ownerField = messageEmbed.data.fields.find(
      (f) => f.name === "Reported By"
    );

    const typeField = messageEmbed.data.fields.find(
      (f) => f.name === "Incident Type"
    );

    const replyEmbed = new EmbedBuilder();

    if (!ownerField.value.includes(interaction.user.id)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this menu.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const selectedType = interaction.values[0];
    typeField.value = `🗂️ | ${selectedType}`;

    await interaction.update({
      embeds: [messageEmbed],
      components: messageComponents,
    });
  },
};
