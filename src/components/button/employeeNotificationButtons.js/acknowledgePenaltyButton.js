const { MessageFlags, EmbedBuilder } = require("discord.js");

module.exports = {
  data: {
    name: `acknowledgePenalty`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let messageEmbed = interaction.message.embeds[0];

    const ownerField = messageEmbed.data.fields.find(
      (f) => f.name === "Penalized Employee"
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

    if (messageEmbed.data.footer) {
      messageEmbed.data.footer.text += `\n\u200b\nNOTIFICATION ACKNOWLEDGED`;
    } else {
      messageEmbed.data.footer = {
        text: `NOTIFICATION ACKNOWLEDGED`,
      };
    }

    messageEmbed.data.color = 5763719;

    await interaction.message.edit({ embeds: [messageEmbed], components: [] });

    replyEmbed
      .setDescription(`You have acknowledged this request`)
      .setColor("Green");

    await interaction.editReply({ embeds: [replyEmbed] });
  },
};
