const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `vnrServiceCrewMenu`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const replyEmbed = new EmbedBuilder();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    if (
      !messageEmbed.data.fields
        .find((f) => f.name === "Requested By")
        .value.includes(interaction.user.id)
    ) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this menu.`)
        .setColor("Red");

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    const selectedEmployees = interaction.values;

    const employeesField = messageEmbed.data.fields.find(
      (f) => f.name === "Employees Involved"
    );

    const formattedEmployees = selectedEmployees
      .map((employeeId) => `<@${employeeId}>`)
      .join("\n");

    if (employeesField) {
      employeesField.value = formattedEmployees || "No employees selected";
    } else {
      messageEmbed.data.fields.push({
        name: "Employees Involved",
        value: formattedEmployees || "No employees selected",
      });
    }

    const messageComponents = interaction.message.components;

    if (messageEmbed.data.description) {
      const submitButtonRow = messageComponents.find((row) =>
        row.components.some((component) => component.customId === "submitVnr")
      );

      if (submitButtonRow) {
        const submitButtonIndex = submitButtonRow.components.findIndex(
          (component) => component.customId === "submitVnr"
        );

        if (submitButtonIndex !== -1) {
          submitButtonRow.components[submitButtonIndex].data.disabled = false;
        }
      }
    }

    try {
      await interaction.message.edit({
        embeds: allEmbeds,
        components: messageComponents,
      });
    } catch (error) {
      console.error(error);
    }

    replyEmbed
      .setDescription(`✅ VNR request has been updated.`)
      .setColor("Grey");

    await interaction.editReply({ embeds: [replyEmbed] });
  },
};
