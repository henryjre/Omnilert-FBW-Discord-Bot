const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
} = require("discord.js");

const ehChannel = "1342837500116336823";
const ehRole = "1314414836926386257";

module.exports = {
  data: {
    name: `confirmFinanceRequest`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let messageEmbed = interaction.message.embeds[0];

    const ownerField = messageEmbed.data.fields.find(
      (f) =>
        f.name === "Assigned Name" ||
        f.name === "Employee Name" ||
        f.name === "Requested By"
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

    const departmentChannel = await client.channels.cache.get(ehChannel);

    const confirmButton = new ButtonBuilder()
      .setCustomId("approveAuthorization")
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success);

    const rejectButton = new ButtonBuilder()
      .setCustomId("rejectAuthorization")
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(
      confirmButton,
      rejectButton
    );

    await departmentChannel.send({
      content: `<@&${ehRole}>`,
      embeds: [messageEmbed],
      components: [buttonRow],
    });

    await interaction.message.delete();

    replyEmbed
      .setDescription(
        `You have confirmed the request. Please wait for the approval of the Executive Head.`
      )
      .setColor("Green");

    await interaction.editReply({ embeds: [replyEmbed] });
  },
};
