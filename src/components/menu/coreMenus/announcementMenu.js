const { ActionRowBuilder } = require("discord.js");

module.exports = {
  data: {
    name: `announcementMenu`,
  },
  async execute(interaction, client) {
    const messageEmbed = interaction.message.embeds[0];

    if (!messageEmbed.data.fields[0].value.includes(interaction.user.id)) {
      await interaction.reply({
        content: `You cannot use this menu.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const acknowledgementEmbed = {
      name: "Acknowledgement",
      value: `${interaction.values.map((id) => `<@${id}>\n`).join("")}`,
    };

    if (messageEmbed.data.fields[2]) {
      messageEmbed.data.fields[2] = acknowledgementEmbed;
    } else {
      messageEmbed.data.fields.push(acknowledgementEmbed);
    }

    await interaction.editReply({ embeds: [messageEmbed] });
  },
};
