const hrRole = '1314815153421680640';

const techRole = '1314815091908022373';

module.exports = {
  data: {
    name: `requestHelpButton`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    await interaction.channel.send({
      content: `## ASSISTANCE REQUESTED\n<@&${techRole}> <@&${hrRole}>`,
    });
  },
};
