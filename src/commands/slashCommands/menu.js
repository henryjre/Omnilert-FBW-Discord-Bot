const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("menu")
    .setDescription("Returns my button!"),
  async execute(interaction, client) {
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("exampleMenu")
        .setPlaceholder("Nothing selected")
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions([
          {
            label: "Select me",
            description: "This is a description",
            value: "youtube.com",
          },
          {
            label: "You can select me too",
            description: "This is also a description",
            value: "second_option",
          },
          {
            label: "I am also an option",
            description: "This is a description as well",
            value: "third_option",
          },
        ])
    );

    await interaction.reply({ components: [row] });
  },
};
