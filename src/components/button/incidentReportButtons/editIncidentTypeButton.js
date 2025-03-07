const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: {
    name: `editIncidentTypeButton`,
  },
  async execute(interaction, client) {
    const messageEmbed = interaction.message.embeds[0];
    const ownerField = messageEmbed.data.fields.find(
      (f) => f.name === "Reported By"
    );

    const replyEmbed = new EmbedBuilder();

    if (!ownerField.value.includes(interaction.user.id)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const incidentTypeMenu = new StringSelectMenuBuilder()
      .setCustomId("incidentTypeMenu")
      .setPlaceholder("Select the incident type.")
      .setMinValues(1)
      .setMaxValues(1)
      .setOptions([
        new StringSelectMenuOptionBuilder().setLabel("Loss").setValue("Loss"),
        new StringSelectMenuOptionBuilder().setLabel("Theft").setValue("Theft"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Damage")
          .setValue("Damage"),
      ]);

    const backButton = new ButtonBuilder()
      .setCustomId("incidentBackButton")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary);

    const menuRow = new ActionRowBuilder().addComponents(incidentTypeMenu);
    const buttonRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.update({
      embeds: [messageEmbed],
      components: [menuRow, buttonRow],
    });
  },
};
