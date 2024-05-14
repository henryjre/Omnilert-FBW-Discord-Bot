const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const moment = require("moment");
// const conn = require("../../sqlConnection");
const pools = require("../../sqlPools.js");

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

    // let queryString;
    // if (interaction.member.roles.cache.has("1185935514042388520")) {
    //   queryString = "SELECT * FROM Executives WHERE MEMBER_ID = ?";
    // } else {
    //   queryString = "SELECT TIME_RENDERED FROM Sub_Members WHERE MEMBER_ID = ?";
    // }

    const queryString = `
    SELECT 
      e.MEMBER_ID AS executive_member_id,
      e.TIME_RENDERED AS executive_time_rendered,
      e.NAME AS executive_name,
      s.MEMBER_ID AS sub_member_id,
      s.TIME_RENDERED AS sub_time_rendered,
      s.DEPARTMENT_EXECUTIVE AS sub_department_executive,
      COALESCE(e.TIME_RENDERED, 0) + COALESCE(SUM(s.TIME_RENDERED), 0) AS total_rendered_hours
    FROM
      Executives e
    LEFT JOIN
      Sub_Members s ON e.OFFICE_ID = s.OFFICE_ID
    WHERE
      e.MEMBER_ID = ? OR s.MEMBER_ID = ?
    GROUP BY
      e.MEMBER_ID, e.TIME_RENDERED, e.NAME, s.MEMBER_ID, s.TIME_RENDERED, s.DEPARTMENT_EXECUTIVE;
    `;

    // const connection = await conn.managementConnection();
    const connection = await pools.managementPool.getConnection();

    try {
      const [queryResult] = await connection.query(queryString, [
        userId,
        userId,
      ]);

      const formattedResult = {
        department: {
          departmentHead: queryResult[0].executive_name,
          totalTimeRendered: parseInt(queryResult[0].total_rendered_hours),
          executive: {
            memberId: queryResult[0].executive_member_id,
            timeRendered: queryResult[0].executive_time_rendered,
          },
          subMembers: queryResult
            .filter((row) => row.sub_member_id !== null)
            .map((row) => ({
              memberId: row.sub_member_id,
              timeRendered: row.sub_time_rendered,
            })),
        },
      };

      const totalDepartmentTime = formattedResult.department.totalTimeRendered;
      const totalHours = Math.floor(totalDepartmentTime / 60);
      const minutes = totalDepartmentTime % 60;

      const totalHeadTime = formattedResult.department.executive.timeRendered;
      const totalHeadHours = Math.floor(totalHeadTime / 60);
      const totalHeadMinutes = totalHeadTime % 60;

      const embedFields = [
        {
          name: "Department Total Time",
          value: `⏱️ ${totalHours} ${
            totalHours === 1 ? "hour" : "hours"
          } and ${minutes} ${minutes === 1 ? "minute" : "minutes"}`,
        },
        {
          name: "Department Head",
          value: `<@${
            formattedResult.department.executive.memberId
          }>・**\`⏱️ ${totalHeadHours} ${
            totalHeadHours === 1 ? "hour" : "hours"
          } and ${totalHeadMinutes} ${
            totalHeadMinutes === 1 ? "minute" : "minutes"
          }\`**`,
        },
      ];

      if (formattedResult.department.subMembers.length > 0) {
        embedFields.push({
          name: "Associates",
          value: formattedResult.department.subMembers
            .map((member) => {
              const totalSubmemberHours = Math.floor(member.timeRendered / 60);
              const totalSubmemberMinutes = member.timeRendered % 60;

              return `<@${member.memberId}>・**\`⏱️ ${totalSubmemberHours} ${
                totalSubmemberHours === 1 ? "hour" : "hours"
              } and ${totalSubmemberMinutes} ${
                totalSubmemberMinutes === 1 ? "minute" : "minutes"
              }\`**\n`;
            })
            .join(""),
        });
      }

      const minimumMinutes = 1200;
      let description;
      if (totalDepartmentTime >= minimumMinutes) {
        description = `✅ Your department have reached the minimum required time for this week.`;
      } else {
        const hoursRemaining = minimumMinutes - totalDepartmentTime;
        const neededHours = Math.floor(hoursRemaining / 60);
        const neededMinutes = hoursRemaining % 60;

        description = `❌ You need **${neededHours} ${
          neededHours === 1 ? "hour" : "hours"
        } and ${neededMinutes} ${
          neededMinutes === 1 ? "minute" : "minutes"
        }** more to reach the minimum required time for this week.`;
      }

      const embed = new EmbedBuilder()
        .setTitle(`DEPARTMENT TIME`)
        .setDescription(description)
        .setColor(totalDepartmentTime >= minimumMinutes ? "Green" : "Red")
        .addFields(embedFields);

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
      // await connection.end();
      connection.release();
    }
  },
};
