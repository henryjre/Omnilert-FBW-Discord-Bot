const { handleDepartmentVoiceUpdateMessage } = require('../../utils/departmentVoiceUtils');
const { scheduleDepartmentVoiceSessionJobs } = require('../../queue/departmentVoiceQueue');

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot) {
      return;
    }
    if (message.member.roles.cache.has("1117791688832860182")) {
      return;
    }

    if (
      message.content === "betlog" &&
      message.author.id === "748568303219245117"
    ) {
      return await client.commands
        .get("welcome_message")
        .execute(message, client);
    }

    // if (process.env.node_env === "dev") return;

    const thread = message.guild.channels.cache.find(
      (channel) => channel.isThread() && channel.id === message.channel.id
    );

    if (thread) {
      await handleDepartmentVoiceUpdateMessage(message, scheduleDepartmentVoiceSessionJobs);

      if (thread.name.includes("Proof Upload")) {
        return await client.events
          .get("incidentProofUpload")
          .execute(message, thread, client);
      }

      const proofTypes = [
        "Discount Proof",
        "Receipt Proof",
        "Token Pay Proof",
        "PCF Breakdown Proof",
        "CF Breakdown Proof",
        "Cash Out Proof",
        "Cash In Proof",
        "PCF Report Proof",
      ];

      if (proofTypes.some((type) => thread.name.includes(type))) {
        return await client.events
          .get("orderDiscountProof")
          .execute(message, thread, client);
      }

      if (thread.name.includes("ISPE Receipts Proof")) {
        return await client.events
          .get("ispeOrderProof")
          .execute(message, thread, client);
      }

      const pdfImageProofTypes = [
        "Signatories Request",
        "Violation Notice Issuance",
      ];

      if (pdfImageProofTypes.some((type) => thread.name.includes(type))) {
        return await client.events
          .get("signatoriesRequestAttachment")
          .execute(message, thread, client);
      }

      if (thread.name.includes("Portal Announcement Upload -")) {
        return await client.events
          .get("portalAnnouncementAttachmentAdd")
          .execute(message, thread, client);
      }

      if (thread.name.includes("Announcement Attachment Upload -")) {
        return await client.events
          .get("announcementAttachmentAdd")
          .execute(message, thread, client);
      }
    }
  },
};
