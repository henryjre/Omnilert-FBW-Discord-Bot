const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const moment = require("moment");
const pool = require("../../sqlConnectionPool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("time")
    .setDescription("Check your total work time."),
  async execute(interaction, client) {
    const validRoles = ["1185935514042388520", "1187702183802720327"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1185935514042388520> & <@&1187702183802720327>.`,
        ephemeral: true,
      });
      return;
    }

    const userId = interaction.user.id;

    await interaction.deferReply();

    let queryString;
    if (interaction.member.roles.cache.has("1185935514042388520")) {
      queryString = "SELECT * FROM Executives WHERE MEMBER_ID = ?";
    } else {
      queryString = "SELECT TIME_RENDERED FROM Sub_Members WHERE MEMBER_ID = ?";
    }

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    try {
      const [user] = await connection.query(queryString, [userId]);

      const totalTime = parseInt(user[0].TIME_RENDERED);

      const totalHours = Math.floor(totalTime / 60);
      const minutes = totalTime % 60;

      const minimumMinutes = 1200;
      let description;
      if (totalTime >= minimumMinutes) {
        description = `✅ You have reached the minimum required hours for this week.`;
      } else {
        const hoursRemaining = minimumMinutes - totalTime;
        const neededHours = Math.floor(hoursRemaining / 60);
        const neededMinutes = hoursRemaining % 60;

        description = `❌ You need **${neededHours} ${
          neededHours === 1 ? "hour" : "hours"
        } and ${neededMinutes} ${
          neededMinutes === 1 ? "minute" : "minutes"
        }** more to reach the minimum required time for this week.`;
      }

      const embed = new EmbedBuilder()
        .setTitle(`WORK TIME CHECK`)
        .setDescription(description)
        .setColor(totalTime >= minimumMinutes ? "Green" : "Red")
        .addFields([
          {
            name: `CURRENT WORK DURATION`,
            value: `⏱️ ${totalHours} hours and ${minutes} minutes`,
          },
        ]);

      await interaction.editReply({
        embeds: [embed],
      });
    } catch (error) {
      console.log(error);
      await interaction.editReply({
        content: `🔴 ERROR: There was an error while fetching your hours rendered.`,
      });
      return;
    } finally {
      await connection.release();
    }
  },
};
