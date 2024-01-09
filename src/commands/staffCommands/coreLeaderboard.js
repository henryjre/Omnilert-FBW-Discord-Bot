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

    const selectQuery =
      "SELECT * FROM Core_Team ORDER BY VOTING_RIGHTS DESC, PBR DESC";
    const [lb] = await connection
      .query(selectQuery)
      .catch((err) => console.log(err));

    connection.release();

    let embedDescription = [];
    for (member of lb) {
      const user = interaction.guild.members.cache.get(member.MEMBER_ID);

      embedDescription.push({
        avatar: user.displayAvatarURL(),
        name: user.nickname,
        votingRights: member.VOTING_RIGHTS,
        pbr: member.PBR ? member.PBR : 0,
      });
    }

    const embed = new EmbedBuilder()
      // .setTitle(`🏆 Core Leaderboards`)
      .setDescription(
        `## Core Leaderboards\n${embedDescription
          .map((member, index) => {
            const rank = index + 1;
            let rankText;
            if (rank === 1) {
              rankText = `🥇`;
            } else if (rank === 2) {
              rankText = `🥈`;
            } else if (rank === 3) {
              rankText = `🥉`;
            } else {
              rankText = ``;
            }
            return `### ${rankText} ${member.name}\n\`\`\`Voting Rights: ${
              member.votingRights
            }\nPBR: ${pesoFormatter.format(member.pbr)}\`\`\`\n`;
          })
          .join("")}`
      )
      .setThumbnail(embedDescription[0].avatar)
      .setColor("Blurple");

    await interaction.editReply({
      embeds: [embed],
    });
  },
};
