module.exports = {
  data: {
    name: `announcementSubmit`,
  },
  async execute(interaction, client) {
    const messageEmbed = interaction.message.embeds[0];
    if (!messageEmbed.data.fields[0].value.includes(interaction.user.id)) {
      await interaction.reply({
        content: `You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    let mentions;
    if (messageEmbed.data.fields[1]) {
      mentions = messageEmbed.data.fields[1].value.replace("\n", " ");
    } else {
      if (messageEmbed.data.color === 15277667) {
        mentions = `<@&1185935514042388520>`;
      } else {
        mentions = `<@&1196806310524629062>`;
      }
    }

    const message = await interaction.message.channel.messages.fetch(
      interaction.message.id
    );

    const executiveRole = await interaction.guild.roles.cache.get(
      "1185935514042388520"
    );

    let channel;
    if (messageEmbed.data.color === executiveRole.color) {
      channel = "1197101506638381188";
    } else {
      channel = "1197101565421568082";
    }

    await client.channels.cache
      .get(channel)
      .send({
        content: mentions,
        embeds: [messageEmbed.data],
      })
      .then((msg) => {
        message.delete();
      });
  },
};
