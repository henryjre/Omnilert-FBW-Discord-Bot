const conn = require("../../../sqlConnection");
const voteFile = require("../../menu/coreMenus/voteProposalOptions");

const fs = require("fs").promises;
const path = require("path");

module.exports = {
  data: {
    name: `proposalVoteConfirm`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();
    const member = interaction.guild.members.cache.get(interaction.user.id);
    await member.roles.add("1186987728336846958");

    const vote = voteFile.getUserVote(interaction.user.id);
    const proposalVotes = await getProposalVotes();

    const connection = await conn.managementConnection();

    const selectMemberQuery =
      "SELECT * FROM Board_Of_Directors WHERE MEMBER_ID = ?";
    const [selectMemberResult] = await connection.execute(selectMemberQuery, [
      String(interaction.user.id),
    ]);
    await connection.end();

    const votingRights = selectMemberResult[0].VOTING_RIGHTS;
    const selectedValueIndex = proposalVotes.findIndex(
      (v) => v.name === vote.vote
    );

    if (selectedValueIndex === -1) {
      await storeVoteSubmission({
        name: vote.vote,
        votingRights: Number(votingRights),
      });
    } else {
      proposalVotes[selectedValueIndex].votingRights += Number(votingRights);
      await updateVoteFile(proposalVotes);
    }

    let messageEmbed = interaction.message.embeds[0];
    const embedVotes = messageEmbed.data.fields[3].value;
    const newVotes = Number(embedVotes) + 1;
    messageEmbed.data.fields[3].value = newVotes;

    await interaction.followUp({
      content: `You voted for: __**${vote.vote}.**__`,
      ephemeral: true,
    });

    await interaction.editReply({
      embeds: [messageEmbed],
    });

    voteFile.clearUserVote(interaction.user.id);
  },
};

async function storeVoteSubmission(jsonObject) {
  const filePath = path.join(
    __dirname,
    "../../../temp/proposalVotesSubmissions.json"
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

async function getProposalVotes() {
  const filePath = path.join(
    __dirname,
    "../../../temp/proposalVotesSubmissions.json"
  );
  try {
    const data = await fs.readFile(filePath, "utf-8");
    const jsonObject = JSON.parse(data);
    console.log("proposal votes retrieved successfully");
    return jsonObject;
  } catch (error) {
    console.log("Error retrieving proposal votes:", error);
    return [];
  }
}

async function updateVoteFile(updatedData) {
  const filePath = path.join(
    __dirname,
    "../../../temp/proposalVotesSubmissions.json"
  );
  try {
    await fs.writeFile(filePath, JSON.stringify(updatedData));
    console.log("Proposal votes updated successfully.");
  } catch (error) {
    console.error("Error updating proposal votes:", error);
  }
}
