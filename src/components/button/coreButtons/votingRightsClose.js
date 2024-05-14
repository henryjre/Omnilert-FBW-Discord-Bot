const fs = require("fs").promises;
const path = require("path");

// const conn = require("../../../sqlConnection");
const pools = require("../../../sqlPools.js");
const moment = require("moment");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = {
  data: {
    name: `votingRightsClose`,
  },
  async execute(interaction, client) {
    if (!interaction.member.roles.cache.has("1177271188997804123")) {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }
    await interaction.deferUpdate();

    const shenonUser = await interaction.guild.members.cache.get(
      "864920050691866654"
    );

    let messageEmbed = interaction.message.embeds[0];
    const votedUser = messageEmbed.data.fields[0].value;
    const match = votedUser.match(/<@(\d+)>/);
    const userId = match && match[1];

    const message = await interaction.message.channel.messages.fetch(
      interaction.message.id
    );

    // const connection = await conn.managementConnection();
    const connection = await pools.managementPool.getConnection();

    if (messageEmbed.data.title.includes("VOTING RIGHTS")) {
      const votes = await getVotingRightsSubmissions();

      const upvotes = votes.filter((v) => v.vote === "upvote");
      const downvotes = votes.filter((v) => v.vote === "downvote");
      const abstains = votes.filter((v) => v.vote === "abstain");

      const anonRemarks = votes.map((vote) => vote.anonRemarks);
      const publicRemarks = votes.map((vote) => vote.publicRemarks);

      const updateQuery = `SELECT * FROM Board_Of_Directors WHERE MEMBER_ID = ?`;
      const [core] = await connection.query(updateQuery, [userId]);

      // await connection.end();
      connection.release();

      messageEmbed.data.fields.push(
        {
          name: "Votes Summary",
          value: `- *Upvotes*: **${upvotes.length}**\n- *Downvotes*: **${downvotes.length}**\n- *Abstains*: **${abstains.length}**`,
        },
        {
          name: "Updated Voting Rights",
          value: String(core[0].VOTING_RIGHTS),
        }
      );
      messageEmbed.data.color = 2392134; //5763720
      messageEmbed.data.fields.splice(1, 1);

      await client.channels.cache.get("1196811363658498088").send({
        embeds: [messageEmbed],
      });

      await client.channels.cache.get("1189222831368716368").send({
        embeds: anonRemarks,
      });

      await shenonUser.send({
        embeds: publicRemarks,
      });

      await clearVotingRightsSubmissions();
      await message.delete();
    } else {
      const votes = await getPbrSubmissions();

      await interaction.followUp({
        content: "Processing your request... Please wait.",
        ephemeral: true,
      });

      let finalPbr, anonRemarks, publicRemarks;
      if (votes.length > 0) {
        const selectQuery = `SELECT * FROM Board_Of_Directors WHERE MEMBER_ID = ?`;
        for (const vote of votes) {
          const [selectResult] = await connection.query(selectQuery, [
            vote.userId,
          ]);

          vote.votingRights = selectResult[0].VOTING_RIGHTS;
        }

        const sumOfVrPbr = votes.reduce(
          (acc, obj) => acc + obj.votingRights * obj.finalPbr,
          0
        );
        const totalVotingRights = votes.reduce(
          (acc, obj) => acc + obj.votingRights,
          0
        );

        finalPbr = parseFloat((sumOfVrPbr / totalVotingRights).toFixed(2));
        anonRemarks = votes.map((vote) => vote.anonRemarks);
        publicRemarks = votes.map((vote) => vote.publicRemarks);
      } else if (votes.length <= 0) {
        finalPbr = 0;
        anonRemarks = [];
        publicRemarks = [];
      }

      await interaction.followUp({
        content: "Updating the member's PBR, Time Rendered and Cumulative PBR.",
        ephemeral: true,
      });

      const selectQuery = `SELECT TIME_RENDERED FROM Executives WHERE MEMBER_ID = ?`;
      const [exec] = await connection.query(selectQuery, [userId]);

      const updateQuery = `UPDATE Executives SET PBR = ?, TIME_RENDERED = ?, CUMULATIVE_PBR = (CUMULATIVE_PBR + ?) WHERE MEMBER_ID = ?`;
      await connection.query(updateQuery, [finalPbr, 0, finalPbr, userId]);

      // await connection.end();
      connection.release();

      const minutes = Number(exec[0].TIME_RENDERED);
      const totalSum = moment.duration(minutes, "minutes").asHours();

      const totalHours = Number(totalSum.toFixed(2));

      const fixedPay = Number((totalHours * 30).toFixed(2));
      const pbrPay = Number((totalHours * finalPbr).toFixed(2));
      const totalPay = Number((fixedPay + pbrPay).toFixed(2));

      messageEmbed.data.fields.push(
        {
          name: "Final PBR",
          value: pesoFormatter.format(finalPbr),
        },
        {
          name: `Fixed Salary`,
          value: pesoFormatter.format(fixedPay),
        },
        {
          name: `Performance Based Salary`,
          value: pesoFormatter.format(pbrPay),
        },
        {
          name: `Total Salary`,
          value: pesoFormatter.format(totalPay),
        }
      );
      messageEmbed.data.color = 2392134; //5763720
      messageEmbed.data.fields.splice(2, 1);

      await client.channels.cache.get("1194283985870782565").send({
        embeds: [messageEmbed],
      });

      await client.channels.cache.get("1196800785338613852").send({
        embeds: anonRemarks,
      });

      await shenonUser.send({
        embeds: publicRemarks,
      });

      await clearPbrSubmissions();
      await message.delete();
    }

    const membersWhoVoted = await interaction.guild.roles.cache
      .get("1186987728336846958")
      .members.map((m) => m);

    for (const member of membersWhoVoted) {
      await member.roles.remove("1186987728336846958");
    }
  },
};

async function getPbrSubmissions() {
  const filePath = path.join(__dirname, "../../../temp/pbrSubmissions.json");
  try {
    const data = await fs.readFile(filePath, "utf-8");
    const jsonObject = JSON.parse(data);
    console.log("PBR votes retrieved successfully");
    return jsonObject;
  } catch (error) {
    console.error("Error retrieving PBR votes:", error);
    return [];
  }
}

async function clearPbrSubmissions() {
  const filePath = path.join(__dirname, "../../../temp/pbrSubmissions.json");
  try {
    await fs.truncate(filePath, 0); // Truncate the file to zero bytes
    console.log("PBR votes cleared successfully.");
  } catch (error) {
    console.error("Error clearing PBR votes:", error);
  }
}

async function getVotingRightsSubmissions() {
  const filePath = path.join(
    __dirname,
    "../../../temp/votingRightsSubmissions.json"
  );
  try {
    const data = await fs.readFile(filePath, "utf-8");
    const jsonObject = JSON.parse(data);
    console.log("VR votes retrieved successfully");
    return jsonObject;
  } catch (error) {
    console.error("Error retrieving VR votes:", error);
    return [];
  }
}

async function clearVotingRightsSubmissions() {
  const filePath = path.join(
    __dirname,
    "../../../temp/votingRightsSubmissions.json"
  );
  try {
    await fs.truncate(filePath, 0); // Truncate the file to zero bytes
    console.log("VR votes cleared successfully.");
  } catch (error) {
    console.error("Error clearing VR votes:", error);
  }
}
