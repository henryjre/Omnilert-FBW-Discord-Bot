const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const proposalVotesFile = require("../coreModals/proposalVoteConfirm");

module.exports = {
  data: {
    name: `proposalVotingEnd`,
  },
  async execute(interaction, client) {
    if (interaction.user.id !== "864920050691866654") {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const proposalVotes = proposalVotesFile.getProposalVotes();

    const totalVotingRights = proposalVotes.reduce((accumulator, vote) => {
      return accumulator + vote.votingRights;
    }, 0);

    let result = [];

    proposalVotes.forEach((vote, index) => {
      const percentage = (vote.votingRights / totalVotingRights) * 100;
      result.push({
        option: vote.name,
        percentage: percentage.toFixed(2),
      });
    });

    let messageEmbed = interaction.message.embeds[0];
    messageEmbed.data.fields.push({
      name: "Votes Summary",
      value: `${result
        .map((opt, i) => `- *${opt.option}*: **${opt.percentage}%**\n`)
        .join("")}`,
    });
    messageEmbed.data.description = "";
    messageEmbed.data.color = 5763720; //5763720

    const addResolution = new ButtonBuilder()
      .setCustomId("proposalResolution")
      .setLabel("Resolve")
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(addResolution);

    const membersWhoVoted = await interaction.guild.roles.cache
      .get("1186987728336846958")
      .members.map((m) => m);

    for (const member of membersWhoVoted) {
      await member.roles.remove("1186987728336846958");
    }

    proposalVotesFile.clearProposalVotes();

    await interaction.editReply({
      embeds: [messageEmbed],
      components: [buttonRow],
    });
  },
};
