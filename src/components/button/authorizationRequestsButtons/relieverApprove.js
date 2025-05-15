const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
} = require("discord.js");

const hrDepartmentChannel = "1372557527715156049";
const hrRole = "1314815153421680640";

module.exports = {
  data: {
    name: `relieverApprove`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let messageEmbed = interaction.message.embeds[0];

    const ownerField = messageEmbed.data.fields.find(
      (f) => f.name === "Reliever Name"
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

    messageEmbed.data.footer = {
      text: `RELIEVER APPROVED`,
    };

    const hrDepartment = await client.channels.cache.get(hrDepartmentChannel);

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

    await hrDepartment.send({
      content: `<@&${hrRole}>`,
      embeds: [messageEmbed],
      components: [buttonRow],
    });

    await interaction.message.delete();

    replyEmbed
      .setDescription(
        `You have approved the request. Please wait for the approval of the HR Department.`
      )
      .setColor("Green");

    await interaction.editReply({ embeds: [replyEmbed] });
  },
};
