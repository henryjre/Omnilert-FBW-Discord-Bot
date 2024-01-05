const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

let votes = [];
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

    const member = await interaction.guild.members.cache.get(
      interaction.user.id
    );

    if (member.roles.cache.has("1186987728336846958")) {
      await interaction.reply({
        content: `You already voted, cannot vote again.`,
        ephemeral: true,
      });
      return;
    }

    const selected = interaction.values[0];

    const voteIndex = votes.findIndex(
      (vote) => vote.userId === interaction.user.id
    );

    if (voteIndex === -1) {
      votes.push({
        userId: interaction.user.id,
        vote: selected,
      });
    } else {
      votes[voteIndex].vote = selected;
    }

    const modal = buildModal(selected);
    await interaction.showModal(modal);

    return;

    // await interaction.followUp({
    //   content: `You voted for: __**${selected}.**__`,
    //   ephemeral: true,
    // });

    // await member.roles.add("1186987728336846958");

    // const connection = await pool
    //   .getConnection()
    //   .catch((err) => console.log(err));

    // const selectMemberQuery = "SELECT * FROM Core_Team WHERE MEMBER_ID = ?";
    // const [selectMemberResult] = await connection.execute(selectMemberQuery, [
    //   String(interaction.user.id),
    // ]);

    // await connection.release();

    // const votingRights = selectMemberResult[0].VOTING_RIGHTS;

    // const selectedValueIndex = proposalVotes.findIndex(
    //   (vote) => vote.name === selected
    // );

    // if (selectedValueIndex === -1) {
    //   proposalVotes.push({
    //     name: selected,
    //     votingRights: Number(votingRights),
    //   });
    // } else {
    //   proposalVotes[selectedValueIndex].votingRights += Number(votingRights);
    // }

    // let messageEmbed = interaction.message.embeds[0];

    // const embedVotes = messageEmbed.data.fields[3].value;
    // const newVotes = Number(embedVotes) + 1;
    // messageEmbed.data.fields[3].value = newVotes;

    // await interaction.editReply({
    //   embeds: [messageEmbed],
    // });

    function buildModal(vote) {
      const modal = new ModalBuilder()
        .setCustomId("proposalVoteConfirm")
        .setTitle(`Confirm Your Vote`);

      const firstInput = new TextInputBuilder()
        .setCustomId(`voteInput`)
        .setLabel(`Your vote`)
        .setStyle(TextInputStyle.Short)
        .setValue(vote)
        .setPlaceholder("Changing this will not affect your vote choice.")
        .setRequired(false);

      const firstActionRow = new ActionRowBuilder().addComponents(firstInput);

      modal.addComponents(firstActionRow);

      return modal;
    }
  },
  getUserVote: function (userId) {
    const voteIndex = votes.findIndex((vote) => vote.userId === userId);
    if (voteIndex === -1) {
      return null;
    }

    return votes[voteIndex];
  },
  clearUserVote: function (userId) {
    const voteIndex = votes.findIndex((vote) => vote.userId === userId);
    if (voteIndex !== -1) {
      votes.splice(voteIndex, 1);
    }

    return votes;
  },
};
