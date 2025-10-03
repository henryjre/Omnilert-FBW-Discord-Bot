const { EmbedBuilder } = require("discord.js");

module.exports = {
  data: {
    name: "announcementEditModal",
  },
  async execute(interaction, client) {
    const title = interaction.fields.getTextInputValue("titleInput");
    const details = interaction.fields.getTextInputValue("announcementInput");

    await interaction.deferUpdate();

    const announcementEmbed = EmbedBuilder.from(
      interaction.message.embeds[0].data
    );
    announcementEmbed.setDescription(
      `# 📢 ANNOUNCEMENT\n## *${title}*\n\u200b\n${details}\n\u200b`
    );

    await interaction.message.edit({
      embeds: [announcementEmbed],
    });
  },
};
