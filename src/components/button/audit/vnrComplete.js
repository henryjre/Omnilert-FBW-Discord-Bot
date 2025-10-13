const {
  ActionRowBuilder,
  MessageFlags,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const vnrCompletedChannelId = "1424951554204635237";

module.exports = {
  data: {
    name: `vnrCompleted`,
  },
  async execute(interaction, client) {
    const mentionedUser = interaction.message.mentions?.users?.first() || null;
    const mentionedRole = interaction.message.mentions?.roles?.first() || null;

    if (mentionedUser) {
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;
      if (isNotMentionedUser) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (mentionedRole) {
      const doesNotHaveRole = !interaction.member.roles.cache.has(
        mentionedRole.id
      );
      if (doesNotHaveRole) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const confirmedBy =
      interaction.member.nickname.replace(/^[🔴🟢]\s*/, "") ||
      interaction.user.username;

    const allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const messageAttachments = interaction.message.attachments.map(
      (a) => a.url
    );

    const vnrCompletedChannel = await client.channels.cache.get(
      vnrCompletedChannelId
    );

    messageEmbed.data.footer.text += `\nCompleted By: ${confirmedBy}`;
    messageEmbed.data.fields.push({
      name: "Disciplinary Meeting Thread",
      value: interaction.channel.toString(),
    });

    const vnrThreadMessage = await vnrCompletedChannel.send({
      embeds: allEmbeds,
      files: messageAttachments,
    });

    await client.commands
      .get("edit_vnr_status")
      .execute(messageEmbed, "✅ Completed", vnrThreadMessage.url, client);

    const replyEmbed = new EmbedBuilder()
      .setDescription(`✅ VN has been completed.`)
      .setColor("Green");

    await interaction.message.edit({
      content: "",
      components: [],
    });

    await interaction.editReply({
      embeds: [replyEmbed],
    });

    if (interaction.channel.isThread()) {
      try {
        // Delete the starter message first
        const starterMessage = await interaction.channel.fetchStarterMessage();
        if (starterMessage) {
          await starterMessage.delete();
        }

        await interaction.channel.setArchived(true);
      } catch (threadError) {
        console.log("Error deleting thread or starter message:", threadError);
      }
    }
  },
};
