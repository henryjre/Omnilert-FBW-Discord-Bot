const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: "coreSuggestionPublic",
  },
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const suggestion = interaction.fields.getTextInputValue("suggestionInput");
    const userId = interaction.fields.getTextInputValue("userId");

    const member = interaction.guild.members.cache.get(userId);
    const author = interaction.guild.members.cache.get(interaction.user.id);

    if (!member) {
      await interaction.editReply({
        content: `🔴 ERROR: No member found. Please try the command again and **do not change** the USER ID input.`,
        ephemeral: true,
      });
      return;
    } else if (!member.roles.cache.has("1185935514042388520")) {
      await interaction.editReply({
        content: `🔴 ERROR: ${member.nickname} is not a <@&1185935514042388520> member.`,
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setDescription(
        `## Suggestion Submitted\nPlease check the <#1186661877900648560> channel to check your suggestion.`
      )
      .setColor("Green");

    const proposalEmbed = new EmbedBuilder()
      .setTitle(`💡 SUGGESTION`)
      .addFields([
        {
          name: "Core Member",
          value: member.nickname,
        },
        {
          name: "Details",
          value: suggestion,
        },
      ])
      .setAuthor({
        name: `${author.nickname}`,
      })
      .setTimestamp(Date.now())
      .setColor("#FFBE41");

    const startVoting = new ButtonBuilder()
      .setCustomId("suggestionReply")
      .setLabel("Reply Suggestion")
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(startVoting);

    await interaction.editReply({
      embeds: [embed],
      ephemeral: true,
    });

    await client.channels.cache.get("1186661877900648560").send({
      content: member.toString(),
      embeds: [proposalEmbed],
      components: [buttonRow],
    });
  },
};
