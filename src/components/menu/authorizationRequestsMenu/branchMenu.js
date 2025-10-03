const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: {
    name: `branchMenu`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let messageEmbed = interaction.message.embeds[0];

    const ownerFieldNames = [
      "Assigned Name",
      "Employee Name",
      "Notification By",
      "Reported By",
      "Requested By",
      "Submitted By",
    ];

    const ownerField = messageEmbed.data.fields.find((f) =>
      ownerFieldNames.includes(f.name)
    );

    const replyEmbed = new EmbedBuilder();

    if (!ownerField.value.includes(interaction.user.id)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this menu.`)
        .setColor("Red");

      return await interaction.editReply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const selectedBranch = interaction.values[0];

    const branchField = messageEmbed.data.fields.find(
      (f) => f.name === "Branch"
    );

    if (branchField) {
      branchField.value = `🛒 | ${selectedBranch}`;
    } else {
      messageEmbed.data.fields.unshift({
        name: "Branch",
        value: `🛒 | ${selectedBranch}`,
      });
    }

    const messageComponents = interaction.message.components;

    const buttonRow = messageComponents.find((row) =>
      row.components.some(
        (component) => component.customId === "confirmAuthRequest"
      )
    );

    if (buttonRow) {
      const confirmButtonIndex = buttonRow.components.findIndex(
        (component) => component.customId === "confirmAuthRequest"
      );

      if (confirmButtonIndex !== -1) {
        buttonRow.components[confirmButtonIndex].data.disabled = false;
      }
    }

    const shiftExchangeButtonRow = messageComponents.find((row) =>
      row.components.some(
        (component) => component.customId === "notifyReliever"
      )
    );

    const relieverField = messageEmbed.data.fields.find(
      (f) => f.name === "Requested By"
    );

    if (shiftExchangeButtonRow && relieverField) {
      const confirmButtonIndex = shiftExchangeButtonRow.components.findIndex(
        (component) => component.customId === "notifyReliever"
      );

      if (confirmButtonIndex !== -1) {
        shiftExchangeButtonRow.components[
          confirmButtonIndex
        ].data.disabled = false;
      }
    }

    await interaction.message.edit({
      embeds: [messageEmbed],
      components: messageComponents,
    });

    replyEmbed
      .setDescription(`You selected **${selectedBranch}** as the branch.`)
      .setColor("Grey");

    await interaction.editReply({ embeds: [replyEmbed] });

    return;
  },
};
