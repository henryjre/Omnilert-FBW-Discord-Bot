const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  channelLink,
} = require("discord.js");

const { managementPool } = require("../../../sqlConnection");

module.exports = {
  data: {
    name: "coreProposalPublic",
  },
  async execute(interaction, client) {
    const member = interaction.guild.members.cache.get(interaction.user.id);

    await interaction.deferReply({ ephemeral: true });

    const proposalTitle = interaction.fields.getTextInputValue("titleInput");
    const proposalIssue = interaction.fields.getTextInputValue("issueInput");
    const proposalAbstract =
      interaction.fields.getTextInputValue("abstractInput");
    const channelInput = interaction.fields.getTextInputValue("channelInput");

    const proposalChannel = await client.channels.cache.get(channelInput);

    if (!proposalChannel) {
      await interaction.editReply({
        content:
          "🔴 ERROR: Cannot get the proposal channel. Please try again. Do not change the Channel input when submitting your proposal.",
        ephemeral: true,
      });
      return;
    }

    let sqlTableName, embedTitleType;
    if (channelInput === "1204006892100128778") {
      sqlTableName = "Executive_Proposals";
      embedTitleType = "EXECUTIVE PROPOSAL";
    } else {
      sqlTableName = "Directors_Proposals";
      embedTitleType = "DIRECTORS PROPOSAL";
    }

    const connection = await managementPool
      .getConnection()
      .catch((err) => console.log(err));

    const insertQuery = `INSERT INTO ${sqlTableName} (TITLE, ISSUE, ABSTRACT) VALUES (?, ?, ?)`;
    await connection
      .query(insertQuery, [proposalTitle, proposalIssue, proposalAbstract])
      .catch((err) => console.log(err));

    const selectQuery = `SELECT ID FROM ${sqlTableName} WHERE ID = LAST_INSERT_ID()`;
    const idResult = await connection.execute(selectQuery);

    const proposalNumber = String(idResult[0][0].ID).padStart(4, "0");

    const embed = new EmbedBuilder()
      .setDescription(
        `## Proposal Submitted\nPlease check the <#${channelInput}> to check your proposal.`
      )
      .setColor("Green");

    const proposalEmbed = new EmbedBuilder()
      .setTitle(`📌 ${embedTitleType} #${proposalNumber}`)
      .addFields([
        {
          name: "Title",
          value: proposalTitle,
        },
        {
          name: "Statement of the Problem",
          value: proposalIssue,
        },
        {
          name: "Proposed Solution",
          value: proposalAbstract,
        },
      ])
      .setAuthor({
        name: `${member.nickname}`,
      })
      .setTimestamp(Date.now())
      .setColor("#ffff00");

    const startVoting = new ButtonBuilder()
      .setCustomId("proposalVotingStart")
      .setLabel("Open Voting")
      .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(startVoting);

    await interaction.editReply({
      embeds: [embed],
      ephemeral: true,
    });

    const proposalMessage = await proposalChannel.send({
      embeds: [proposalEmbed],
      components: [buttonRow],
    });

    const updateQuery = `UPDATE ${sqlTableName} SET PROPOSAL_NUMBER = ?, MESSAGE_ID = ? WHERE ID = ?`;
    await connection.execute(updateQuery, [
      proposalNumber,
      proposalMessage.id,
      idResult[0][0].ID,
    ]);

    await connection.release();
  },
};
