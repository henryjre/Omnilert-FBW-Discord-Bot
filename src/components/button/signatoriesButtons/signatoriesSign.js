const { EmbedBuilder, MessageFlags } = require("discord.js");

const management = require("../../../config/management.json");

module.exports = {
  data: {
    name: `signatoriesSign`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const replyEmbed = new EmbedBuilder();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const messageComponents = interaction.message.components;
    const files = interaction.message.attachments.map((a) => a.url);

    const signingUser = messageEmbed.data.fields.find((f) =>
      f.value.includes("⌛")
    );

    if (signingUser.value.includes("To be signed")) {
      const departmentName = signingUser.name;

      const department = management.find((d) => d.name === departmentName);
      const roleId = department.role;

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

        messageEmbed.data.footer.text = `This request has been signed by all parties concerned.`;

        await lastChannel.send({
          embeds: allEmbeds,
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
        embeds: allEmbeds,
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

        messageEmbed.data.footer.text = `This request has been signed by all parties concerned.`;

        await lastChannel.send({
          embeds: allEmbeds,
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
        embeds: allEmbeds,
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
    const departmentName = nextUserField.name;
    const department = management.find((d) => d.name === departmentName);
    const roleId = `<@&${department.role}>`;

    const channelId = department.officeChannelId;

    return { channelId: channelId, mention: roleId };
  } else {
    const channelId = "1337029532921888840";
    const employee = nextUserField.value.replace("⌛", "").trim();

    return { channelId: channelId, mention: employee };
  }
}
