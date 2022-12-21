const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("button")
    .setDescription("Returns my button!"),
  async execute(interaction, client) {
    const button = new ButtonBuilder()
      .setCustomId("exampleButton")
      .setLabel(`Click Me!`)
      .setStyle(ButtonStyle.Success);

    await interaction.reply({
      components: [new ActionRowBuilder().addComponents(button)],
    });
  },
};
