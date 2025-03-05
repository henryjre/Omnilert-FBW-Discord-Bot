const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
  name: "incidentProofUpload",
  async execute(message, thread, client) {
    // Check if message has attachments
    if (message.attachments.size <= 0) return;
    const mediaAttachments = message.attachments.filter(
      (attachment) =>
        attachment.contentType?.startsWith("image/") ||
        attachment.contentType?.startsWith("video/")
    );

    if (mediaAttachments.size <= 0) return;

    const originalMessage = await thread.fetchStarterMessage();

    let messageEmbed = originalMessage.embeds[0];

    const typeField = messageEmbed.data.fields.find((f) =>
      f.name.includes("Incident Type")
    );

    messageEmbed.data.fields.push({
      name: "📸 Images/Video Proof",
      value: thread.id,
    });

    const editIncidentTypeButton = new ButtonBuilder()
      .setCustomId("editIncidentTypeButton")
      .setLabel("Edit Incident Type")
      .setStyle(ButtonStyle.Secondary);
    const addImageProofButton = new ButtonBuilder()
      .setCustomId("addImageProofButton")
      .setLabel("Add Images/Video Proof")
      .setStyle(ButtonStyle.Secondary);
    const confirmIncidentButton = new ButtonBuilder()
      .setCustomId("confirmIncidentButton")
      .setLabel("Confirm")
      .setStyle(ButtonStyle.Success);
    const cancelButton = new ButtonBuilder()
      .setCustomId("cancelAuthRequest")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger);

    if (typeField.value === "To be added") {
      confirmIncidentButton.setDisabled(true);
      messageEmbed.data.description = `## PLEASE EDIT INCIDENT TYPE TO CONTINUE`;
    } else {
      confirmIncidentButton.setDisabled(false);
      messageEmbed.data.description = `## CLICK CONFIRM TO SEND YOUR REPORT TO THE HR DEPARMENT.`;
    }

    const buttonRow1 = new ActionRowBuilder().addComponents(
      editIncidentTypeButton,
      addImageProofButton
    );
    const buttonRow2 = new ActionRowBuilder().addComponents(
      confirmIncidentButton,
      cancelButton
    );

    await originalMessage.edit({
      embeds: [messageEmbed],
      components: [buttonRow1, buttonRow2],
    });
  },
};
