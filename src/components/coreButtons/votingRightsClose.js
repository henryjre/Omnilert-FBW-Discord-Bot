const upvotesFile = require("../coreModals/vrUpvoteModal");
const downvotesFile = require("../coreModals/vrDownvoteModal");
const abstainFile = require("../coreModals/vrAbstainModal");
const pool = require("../../sqlConnectionPool");

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
    // if (interaction.user.id !== "864920050691866654") {
    //   await interaction.reply({
    //     content: `🔴 ERROR: You cannot use this button.`,
    //     ephemeral: true,
    //   });
    //   return;
    // }
    const upvotes = upvotesFile.getUpvotes();
    const downvotes = downvotesFile.getDownVotes();
    const abstains = abstainFile.getAbstains();
    const votes = [...upvotes, ...downvotes, ...abstains];

    await interaction.deferUpdate();

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    let finalPbr;
    if (votes.length > 0) {
      const selectQuery = `SELECT * FROM Core_Team WHERE MEMBER_ID = ?`;
      for (const vote of votes) {
        const [selectResult] = await connection.execute(selectQuery, [
          vote.userId,
        ]);

        vote.votingRights = selectResult[0].VOTING_RIGHTS;
      }

      const sumOfVrPbr = votes.reduce(
        (acc, obj) => acc + obj.votingRights * obj.pbr,
        0
      );
      const totalVotingRights = votes.reduce(
        (acc, obj) => acc + obj.votingRights,
        0
      );

      finalPbr = parseFloat((sumOfVrPbr / totalVotingRights).toFixed(2));
    } else if (votes.length <= 0) {
      finalPbr = 0;
    }

    let messageEmbed = interaction.message.embeds[0];
    const votedUser = messageEmbed.data.fields[0].value;
    const match = votedUser.match(/<@(\d+)>/);
    const userId = match && match[1];

    const updateQuery = `UPDATE Core_Team SET PBR = ? WHERE MEMBER_ID = ?`;
    await connection.execute(updateQuery, [finalPbr, userId]);

    await connection.release();

    messageEmbed.data.fields.push(
      {
        name: "Votes Summary",
        value: `- *Upvotes*: **${upvotes.length}**\n- *Downvotes*: **${downvotes.length}**\n- *Abstains*: **${abstains.length}**`,
      },
      {
        name: "Final PBR",
        value: pesoFormatter.format(finalPbr),
      }
    );
    messageEmbed.data.color = 2392134; //5763720

    await interaction.editReply({
      embeds: [messageEmbed],
      components: [],
    });

    const membersWhoVoted = await interaction.guild.roles.cache
      .get("1186987728336846958")
      .members.map((m) => m);

    for (const member of membersWhoVoted) {
      await member.roles.remove("1186987728336846958");
    }

    upvotesFile.clearUpvotes();
    downvotesFile.clearDownvotes();
    abstainFile.clearAbstains();
  },
};
