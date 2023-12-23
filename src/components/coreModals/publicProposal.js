const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const pool = require("../../sqlConnectionPool");

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

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    const insertQuery = `INSERT INTO Leviosa_Proposals (TITLE, ISSUE, ABSTRACT) VALUES (?, ?, ?)`;
    await connection
      .query(insertQuery, [proposalTitle, proposalIssue, proposalAbstract])
      .catch((err) => console.log(err));

    const selectQuery = `SELECT ID FROM Leviosa_Proposals WHERE ID = LAST_INSERT_ID()`;
    const idResult = await connection.execute(selectQuery);

    const proposalNumber = String(idResult[0][0].ID).padStart(4, "0");

    const embed = new EmbedBuilder()
      .setDescription(
        `## Proposal Submitted\nPlease check the <#1186661117146181773> to check your proposal.`
      )
      .setColor("Green");

    const proposalEmbed = new EmbedBuilder()
      .setTitle(`📌 LEVIOSA PROPOSAL #${proposalNumber}`)
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

    const proposalMessage = await client.channels.cache
      .get("1186661117146181773")
      .send({
        embeds: [proposalEmbed],
        components: [buttonRow],
      });

    const updateQuery = `UPDATE Leviosa_Proposals SET PROPOSAL_NUMBER = ?, MESSAGE_ID = ? WHERE ID = ?`;
    await connection.execute(updateQuery, [
      proposalNumber,
      proposalMessage.id,
      idResult[0][0].ID,
    ]);

    await connection.release();
  },
};
