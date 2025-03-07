const { EmbedBuilder, MessageFlags } = require("discord.js");

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
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferUpdate();

    const message = await interaction.message.channel.messages.fetch(
      interaction.message.id
    );

    const messageEmbed = interaction.message.embeds[0];

    const requestUser = messageEmbed.data.fields[0].value;
    const match = requestUser.match(/<@(\d+)>/);
    const userId = match && match[1];

    let channel;
    if (messageEmbed.data.title.includes("Expense Reimbursement")) {
      channel = "1199308508005408839";
    } else {
      channel = "1199308889242468472";
    }

    const newEmbed = new EmbedBuilder(messageEmbed.data)
      .setColor("Green")
      .setFooter({
        text: "APPROVED",
      });

    await client.channels.cache
      .get(channel)
      .send({
        content: `<@${userId}>`,
        embeds: [newEmbed],
      })
      .then((msg) => {
        message.delete();
        msg.react("✅");
      });
  },
};
