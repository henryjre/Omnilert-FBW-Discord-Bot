const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const conn = require("../../../sqlConnection.js");

const fs = require("fs").promises;
const path = require("path");

module.exports = {
  data: {
    name: `proposalCastVote`,
  },
  async execute(interaction, client) {
    const member = interaction.guild.members.cache.get(interaction.user.id);

    if (!member.roles.cache.has("1196806310524629062")) {
      await interaction.reply({
        content: `🔴 ERROR: This menu can only be used by <@&1196806310524629062>.`,
        ephemeral: true,
      });
      return;
    }

    if (member.roles.cache.has("1186987728336846958")) {
      await interaction.reply({
        content: `You already voted, cannot vote again.`,
        ephemeral: true,
      });
      return;
    }

    const vote = interaction.values[0];
    const modalId = `proposalVote_${interaction.id}`;

    const modal = new ModalBuilder();
    modal.setCustomId(modalId).setTitle(`Confirm Your Vote`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`voteInput`)
      .setLabel(`Your vote`)
      .setStyle(TextInputStyle.Short)
      .setValue(vote)
      .setPlaceholder("Changing this will not affect your vote choice.")
      .setRequired(false);

    const firstActionRow = new ActionRowBuilder().addComponents(firstInput);

    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);

    const modalResponse = await interaction
      .awaitModalSubmit({
        filter: async (i) => {
          const f = i.customId === modalId && i.user.id === interaction.user.id;
          return f;
        },
        time: 180000,
      })
      .catch(async () => {
        await interaction.followUp({
          content: `🔴 ERROR: Request timed out. Please re-submit your vote.`,
          ephemeral: true,
        });

        return;
      });

    try {
      if (modalResponse.isModalSubmit()) {
        await modalResponse.deferUpdate();
        await member.roles.add("1186987728336846958");

        const proposalVotes = await getProposalVotes();

        const connection = await conn.managementConnection();

        const selectMemberQuery =
          "SELECT * FROM Board_Of_Directors WHERE MEMBER_ID = ?";
        const [selectMemberResult] = await connection.execute(
          selectMemberQuery,
          [String(interaction.user.id)]
        );
        await connection.destroy();

        const votingRights = selectMemberResult[0].VOTING_RIGHTS;
        const selectedValueIndex = proposalVotes.findIndex(
          (v) => v.name === vote
        );

        if (selectedValueIndex === -1) {
          await storeProposalVote({
            name: vote,
            votingRights: Number(votingRights),
          });
        } else {
          proposalVotes[selectedValueIndex].votingRights +=
            Number(votingRights);
          await updateProposalVoteFile(proposalVotes);
        }

        const messageEmbed = interaction.message.embeds[0].data;
        const votesFieldIndex = messageEmbed.fields.findIndex(
          (f) => f.name === "Number of Votes"
        );

        // add +1 to votes
        messageEmbed.fields[votesFieldIndex].value = String(
          Number(messageEmbed.fields[votesFieldIndex].value) + 1
        );

        await modalResponse.followUp({
          content: `You voted for: __**${vote}.**__`,
          ephemeral: true,
        });

        await modalResponse.editReply({
          embeds: [messageEmbed],
        });
      }
    } catch (error) {
      console.log(error);
    }
  },
};

const filePath = path.join(__dirname, "../../../temp/proposalVotes.json");

async function storeProposalVote(jsonObject) {
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

async function updateProposalVoteFile(updatedData) {
  try {
    await fs.writeFile(filePath, JSON.stringify(updatedData));
    console.log("Proposal votes updated successfully.");
  } catch (error) {
    console.error("Error updating proposal votes:", error);
  }
}
