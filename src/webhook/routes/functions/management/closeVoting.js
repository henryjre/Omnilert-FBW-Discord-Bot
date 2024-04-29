const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const client = require("../../../../index");
const conn = require("../../../../sqlConnection.js");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const taskNamePattern = /\(([^)]+)\)/;

module.exports = async (req, res) => {
  const { data, executive_name, executive_id } = req.body;

  try {
    if (!data) {
      throw new Error("No data received.");
    }

    const mgmt_connection = await conn.managementConnection();

    try {
      const selectQuery = `SELECT * FROM Executives WHERE MEMBER_ID = ?;`;
      const [executive] = await mgmt_connection.query(selectQuery, [
        executive_id,
      ]);

      const member = client.guilds.cache
        .get("1049165537193754664")
        .members.cache.get(executive_id);
      const shenonUser = client.guilds.cache
        .get("1049165537193754664")
        .members.cache.get("864920050691866654");

      const pbrEmbed = {
        color: 5763719,
        title: "💸 PERFORMACE-BASED RATING",
        fields: [
          {
            name: "Executive",
            value: member.nickname,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      const anonRemarks = [];
      const publicRemarks = [];

      const totalHourRendered = executive[0].TIME_RENDERED / 60;
      const totalHourDeductions = executive[0].TIME_DEDUCTION / 60;
      const totalTimeRendered = formatRenderedTime(executive[0].TIME_RENDERED);
      const totalTimeDeductions = formatRenderedTime(
        executive[0].TIME_DEDUCTION
      );

      pbrEmbed.fields.push(
        {
          name: "Total Time Rendered",
          value: totalTimeRendered,
        },
        {
          name: "Total NCR Deductions",
          value: totalTimeDeductions,
        }
      );

      let sumOfPbrMultipliedByVr = 0;
      let sumOfVotingRights = 0;

      for (const obj of data) {
        const remarksEmbed = {
          color: 5793266,
          title: "📜 PBR REMARKS",
          fields: [
            {
              name: "Executive",
              value: member.nickname,
            },
          ],
          timestamp: new Date().toISOString(),
        };

        Object.keys(obj).forEach((key) => {
          // Check if the key contains "(PBR)"
          if (key.includes("(RATING)")) {
            const match = key.match(taskNamePattern);
            const taskName = match && match[1];
            remarksEmbed.fields.push({
              name: taskName,
              value: obj[key].toFixed(0),
            });
          }
        });

        const totalPbrVr = obj["TOTAL PBR"] * obj["VOTING RIGHTS"];

        sumOfPbrMultipliedByVr += parseFloat(totalPbrVr.toFixed(2));
        sumOfVotingRights += parseInt(obj["VOTING RIGHTS"]);

        remarksEmbed.fields.push({
          name: "Remarks",
          value: `*${obj["REMARKS"]}*`,
        });

        anonRemarks.push(remarksEmbed);

        const remarksEmbedClone = {
          ...remarksEmbed,
          footer: {
            text: `Submitted by: ${obj["NAME"]}`,
          },
        };

        publicRemarks.push(remarksEmbedClone);
      }

      const totalPbr = sumOfPbrMultipliedByVr / sumOfVotingRights;
      const pbrPerHour = parseFloat(totalPbr.toFixed(2)) / totalHourRendered;
      const ncrDeductions =
        parseFloat(pbrPerHour.toFixed(2)) * totalHourDeductions;

      const totalSalary =
        parseFloat(totalPbr.toFixed(2)) - parseFloat(ncrDeductions.toFixed(2));

      pbrEmbed.fields.push(
        {
          name: "PBR Per Hour",
          value: pesoFormatter.format(pbrPerHour),
        },
        {
          name: "Deducted Salary Due to NCR",
          value: pesoFormatter.format(ncrDeductions),
        },
        {
          name: "PBR Salary",
          value: pesoFormatter.format(totalPbr),
        },
        {
          name: "Total Salary",
          value: pesoFormatter.format(totalSalary),
        }
      );

      // send pbr results
      await client.channels.cache
        .get("1194283985870782565")
        .send({ content: member.user.toString(), embeds: [pbrEmbed] });

      // send remarks
      await client.channels.cache
        .get("1196800785338613852")
        .send({ embeds: anonRemarks });

      await shenonUser.send({ embeds: publicRemarks });

      const votingChannel = client.channels.cache.get("1186662402247368704");
      const votingMessageFetch = await votingChannel.messages
        .fetch()
        .then((messages) => {
          return messages.filter(
            (m) =>
              m.author.bot &&
              m.embeds.length > 0 &&
              m.embeds[0].data.title === executive_name
          );
        });

      const votingMessage = votingMessageFetch.first();

      if (votingMessage) {
        votingMessage.delete();
      }

      return res.status(200).json({ ok: true, message: "success" });
    } finally {
      await mgmt_connection.end();
    }
  } catch (error) {
    console.log(error.stack);
    return res.status(404).json({ ok: false, message: error.message });
  }
};

function formatRenderedTime(totalTime) {
  const totalHours = Math.floor(totalTime / 60);
  const totalMinutes = totalTime % 60;

  const formattedTime = `${totalHours} ${
    totalHours === 1 ? "hour" : "hours"
  } and ${totalMinutes} ${totalMinutes === 1 ? "minute" : "minutes"}`;

  return formattedTime;
}
