const { MessageFlags, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  data: {
    name: `addImageProofButton`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let messageEmbed = interaction.message.embeds[0];
    const ownerField = messageEmbed.data.fields.find((f) => f.name === 'Reported By');

    const replyEmbed = new EmbedBuilder();

    if (!ownerField.value.includes(interaction.user.id)) {
      replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');

      return await interaction.editReply({
        embeds: [replyEmbed],
      });
    }

    const existingThread = interaction.channel.threads.cache.find((t) =>
      t.name.includes(`Proof Upload - ${interaction.message.id}`)
    );

    if (existingThread) {
      return await existingThread.send({
        content: `📸 **${interaction.user.toString()}, please upload the images or videos here as proof.**`,
      });
    }

    const thread = await interaction.message.startThread({
      name: `Proof Upload - ${interaction.message.id}`,
      autoArchiveDuration: 60, // Archive after 1 hour
      type: ChannelType.PrivateThread, // Set to 'GuildPrivateThread' if only the user should see it
    });

    await interaction.message.edit({ embeds: [messageEmbed] });

    await thread.send({
      content: `📸 **${interaction.user.toString()}, please upload the images or videos here as proof.**`,
    });

    replyEmbed
      .setDescription(`Please go to ${thread} and upload your image/video proof.`)
      .setColor('Green');

    return await interaction.editReply({
      embeds: [replyEmbed],
    });
  },
};
