const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vote")
    .setDescription(
      "Start a voting session for the voting rights of a core member."
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The core member to be voted.")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const validRoles = ["1185935514042388520"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1185935514042388520>.`,
        ephemeral: true,
      });
      return;
    }

    const user = interaction.options.getUser("user");
    const member = interaction.guild.members.cache.get(user.id);

    if (!member.roles.cache.has("1185935514042388520")) {
      await interaction.reply({
        content: `🔴 ERROR: ${member.nickname} is not a <@&1185935514042388520> member.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const upvote = new ButtonBuilder()
      .setCustomId("votingRightsUpvote")
      .setLabel("Upvote")
      .setStyle(ButtonStyle.Success);

    const downvote = new ButtonBuilder()
      .setCustomId("votingRightsDownvote")
      .setLabel("Downvote")
      .setStyle(ButtonStyle.Danger);

    const closeVote = new ButtonBuilder()
      .setCustomId("votingRightsClose")
      .setLabel("Close Voting")
      .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(
      upvote,
      downvote,
      closeVote
    );

    const votingRightsEmbed = new EmbedBuilder()
      .setTitle(`🗳️ VOTING RIGHTS`)
      .addFields([
        {
          name: "Core Member",
          value: member.toString(),
        },
      ])
      .setTimestamp(Date.now())
      .setColor("Blurple");

    await interaction.editReply({
      embeds: [votingRightsEmbed],
      components: [buttonRow],
    });
  },
};
