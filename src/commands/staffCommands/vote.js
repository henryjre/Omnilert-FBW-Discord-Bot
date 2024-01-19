const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const pool = require("../../sqlConnectionPool");

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
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("The voting type.")
        .setRequired(true)
        .addChoices(
          { name: "👑 Voting Rights", value: "votingRights" },
          { name: "💸 Performance-Based Rate", value: "pbr" }
        )
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

    const type = interaction.options.getString("type");
    const user = interaction.options.getUser("user");
    const member = interaction.guild.members.cache.get(user.id);

    let validRole, error;
    if (type === "votingRights") {
      validRole = "1196806310524629062";
      error = `🔴 ERROR: ${member.nickname} is not a <@&${validRole}>.`;
    } else {
      validRole = "1185935514042388520";
      error = `🔴 ERROR: ${member.nickname} is not an <@&${validRole}>.`;
    }

    if (!member.roles.cache.has(validRole)) {
      await interaction.reply({
        content: error,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const buttonRow = new ActionRowBuilder();

    if (type === "votingRights") {
      const upvote = new ButtonBuilder()
        .setCustomId("votingRightsUpvote")
        .setLabel("Upvote")
        .setStyle(ButtonStyle.Success);

      const downvote = new ButtonBuilder()
        .setCustomId("votingRightsDownvote")
        .setLabel("Downvote")
        .setStyle(ButtonStyle.Danger);

      const abstain = new ButtonBuilder()
        .setCustomId("votingRightsAbstain")
        .setLabel("Abstain")
        .setStyle(ButtonStyle.Secondary);

      buttonRow.addComponents(upvote, downvote, abstain);
    } else {
      const pbrButton = new ButtonBuilder()
        .setCustomId("votingPbrButton")
        .setLabel("Submit PBR")
        .setStyle(ButtonStyle.Success);

      buttonRow.addComponents(pbrButton);
    }

    const closeVote = new ButtonBuilder()
      .setCustomId("votingRightsClose")
      .setLabel("Close Voting")
      .setStyle(ButtonStyle.Primary);

    buttonRow.addComponents(closeVote);

    const votingRightsEmbed = new EmbedBuilder().setTimestamp(Date.now());

    if (type === "votingRights") {
      votingRightsEmbed
        .setTitle(`🗳️ VOTING RIGHTS`)
        .addFields([
          {
            name: "Member",
            value: member.toString(),
          },
          {
            name: "Number of Votes",
            value: "0",
          },
        ])
        .setColor("Blurple");
    } else {
      const connection = await pool
        .getConnection()
        .catch((err) => console.log(err));

      const selectQuery = "SELECT * FROM Executives WHERE MEMBER_ID = ?";
      const [executive] = await connection
        .query(selectQuery, [user.id])
        .catch((err) => console.log(err));

      await connection.release();

      const totalTime = parseInt(executive[0].TIME_RENDERED);

      const totalHours = Math.floor(totalTime / 60);
      const minutes = totalTime % 60;

      votingRightsEmbed
        .setTitle(`💸 PERFORMACE-BASED RATING`)
        .addFields([
          {
            name: "Member",
            value: member.toString(),
          },
          {
            name: `Hours Rendered`,
            value: `${totalHours} hours and ${minutes} minutes`,
          },
          {
            name: "Number of Votes",
            value: "0",
          },
        ])
        .setColor("Orange");
    }

    await interaction.editReply({
      embeds: [votingRightsEmbed],
      components: [buttonRow],
    });
  },
};
