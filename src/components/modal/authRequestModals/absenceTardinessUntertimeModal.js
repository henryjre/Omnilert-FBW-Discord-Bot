const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const mType = [
  {
    name: "absence",
    title: "🤧 ABSENCE AUTHORIZATION REQUEST",
    color: "#08ff00",
  },
  {
    name: "tardiness",
    title: "⏰ TARDINESS AUTHORIZATION REQUEST",
    color: "#00fffd",
  },
  {
    name: "undertime",
    title: "🕧 UNDERTIME AUTHORIZATION REQUEST",
    color: "#a600ff",
  },
];

module.exports = {
  data: {
    name: "authRequestModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    const dateInput = interaction.fields.getTextInputValue("dateInput");
    const branchInput = interaction.fields.getTextInputValue("branchInput");
    const shiftInput = interaction.fields.getTextInputValue("shiftInput");
    const reasonInput = interaction.fields.getTextInputValue("reasonInput");
    const type = interaction.fields.getTextInputValue("type");

    if (!["absence", "tardiness", "undertime"].includes(type)) {
      const replyEmbed = new EmbedBuilder()
        .setDescription(
          `🔴 ERROR: Please do not change the type field when submitting the form.`
        )
        .setColor("Red");
      return await interaction.editReply({ embeds: [replyEmbed] }).then((msg) =>
        setTimeout(() => {
          msg.delete();
        }, 10000)
      );
    }

    const interactionMember =
      interaction.member?.toString() || interaction.user.toString();
    const modalType = mType.find((t) => t.name === type);

    const authRequestEmbed = new EmbedBuilder()
      .setDescription(`## ${modalType.title}`)
      .addFields([
        {
          name: "Date",
          value: `📆 | ${dateInput}`,
        },
        {
          name: "Branch",
          value: `🛒 | ${branchInput}`,
        },
        {
          name: "Shift",
          value: `⏱️ | ${shiftInput}`,
        },
        {
          name: "Employee Name",
          value: `${interactionMember}`,
        },
        {
          name: "Reason",
          value: `${reasonInput}`,
        },
      ])
      // .setFooter({
      //   iconURL: interaction.user.displayAvatarURL(),
      //   text: `Submitted by: ${interactionMember}`,
      // })
      .setColor(modalType.color);

    const confirmButton = new ButtonBuilder()
      .setCustomId("confirmAuthRequest")
      .setLabel("Confirm")
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
      components: [buttonRow],
    });
  },
};
