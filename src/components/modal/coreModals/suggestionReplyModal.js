const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: {
    name: "suggestionReplyModal",
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const replyDetails = interaction.fields.getTextInputValue("replyInput");

    const targetUser = interaction.message.mentions.users.first();
    const member = interaction.guild.members.cache.get(targetUser.id);

    let embed = interaction.message.embeds[0];

    embed.data.color = 5793266; //5763720

    const existingReplyIndex = embed.data.fields.findIndex(
      (item) => item.name === `Reply by ${member.nickname}`
    );

    if (existingReplyIndex !== -1) {
      embed.data.fields[existingReplyIndex].value = replyDetails;
    } else {
      embed.data.fields.push({
        name: `Reply by ${member.nickname}`,
        value: replyDetails,
      });
    }

    const editReplyButton = new ButtonBuilder()
      .setCustomId("suggestionReply")
      .setLabel("Edit Reply")
      .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(editReplyButton);

    await interaction.editReply({
      embeds: [embed],
      components: [buttonRow],
    });
  },
};
