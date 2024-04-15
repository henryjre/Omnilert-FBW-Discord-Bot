const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const conn = require("../../sqlConnection");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lb")
    .setDescription("View the voting rights leaderboard.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("executives")
        .setDescription("Check the PBR leaderboard for executives.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("directors")
        .setDescription(
          "Check the voting rights leaderboard for board of directors."
        )
    ),
  async execute(interaction, client) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();

    const connection = await conn.managementConnection();

    const role = await interaction.guild.roles.cache.get(
      subcommand === "executives"
        ? "1185935514042388520"
        : "1196806310524629062"
    );

    try {
      let queryString;
      if (subcommand === "executives") {
        queryString = "SELECT * FROM Executives ORDER BY PBR DESC";
      } else {
        queryString =
          "SELECT * FROM Board_Of_Directors ORDER BY VOTING_RIGHTS DESC";
      }
      const [lb] = await connection
        .query(queryString)
        .catch((err) => console.log(err));

      let embedDescription = [];
      for (member of lb) {
        const user = interaction.guild.members.cache.get(member.MEMBER_ID);

        if (subcommand === "executives") {
          embedDescription.push({
            avatar: user.displayAvatarURL(),
            name: user.nickname,
            pbr: member.PBR ? member.PBR : 0,
          });
        } else {
          embedDescription.push({
            avatar: user.displayAvatarURL(),
            name: user.nickname,
            voting_rights: member.VOTING_RIGHTS,
          });
        }
      }

      const embed = new EmbedBuilder()
        // .setTitle(`🏆 Core Leaderboards`)
        .setDescription(
          `## ${
            subcommand === "executives" ? "Executives" : "Board of Directors"
          } Leaderboard\n${embedDescription
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
              return `### ${rankText} ${member.name}\n\`\`\`${
                subcommand === "executives"
                  ? `PBR: ${pesoFormatter.format(member.pbr)}`
                  : `Voting Rights: ${member.voting_rights}`
              }\`\`\`\n`;
            })
            .join("")}`
        )
        .setThumbnail(embedDescription[0].avatar)
        .setColor(role.color);

      await interaction.editReply({
        embeds: [embed],
      });
    } catch (error) {
      console.log(error);
      await interaction.editReply({
        content: "🔴 ERROR: There was an error while getting the leaderboards.",
      });
    } finally {
      await connection.destroy();
    }
  },
};
