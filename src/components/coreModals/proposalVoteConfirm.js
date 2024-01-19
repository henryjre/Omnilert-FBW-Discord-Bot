const pool = require("../../sqlConnectionPool");
const voteFile = require("../coreMenus/voteProposalOptions");

let proposalVotes = [];
module.exports = {
  data: {
    name: `proposalVoteConfirm`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();
    const member = interaction.guild.members.cache.get(interaction.user.id);
    await member.roles.add("1186987728336846958");

    const vote = voteFile.getUserVote(interaction.user.id);

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    const selectMemberQuery = "SELECT * FROM Board_Of_Directors WHERE MEMBER_ID = ?";
    const [selectMemberResult] = await connection.execute(selectMemberQuery, [
      String(interaction.user.id),
    ]);

    await connection.release();

    const votingRights = selectMemberResult[0].VOTING_RIGHTS;

    const selectedValueIndex = proposalVotes.findIndex(
      (vote) => vote.name === vote.vote
    );

    if (selectedValueIndex === -1) {
      proposalVotes.push({
        name: vote.vote,
        votingRights: Number(votingRights),
      });
    } else {
      proposalVotes[selectedValueIndex].votingRights += Number(votingRights);
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
  getProposalVotes: function () {
    return proposalVotes;
  },
  clearProposalVotes: function () {
    proposalVotes = [];
  },
};
