const fs = require("fs").promises;
const path = require("path");

module.exports = {
  data: {
    name: `proposalCloseVoting`,
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

    const proposalVotes = await getProposalVotes();

    const messageEmbed = interaction.message.embeds[0].data;
    messageEmbed.description = "";

    if (proposalVotes.length > 0) {
      const totalVotingRights = proposalVotes.reduce((accumulator, vote) => {
        return accumulator + vote.votingRights;
      }, 0);

      let result = [];

      for (const vote of proposalVotes) {
        const votePercentage = (vote.votingRights / totalVotingRights) * 100;
        const percentage = votePercentage.toFixed(2);
        const voteIndex = result.findIndex((v) => v.option === vote.name);

        if (voteIndex === -1) {
          result.push({
            option: vote.name,
            percentage: Number(percentage),
          });
        } else {
          result[voteIndex].percentage += Number(percentage);
        }
      }

      messageEmbed.fields.push({
        name: "Votes Summary",
        value: `${result
          .map(
            (opt, i) => `- *${opt.option}*: **${opt.percentage.toFixed(2)}%**\n`
          )
          .join("")}`,
      });

      const membersWhoVoted = await interaction.guild.roles.cache
        .get("1186987728336846958")
        .members.map((m) => m);

      for (const member of membersWhoVoted) {
        await member.roles.remove("1186987728336846958");
      }

      await clearProposalVotes();
    } else {
      messageEmbed.fields.push({
        name: "Votes Summary",
        value: `No votes`,
      });
    }

    messageEmbed.color = 5763720; //5763720

    await interaction.editReply({
      embeds: [messageEmbed],
      components: [],
    });
  },
};

const filePath = path.join(__dirname, "../../../temp/proposalVotes.json");

async function clearProposalVotes() {
  try {
    await fs.truncate(filePath, 0); // Truncate the file to zero bytes
    console.log("Proposal votes cleared successfully.");
  } catch (error) {
    console.error("Error clearing proposal votes:", error);
  }
}

async function getProposalVotes() {
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
