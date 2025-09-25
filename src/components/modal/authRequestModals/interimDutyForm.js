const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: "interimDutyFormModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    const replyEmbed = new EmbedBuilder();

    const dateInput = interaction.fields.getTextInputValue("dateInput");
    const branchInput = interaction.fields.getTextInputValue("branchInput");
    const shiftCoverageInput =
      interaction.fields.getTextInputValue("shiftCoverageInput");
    const scopeOfWorkIput =
      interaction.fields.getTextInputValue("scopeOfWorkIput");
    const assignedByInput =
      interaction.fields.getTextInputValue("assignedByInput");
    const interactionMember =
      interaction.member?.toString() || interaction.user.toString();

    let branchName = branchInput;
    try {
      const category = await interaction.guild.channels.fetch(branchInput);

      if (category && category.type === 4) {
        branchName = category.name;
      } else {
        throw new Error(
          `Category with ID ${branchInput} not found or is not a category`
        );
      }
    } catch (error) {
      console.error(`Error fetching category: ${error.message}`);
      replyEmbed
        .setDescription(
          `🔴 ERROR: Please do not change the branch field unless specified.`
        )
        .setColor("Red");
      return await interaction.editReply({ embeds: [replyEmbed] }).then((msg) =>
        setTimeout(() => {
          msg.delete();
        }, 10000)
      );
    }

    const authRequestEmbed = new EmbedBuilder()
      .setDescription(`## ⌛ INTERIM DUTY FORM`)
      .addFields([
        {
          name: "Date",
          value: `📆 | ${dateInput}`,
        },
        {
          name: "Branch",
          value: `🛒 | ${branchName}`,
        },
        {
          name: "Shift Coverage",
          value: `⏱️ | ${shiftCoverageInput}`,
        },
        {
          name: "Scope of Work",
          value: `🎯 | ${scopeOfWorkIput}`,
        },
        {
          name: "Employee Name",
          value: `${interactionMember}`,
        },
        {
          name: "Assigned By",
          value: `${assignedByInput}`,
        },
      ])
      // .setFooter({
      //   iconURL: interaction.user.displayAvatarURL(),
      //   text: `Submitted by: ${interactionMember}`,
      // })
      .setColor("#f3ff00"); // f3ff00 when approved

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
