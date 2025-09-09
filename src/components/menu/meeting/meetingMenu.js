const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: {
    name: `meetingMenu`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const replyEmbed = new EmbedBuilder();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const authorField = messageEmbed.data.fields.find(
      (f) => f.name === "Created By"
    );

    if (!authorField.value.includes(interaction.user.id)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this menu.`)
        .setColor("Red");

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    const selectedEmployees = interaction.values;
    const type = messageEmbed.data.description;

    let participantsValues;

    if (selectedEmployees.includes("all_users")) {
      participantsValues = type.includes("Management")
        ? "All management members."
        : "All service crew members.";
    } else if (selectedEmployees.length > 0) {
      participantsValues = "";

      for (const employee of selectedEmployees) {
        participantsValues += `<@${employee}>\n`;
      }
    } else {
      participantsValues = type.includes("Management")
        ? "All management members."
        : "All service crew members.";
    }

    const participantsField = messageEmbed.data.fields.find(
      (f) => f.name === "Participants"
    );

    participantsField.value = participantsValues;

    const messageComponents = interaction.message.components;

    // if (messageEmbed.data.description) {
    //   const submitButtonRow = messageComponents.find((row) =>
    //     row.components.some(
    //       (component) => component.customId === "meetingConfirm"
    //     )
    //   );

    //   if (submitButtonRow) {
    //     const submitButtonIndex = submitButtonRow.components.findIndex(
    //       (component) => component.customId === "meetingConfirm"
    //     );

    //     if (submitButtonIndex !== -1) {
    //       submitButtonRow.components[submitButtonIndex].data.disabled = false;
    //     }
    //   }
    // }

    await interaction.message.edit({
      embeds: allEmbeds,
      components: messageComponents,
    });

    replyEmbed
      .setDescription(`✅ Meeting participants have been updated.`)
      .setColor("Grey");

    await interaction.editReply({ embeds: [replyEmbed] });
  },
};
