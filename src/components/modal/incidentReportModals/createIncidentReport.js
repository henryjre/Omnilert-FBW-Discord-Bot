const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: "createIncidentReportModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    const dateInput = interaction.fields.getTextInputValue("dateInput");
    const branchInput = interaction.fields.getTextInputValue("branchInput");
    const assetInput = interaction.fields.getTextInputValue("assetInput");
    const detailsInput = interaction.fields.getTextInputValue("detailsInput");
    const maintenanceRequestInput = interaction.fields.getTextInputValue(
      "maintenanceRequestInput"
    );

    const interactionMember =
      interaction.member?.toString() || interaction.user.toString();

    const embedFields = [
      {
        name: "Date Reported",
        value: `📆 | ${dateInput}`,
      },
      {
        name: "Reported By",
        value: `👤 | ${interactionMember}`,
      },
      {
        name: "Branch",
        value: `🛒 | ${branchInput}`,
      },
      {
        name: "Incident Type",
        value: "🗂️ | To be added",
      },
      {
        name: "Damaged/Lost Asset",
        value: `📦 | ${assetInput}`,
      },
      {
        name: "Incident Details",
        value: `📝 | ${detailsInput}`,
      },
    ];

    if (maintenanceRequestInput) {
      embedFields.push({
        name: "🛠️ Maintenance Request",
        value: maintenanceRequestInput,
      });
    }

    const reportEmbed = new EmbedBuilder()
      .setTitle(`ASSET INCIDENT REPORT`)
      .addFields(embedFields)
      .setDescription(`## PLEASE EDIT INCIDENT TYPE TO CONTINUE`)
      //   .setFooter({
      //     // iconURL: interaction.user.displayAvatarURL(),
      //     text: `PLEASE EDIT TYPE OF INCIDENT TO CONTINUE`,
      //   })
      .setColor("Navy");

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
      .setDisabled(true)
      .setStyle(ButtonStyle.Success);
    const cancelButton = new ButtonBuilder()
      .setCustomId("cancelAuthRequest")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger);

    const buttonRow1 = new ActionRowBuilder().addComponents(
      editIncidentTypeButton,
      addImageProofButton
    );
    const buttonRow2 = new ActionRowBuilder().addComponents(
      confirmIncidentButton,
      cancelButton
    );

    await interaction.editReply({
      embeds: [reportEmbed],
      components: [buttonRow1, buttonRow2],
    });
  },
};
