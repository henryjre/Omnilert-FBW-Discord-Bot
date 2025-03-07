const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
} = require("discord.js");

const logsChannel = "1347592755706200155";

module.exports = {
  data: {
    name: `confirmPenaltyRequest`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let messageEmbed = interaction.message.embeds[0];

    const ownerField = messageEmbed.data.fields.find(
      (f) => f.name === "Notification By"
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

    const destinationChannel = await client.channels.cache.get(logsChannel);

    const confirmButton = new ButtonBuilder()
      .setCustomId("acknowledgePenalty")
      .setLabel("Acknowledge")
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(confirmButton);

    await destinationChannel.send({
      content: ownerField.value,
      embeds: [messageEmbed],
      components: [buttonRow],
    });

    await interaction.message.delete();

    replyEmbed
      .setDescription(
        `You have confirmed the request. The penalized employee shall acknowledge it at ${destinationChannel}.`
      )
      .setColor("Green");

    await interaction.editReply({ embeds: [replyEmbed] });
  },
};
