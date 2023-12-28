const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const pool = require("../../sqlConnectionPool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lb")
    .setDescription("View the voting rights leaderboard."),
  async execute(interaction, client) {
    await interaction.deferReply();

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    const selectQuery = "SELECT * FROM Core_Team ORDER BY VOTING_RIGHTS DESC";
    const [lb] = await connection
      .query(selectQuery)
      .catch((err) => console.log(err));

    connection.release();

    let embedDescription = [];
    for (member of lb) {
      const user = interaction.guild.members.cache.get(member.MEMBER_ID);

      embedDescription.push({
        name: `${user.nickname}`,
        votingRights: member.VOTING_RIGHTS,
        pbr: member.pbr ? member.pbr : 0,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Core Leaderboards`)
      .setDescription(
        `${embedDescription
          .map((member, index) => {
            return `### ${index + 1}. ${member.name}\nVoting Rights: ${
              member.votingRights
            }\nPBR: ${pesoFormatter.format(member.pbr)}\n`;
          })
          .join("")}`
      )
      .setColor("#2B2D31");

    await interaction.editReply({
      embeds: [embed],
    });
  },
};
