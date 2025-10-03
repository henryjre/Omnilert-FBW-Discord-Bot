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
    name: `shiftExchangeMenu`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const replyEmbed = new EmbedBuilder();

    let messageEmbed = interaction.message.embeds[0];

    if (
      !messageEmbed.data.fields
        .find((f) => f.name === "Assigned Name")
        .value.includes(interaction.user.id)
    ) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this menu.`)
        .setColor("Red");

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    const selectedMember = interaction.values[0];

    messageEmbed.data.fields.find(
      (f) => f.name === "Reliever Name"
    ).value = `<@${selectedMember}>`;

    // const confirmButton = new ButtonBuilder()
    //   .setCustomId("approveReliever")
    //   .setLabel("Approve as Reliever")
    //   .setStyle(ButtonStyle.Success);

    // const buttonRow = new ActionRowBuilder().addComponents(confirmButton);

    const branchField = messageEmbed.data.fields.find(
      (f) => f.name === "Branch"
    );

    const messageComponents = interaction.message.components;

    const buttonRow = messageComponents.find((row) =>
      row.components.some(
        (component) => component.customId === "notifyReliever"
      )
    );

    if (buttonRow && branchField) {
      const confirmButtonIndex = buttonRow.components.findIndex(
        (component) => component.customId === "notifyReliever"
      );

      if (confirmButtonIndex !== -1) {
        buttonRow.components[confirmButtonIndex].data.disabled = false;
      }
    }

    await interaction.message.edit({
      embeds: [messageEmbed],
      components: messageComponents,
    });

    replyEmbed
      .setDescription(`You selected <@${selectedMember}> as the reliever.`)
      .setColor("Grey");

    await interaction.editReply({ embeds: [replyEmbed] });

    return;
  },
};
