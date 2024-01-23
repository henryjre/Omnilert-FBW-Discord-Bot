const { EmbedBuilder } = require("discord.js");

module.exports = {
  data: {
    name: `financeRequestApprove`,
  },
  async execute(interaction, client) {
    const interactionMember = interaction.guild.members.cache.get(
      interaction.user.id
    );
    if (!interactionMember.roles.cache.has("1174612428206641182")) {
      await interaction.reply({
        content: `You cannot approve this request.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const message = await interaction.message.channel.messages.fetch(
      interaction.message.id
    );

    const messageEmbed = interaction.message.embeds[0];

    let channel;
    if (messageEmbed.data.title.includes("Expense Reimbursement")) {
      channel = "1199308508005408839";
    } else {
      channel = "1199308889242468472";
    }

    const newEmbed = new EmbedBuilder(messageEmbed.data).setColor("Green");

    await client.channels.cache
      .get(channel)
      .send({
        embeds: [newEmbed],
      })
      .then((msg) => {
        message.delete();
      });
  },
};
