const pool = require("../../sqlConnectionPool");

let proposalVotes = [];
module.exports = {
  data: {
    name: `voteProposalOptions`,
  },
  async execute(interaction, client) {
    if (interaction.user.id === "864920050691866654") {
      await interaction.reply({
        content: `🔴 ERROR: You cannot vote.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const member = await interaction.guild.members.cache.get(
      interaction.user.id
    );

    if (member.roles.cache.has("1186987728336846958")) {
      await interaction.followUp({
        content: `You already voted, cannot vote again.`,
        ephemeral: true,
      });
      return;
    }

    const selected = interaction.values[0];

    await interaction.followUp({
      content: `You voted for: __**${selected}.**__`,
      ephemeral: true,
    });

    await member.roles.add("1186987728336846958");

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    const selectMemberQuery = "SELECT * FROM Core_Team WHERE MEMBER_ID = ?";
    const [selectMemberResult] = await connection.execute(selectMemberQuery, [
      String(interaction.user.id),
    ]);

    await connection.release();

    const votingRights = selectMemberResult[0].VOTING_RIGHTS;

    const selectedValueIndex = proposalVotes.findIndex(
      (vote) => vote.name === selected
    );

    if (selectedValueIndex === -1) {
      proposalVotes.push({
        name: selected,
        votingRights: Number(votingRights),
      });
    } else {
      proposalVotes[selectedValueIndex].votingRights += Number(votingRights);
    }

    let messageEmbed = interaction.message.embeds[0];

    const embedVotes = messageEmbed.data.fields[3].value;
    const newVotes = Number(embedVotes) + 1;
    messageEmbed.data.fields[3].value = newVotes;

    await interaction.editReply({
      embeds: [messageEmbed],
    });
  },
  getProposalVotes: function () {
    return proposalVotes;
  },
  clearProposalVotes: function () {
    proposalVotes = [];
  },
};
