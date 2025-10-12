const { SlashCommandBuilder } = require("discord.js");

const auditCompletedChannelId = "1423597979604095046";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("editVnrStatus")
    .setDescription("Edit the status of the violation notice"),
  pushToArray: false,
  async execute(messageEmbed, status, link, client) {
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

    if (vnrStatusField && vnrLinkField) {
      vnrStatusField.value = status || "Undefined Status";
      vnrLinkField.value = link || "No VN link found.";
    } else {
      auditMessageEmbed.data.fields.push(
        {
          name: "\u200b",
          value: "\u200b",
        },
        {
          name: "Violation Notice Link",
          value: link || "No VN link found.",
        },
        {
          name: "Violation Notice Status",
          value: status || "Undefined Status",
        }
      );
    }

    await auditMessage.edit({ embeds: [auditMessageEmbed] });
    return;
  },
};
