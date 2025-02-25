const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `notifyReliever`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let messageEmbed = interaction.message.embeds[0];

    const ownerField = messageEmbed.data.fields.find(
      (f) => f.name === "Assigned Name"
    );

    const replyEmbed = new EmbedBuilder();

    if (!ownerField.value.includes(interaction.user.id)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.editReply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const relieverField = messageEmbed.data.fields.find(
      (f) => f.name === "Reliever Name"
    );

    const confirmButton = new ButtonBuilder()
      .setCustomId("relieverApprove")
      .setLabel("Approve as Reliever")
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(confirmButton);

    await interaction.message.edit({
      content: relieverField.value,
      embeds: [messageEmbed],
      components: [buttonRow],
    });

    replyEmbed
      .setDescription(
        `You have notified the reliever. Please mention ${relieverField.value} and ask for approval.`
      )
      .setColor("Blurple");

    await interaction.editReply({ embeds: [replyEmbed] });
  },
};
