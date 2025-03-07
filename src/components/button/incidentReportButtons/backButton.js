const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: {
    name: `incidentBackButton`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const ownerField = messageEmbed.data.fields.find(
      (f) => f.name === "Reported By"
    );
    const typeField = messageEmbed.data.fields.find(
      (f) => f.name === "Incident Type"
    );
    const proofField = messageEmbed.data.fields.find(
      (f) => f.name === "Images/Video Proof"
    );

    const replyEmbed = new EmbedBuilder();

    if (!ownerField.value.includes(interaction.user.id)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

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

    if (typeField.value === "🗂️ | To be added") {
      confirmIncidentButton.setDisabled(true);
      messageEmbed.data.description = `## PLEASE EDIT INCIDENT TYPE TO CONTINUE`;
    } else if (typeField.value === "🗂️ | Damage") {
      if (!proofField) {
        confirmIncidentButton.setDisabled(true);
        messageEmbed.data.description = `## PLEASE ADD IMAGES/VIDEO PROOF.`;
      } else {
        const proofThread = interaction.guild.channels.cache.get(
          proofField.value
        );
        const threadMessages = await proofThread.messages.fetch({ limit: 100 });
        const mediaMessages = threadMessages.filter((msg) =>
          msg.attachments.some(
            (attachment) =>
              attachment.contentType?.startsWith("image/") ||
              attachment.contentType?.startsWith("video/")
          )
        );

        if (mediaMessages.size > 0) {
          confirmIncidentButton.setDisabled(false);
          messageEmbed.data.description = `## CLICK CONFIRM TO SEND YOUR REPORT TO THE HR DEPARMENT.`;
        } else {
          confirmIncidentButton.setDisabled(true);
          messageEmbed.data.description = `## PLEASE ADD IMAGES/VIDEO PROOF IN ${proofThread}.`;
        }
      }
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

    await interaction.update({
      embeds: [messageEmbed],
      components: [buttonRow1, buttonRow2],
    });
  },
};
