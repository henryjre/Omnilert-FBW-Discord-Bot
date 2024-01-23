const { EmbedBuilder } = require("discord.js");

module.exports = {
  data: {
    name: `financeRequestReject`,
  },
  async execute(interaction, client) {
    const interactionMember = interaction.guild.members.cache.get(
      interaction.user.id
    );
    if (!interactionMember.roles.cache.has("1174612428206641182")) {
      await interaction.reply({
        content: `You cannot reject this request.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const message = await interaction.message.channel.messages.fetch(
      interaction.message.id
    );

    await message.delete();
    interaction.followUp({
      content: "Request rejected.",
      ephemeral: true,
    });
  },
};
