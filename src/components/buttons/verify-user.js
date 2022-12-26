module.exports = {
    data: {
      name: `verify-user`,
    },
    async execute(interaction, client) {
      await interaction.reply({
        content: `hello`,
      });
    },
  };