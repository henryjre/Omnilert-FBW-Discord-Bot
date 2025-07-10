const {
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: {
    name: `signatoriesSign`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const replyEmbed = new EmbedBuilder();

    let messageEmbed = interaction.message.embeds[0];
    const messageComponents = interaction.message.components;
    const files = interaction.message.attachments.map((a) => a.url);

    const signingUser = messageEmbed.data.fields.find((f) =>
      f.value.includes("⌛")
    );

    if (signingUser.value.includes("To be signed")) {
      const fieldValue = signingUser.value.split(" - ");

      const roleMention = fieldValue[1];
      const roleId = roleMention.replace(/[<@&>]/g, "");

      if (
        !interaction.guild.members.cache
          .get(interaction.user.id)
          .roles.cache.has(roleId)
      ) {
        replyEmbed
          .setDescription(`🔴 ERROR: You cannot sign this request.`)
          .setColor("Red");

        return await interaction.editReply({ embeds: [replyEmbed] });
      }

      // Sign the request
      const signedUser =
        interaction.member.nickname.replace(/^[🔴🟢]\s*/, "") + " - Signed ✅";
      signingUser.value = signedUser;

      //Find the next user to sign the request
      const next = findNextUser(messageEmbed);

      if (!next.channelId) {
        const lastChannel = interaction.guild.channels.cache.get(
          "1392386510858227884"
        );

        await lastChannel.send({
          embeds: [messageEmbed],
          files: files,
        });

        replyEmbed
          .setDescription(`✅ Request signed successfully.`)
          .setColor("Green");

        await interaction.editReply({ embeds: [replyEmbed] });

        await interaction.message.delete();

        return;
      }

      const channel = interaction.guild.channels.cache.get(next.channelId);

      await channel.send({
        content: `${next.mention}`,
        embeds: [messageEmbed],
        components: messageComponents,
        files: files,
      });
    } else {
      if (!signingUser.value.includes(interaction.user.id)) {
        replyEmbed
          .setDescription(`🔴 ERROR: You cannot sign this request.`)
          .setColor("Red");

        return await interaction.editReply({ embeds: [replyEmbed] });
      }
      // Sign the request
      const signedUser =
        interaction.member.nickname.replace(/^[🔴🟢]\s*/, "") + " - Signed ✅";
      signingUser.value = signedUser;

      //Find the next user to sign the request
      const next = findNextUser(messageEmbed);

      if (!next.channelId) {
        const lastChannel = interaction.guild.channels.cache.get(
          "1392386510858227884"
        );

        await lastChannel.send({
          embeds: [messageEmbed],
          files: files,
        });

        replyEmbed
          .setDescription(`✅ Request signed successfully.`)
          .setColor("Green");

        await interaction.editReply({ embeds: [replyEmbed] });

        await interaction.message.delete();

        return;
      }

      const channel = interaction.guild.channels.cache.get(next.channelId);

      await channel.send({
        content: `${next.mention}`,
        embeds: [messageEmbed],
        components: messageComponents,
        files: files,
      });
    }

    replyEmbed
      .setDescription(`✅ Request signed successfully.`)
      .setColor("Green");

    await interaction.editReply({ embeds: [replyEmbed] });

    await interaction.message.delete();
  },
};

function findNextUser(messageEmbed) {
  const nextUserField = messageEmbed.data.fields.find((f) =>
    f.value.includes("⌛")
  );

  if (!nextUserField) {
    return { channelId: null, mention: null };
  }

  if (nextUserField.value.includes("To be signed")) {
    const fieldValue = nextUserField.value.split(" - ");
    const channelId = fieldValue[0].trim();
    const roleId = fieldValue[1].trim();

    return { channelId: channelId, mention: roleId };
  } else {
    const channelId = "1337029532921888840";
    const employee = nextUserField.value.replace("⌛", "").trim();

    return { channelId: channelId, mention: employee };
  }
}
