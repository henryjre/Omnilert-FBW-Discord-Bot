const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  MessageFlags,
  UserSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `managementUserMenu`,
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    let messageEmbed = interaction.message.embeds[0];

    const selectedMember = interaction.values[0];

    messageEmbed.data.fields[0].value = selectedMember;

    await interaction.message.edit({ embeds: [messageEmbed] });

    const replyEmbed = new EmbedBuilder()
      .setDescription(
        `## 🔔 UPDATE\n> **${
          interaction.member?.nickname || interaction.user.globalName
        }** changed the Case Leader to **${selectedMember}**.`
      )
      .setColor("Yellow");

    await interaction.editReply({ embeds: [replyEmbed] });

    return;
  },
};
