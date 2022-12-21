module.exports = {
  data: {
    name: `exampleMenu`,
  },
  async execute(interaction, client) {
    await interaction.reply({
      content: `You select: ${interaction.values[0]}`,
    });
  },
};
