const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: "shiftExchangeRequestModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    const replyEmbed = new EmbedBuilder();

    const dateInput = interaction.fields.getTextInputValue("dateInput");
    const shiftInput = interaction.fields.getTextInputValue("shiftInput");

    const interactionMember =
      interaction.member?.toString() || interaction.user.toString();

    const authRequestEmbed = new EmbedBuilder()
      .setDescription(`## 🔄 SHIFT EXCHANGE REQUEST`)
      .addFields([
        {
          name: "Date",
          value: `📆 | ${dateInput}`,
        },
        {
          name: "Shift Coverage",
          value: `⏱️ | ${shiftInput}`,
        },
        {
          name: "Assigned Name",
          value: `${interactionMember}`,
        },
        {
          name: "Reliever Name",
          value: `*Please select a reliever from the menu below.*`,
        },
      ])
      //   .setFooter({
      //     iconURL: interaction.user.displayAvatarURL(),
      //     text: `Submitted by: ${interactionMember}`,
      //   })
      .setColor("#1000ff"); // 1000ff when approved

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

    const branchMenuRow = new ActionRowBuilder().addComponents(branchMenu);

    const confirmButton = new ButtonBuilder()
      .setCustomId("notifyReliever")
      .setLabel("Notify Reliever")
      .setDisabled(true)
      .setStyle(ButtonStyle.Primary);
    const cancelButton = new ButtonBuilder()
      .setCustomId("cancelAuthRequest")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(
      confirmButton,
      cancelButton
    );

    const serviceCrewRole = await interaction.guild.roles.cache.get(
      "1314413960274907238"
    );

    const membersWithRoles = await serviceCrewRole.members.map((m) => {
      const name = m.nickname.replace(/^[🔴🟢]\s*/, "") || m.user.username;
      return new StringSelectMenuOptionBuilder()
        .setLabel(name)
        .setValue(m.user.id);
    });

    const userMenu = new StringSelectMenuBuilder()
      .setCustomId("shiftExchangeMenu")
      .setOptions(membersWithRoles)
      .setPlaceholder("Select a reliever.");

    const menuRow = new ActionRowBuilder().addComponents(userMenu);

    await interaction.editReply({
      embeds: [authRequestEmbed],
      components: [buttonRow, menuRow, branchMenuRow],
    });
  },
};
