const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

let votes = [];
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
