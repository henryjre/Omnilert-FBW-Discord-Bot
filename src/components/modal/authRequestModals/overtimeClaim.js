const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: "overtimeClaimModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    const replyEmbed = new EmbedBuilder();

    const dateInput = interaction.fields.getTextInputValue("dateInput");
    const overtimePeriodInput = interaction.fields.getTextInputValue(
      "overtimePeriodInput"
    );
    const overtimeHoursInput =
      interaction.fields.getTextInputValue("overtimeHoursInput");
    const reasonInput = interaction.fields.getTextInputValue("reasonInput");
    const interactionMember =
      interaction.member?.toString() || interaction.user.toString();

    const authRequestEmbed = new EmbedBuilder()
      .setDescription(`## 🕙 OVERTIME CLAIM`)
      .addFields([
        {
          name: "Date",
          value: `📆 | ${dateInput}`,
        },
        {
          name: "Shift Coverage",
          value: `🕑 | ${overtimePeriodInput}`,
        },
        {
          name: "Scope of Work",
          value: `⏱️ | ${overtimeHoursInput}`,
        },
        {
          name: "Employee Name",
          value: `${interactionMember}`,
        },
        {
          name: "Assigned By",
          value: `${reasonInput}`,
        },
      ])
      // .setFooter({
      //   iconURL: interaction.user.displayAvatarURL(),
      //   text: `Submitted by: ${interactionMember}`,
      // })
      .setColor("#ff0000"); // ff0000 when approved

    const branchMenu = new StringSelectMenuBuilder()
      .setCustomId("branchMenu")
      .setPlaceholder("Select a branch")
      .addOptions(
        { label: "DHVSU Bacolor", value: "DHVSU Bacolor" },
        { label: "Primark Center Guagua", value: "Primark Center Guagua" },
        {
          label: "Robinsons Starmills CSFP",
          value: "Robinsons Starmills CSFP",
        },
        { label: "JASA Hiway Guagua", value: "JASA Hiway Guagua" }
      )
      .setMinValues(1)
      .setMaxValues(1);

    const menuRow = new ActionRowBuilder().addComponents(branchMenu);

    const confirmButton = new ButtonBuilder()
      .setCustomId("confirmAuthRequest")
      .setLabel("Confirm")
      .setDisabled(true)
      .setStyle(ButtonStyle.Success);
    const cancelButton = new ButtonBuilder()
      .setCustomId("cancelAuthRequest")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(
      confirmButton,
      cancelButton
    );

    await interaction.editReply({
      embeds: [authRequestEmbed],
      components: [menuRow, buttonRow],
    });
  },
};
