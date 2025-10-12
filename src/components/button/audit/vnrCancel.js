const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

const vnrQueueChannelId = "1424950819501113466";

module.exports = {
  data: {
    name: `cancelVnr`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const replyEmbed = new EmbedBuilder();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    if (
      !messageEmbed.data.fields
        .find((f) => f.name === "Requested By")
        .value.includes(interaction.user.id)
    ) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.followUp({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    await editVnrStatus(messageEmbed, "Cancelled", client, "");

    await interaction.channel.delete();
  },
};

async function editVnrStatus(messageEmbed, status, link, client) {
  const auditCompletedChannelId = "1423597979604095046";
  const auditMessageIdField = messageEmbed.data.fields.find(
    (f) => f.name === "Audit Message ID"
  );
  const auditMessageId = auditMessageIdField.value;

  const auditCompletedChannel = client.channels.cache.get(
    auditCompletedChannelId
  );

  const auditMessage = await auditCompletedChannel.messages.fetch(
    auditMessageId
  );

  const auditMessageEmbed = auditMessage.embeds[0];

  const vnrStatusField = auditMessageEmbed.data.fields.find(
    (f) => f.name === "Violation Notice Status"
  );
  const vnrLinkField = auditMessageEmbed.data.fields.find(
    (f) => f.name === "Violation Notice Link"
  );

  if (vnrStatusField) {
    vnrStatusField.value = status;
  } else {
    auditMessageEmbed.data.fields.push({
      name: "Violation Notice Status",
      value: status,
    });
  }

  if (vnrLinkField) {
    vnrLinkField.value = link || "No VN link found.";
  } else {
    auditMessageEmbed.data.fields.push({
      name: "Violation Notice Link",
      value: link || "No VN link found.",
    });
  }

  await auditMessage.edit({ embeds: [auditMessageEmbed] });
  return;
}
