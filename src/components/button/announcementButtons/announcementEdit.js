const {
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `announcementEdittt`,
  },
  async execute(interaction, client) {
    const messageEmbed = interaction.message.embeds[0];

    const ownerField = messageEmbed.data.fields.find(
      (f) => f.name === "Prepared By"
    );

    if (!ownerField.value.includes(interaction.user.id)) {
      const replyEmbed = new EmbedBuilder()
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [replyEmbed],
      });
    }

    const description = messageEmbed.data.description;

    console.log(description);

    const regex = /## \*(.*?)\*[\s\S]*?\u200b\n(.*?)\n\u200b/;
    const match = description.match(regex);

    console.log(match);

    let title = "";
    let details = "";

    if (match) {
      title = match[1];
      details = match[2];
    }

    const modal = new ModalBuilder().setCustomId("announcementEditModal");

    modal.setTitle(`Edit the announcement`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`titleInput`)
      .setLabel(`Title`)
      .setStyle(TextInputStyle.Short)
      .setValue(title)
      .setPlaceholder("The title of your announcement")
      .setRequired(true);

    const secondInput = new TextInputBuilder()
      .setCustomId(`announcementInput`)
      .setLabel(`Announcement Details`)
      .setStyle(TextInputStyle.Paragraph)
      .setValue(details)
      .setPlaceholder("The details of your announcement.")
      .setMaxLength(4000)
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
    const secondActionRow = new ActionRowBuilder().addComponents(secondInput);

    modal.addComponents(firstActionRow, secondActionRow);

    await interaction.showModal(modal);
  },
};
