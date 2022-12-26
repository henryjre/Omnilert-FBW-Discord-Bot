module.exports = {
  data: {
    name: `exampleButton`,
  },
  async execute(interaction, client) {

    console.log(interaction.message.embeds[0].data.fields[0])
    await interaction.reply({
      content: `hello`,
    });
  },
};
