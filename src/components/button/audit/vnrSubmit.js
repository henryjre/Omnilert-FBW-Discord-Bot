const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

const db = require("../../../sqliteConnection.js");

const vnrQueueChannelId = "1424950819501113466";

module.exports = {
  data: {
    name: `submitVnr`,
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

    const vnrQueueChannel = await client.channels.cache.get(vnrQueueChannelId);

    const vnrId = getNextVnrId();
    messageEmbed.data.description += ` | VN-${vnrId}`;

    const confirmVnrButton = new ButtonBuilder()
      .setCustomId("vnrConfirm")
      .setLabel("Confirm VN")
      .setStyle(ButtonStyle.Success);

    const rejectVnrButton = new ButtonBuilder()
      .setCustomId("vnrReject")
      .setLabel("Reject VN")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(
      confirmVnrButton,
      rejectVnrButton
    );

    const vnrQueueMessage = await vnrQueueChannel.send({
      embeds: [messageEmbed],
      components: [buttonRow],
    });

    await editVnrStatus(messageEmbed, "Queued", vnrQueueMessage.url, client);

    const editedEmbed = new EmbedBuilder()
      .setDescription(
        `✅ VNR request has been submitted. Check the <#1424950819501113466> channel to view the request. This thread will be deleted in <t:${
          Math.floor(Date.now() / 1000) + 11
        }:R>`
      )
      .setColor("Grey");

    await interaction.message.edit({
      embeds: [editedEmbed],
      components: [],
    });

    // Set a timeout to delete the thread after 10 seconds
    setTimeout(async () => {
      try {
        // Delete the thread itself first
        await interaction.channel.delete();
      } catch (error) {
        console.error("Error deleting thread:", error);
      }
    }, 10000);
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

function getNextVnrId() {
  const result = db.prepare("INSERT INTO vnr_id_count DEFAULT VALUES").run();
  const id = result.lastInsertRowid;
  return id.toString().padStart(4, "0");
}
