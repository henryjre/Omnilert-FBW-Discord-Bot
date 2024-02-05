const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const fs = require("fs").promises;
const path = require("path");

module.exports = {
  data: {
    name: `proposalVotingEnd`,
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

    let messageEmbed = interaction.message.embeds[0];
    if (proposalVotes.length > 0) {
      const totalVotingRights = proposalVotes.reduce((accumulator, vote) => {
        return accumulator + vote.votingRights;
      }, 0);

      let result = [];

      proposalVotes.forEach((vote, index) => {
        const votePercentage = (vote.votingRights / totalVotingRights) * 100;
        const percentage = votePercentage.toFixed(2);

        let voteIndex = result.findIndex((v) => v.option === vote.name);

        if (voteIndex === -1) {
          result.push({
            option: vote.name,
            percentage: Number(percentage),
          });
        } else {
          result[voteIndex].percentage += Number(percentage);
        }
      });

      messageEmbed.data.fields.push({
        name: "Votes Summary",
        value: `${result
          .map(
            (opt, i) => `- *${opt.option}*: **${opt.percentage.toFixed(2)}%**\n`
          )
          .join("")}`,
      });
      messageEmbed.data.description = "";
      messageEmbed.data.color = 5763720; //5763720

      const membersWhoVoted = await interaction.guild.roles.cache
        .get("1186987728336846958")
        .members.map((m) => m);

      for (const member of membersWhoVoted) {
        await member.roles.remove("1186987728336846958");
      }

      await clearProposalVotes();
    }

    const addResolution = new ButtonBuilder()
      .setCustomId("proposalResolution")
      .setLabel("Resolve")
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(addResolution);

    await interaction.editReply({
      embeds: [messageEmbed],
      components: [buttonRow],
    });
  },
};

async function getProposalVotes() {
  const filePath = path.join(
    __dirname,
    "../../../temp/proposalVotesSubmissions.json"
  );
  try {
    const data = await fs.readFile(filePath, "utf-8");
    const jsonObject = JSON.parse(data);
    console.log("Proposal votes retrieved successfully");
    return jsonObject;
  } catch (error) {
    console.error("Error retrieving proposal votes:", error);
    return [];
  }
}

async function clearProposalVotes() {
  const filePath = path.join(
    __dirname,
    "../../../temp/proposalVotesSubmissions.json"
  );
  try {
    await fs.truncate(filePath, 0); // Truncate the file to zero bytes
    console.log("Proposal votes cleared successfully.");
  } catch (error) {
    console.error("Error clearing proposal votes:", error);
  }
}
