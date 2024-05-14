const { EmbedBuilder } = require("discord.js");
// const conn = require("../../../sqlConnection");
const pools = require("../../../sqlPools.js");

const fs = require("fs").promises;
const path = require("path");

module.exports = {
  data: {
    name: "vrUpvoteModal",
  },
  async execute(interaction, client) {
    const interactionMember = interaction.guild.members.cache.get(
      interaction.user.id
    );
    if (interactionMember.roles.cache.has("1186987728336846958")) {
      await interaction.reply({
        content: `You already voted, cannot vote again.`,
        ephemeral: true,
      });
      return;
    }
    await interaction.deferUpdate();

    const remarks = interaction.fields.getTextInputValue("remarksInput");

    const messageEmbed = interaction.message.embeds[0];
    const votedUser = messageEmbed.data.fields[0].value;
    const numberOfVotes = messageEmbed.data.fields[1].value;
    const newVotes = Number(numberOfVotes) + 1;
    messageEmbed.data.fields[1].value = String(newVotes);

    await interaction.editReply({
      embeds: [messageEmbed],
    });

    const match = votedUser.match(/<@(\d+)>/);
    const userId = match && match[1];

    if (!interactionMember.roles.cache.has("1186987728336846958")) {
      await interactionMember.roles.add("1186987728336846958");
    }
    const member = interaction.guild.members.cache.get(userId);

    const notAnonEmbed = new EmbedBuilder()
      .setDescription("## Upvote Remarks")
      .addFields([
        {
          name: "Voted Member",
          value: member.nickname,
        },
        {
          name: "Remarks",
          value: `${remarks}`,
        },
      ])
      .setTimestamp(Date.now())
      .setColor("Green")
      .setAuthor({
        name: interactionMember.nickname,
        iconURL: interactionMember.displayAvatarURL(),
      });

    const anonEmbed = new EmbedBuilder()
      .setDescription("## Upvote Remarks")
      .addFields([
        {
          name: "Voted Member",
          value: member.nickname,
        },
        {
          name: "Remarks",
          value: `${remarks}`,
        },
      ])
      .setTimestamp(Date.now())
      .setColor("Green")
      .setAuthor({
        name: "Anonymous",
      });

    await interaction.followUp({
      content: "Your __**Upvote**__ was successfully submitted.",
      ephemeral: true,
    });

    // const connection = await conn.managementConnection();
    const connection = await pools.managementPool.getConnection();

    const updateQuery = `UPDATE Board_Of_Directors SET VOTING_RIGHTS = (VOTING_RIGHTS + 1) WHERE MEMBER_ID = ?`;
    await connection.query(updateQuery, [userId]);

    const updateQuery2 = `UPDATE Board_Of_Directors SET VOTING_RIGHTS = (VOTING_RIGHTS + 1) WHERE MEMBER_ID = ?`;
    await connection.query(updateQuery2, ["864920050691866654"]);

    // await connection.end();
    connection.release();

    await storeVoteSubmission({
      vote: "upvote",
      userId: interaction.user.id,
      anonRemarks: anonEmbed,
      publicRemarks: notAnonEmbed,
    });
  },
};

async function storeVoteSubmission(jsonObject) {
  const filePath = path.join(
    __dirname,
    "../../../temp/votingRightsSubmissions.json"
  );
  try {
    // Read existing data
    const existingData = await fs.readFile(filePath, "utf-8");

    // Parse existing data (or initialize as an empty array if the file is empty)
    const existingArray = existingData ? JSON.parse(existingData) : [];

    // Append the new JSON object
    existingArray.push(jsonObject);

    // Write back to the file
    await fs.writeFile(filePath, JSON.stringify(existingArray));
    console.log("Vote stored successfully.");
  } catch (error) {
    console.error("Error storing Vote:", error);
  }
}
