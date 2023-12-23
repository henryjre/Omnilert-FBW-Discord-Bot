const pool = require("../../sqlConnectionPool");

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

    let selectMenuRow = interaction.message.components[1];
    const selectedIndex = selectMenuRow.components[0].options.findIndex(
      (obj) => obj.value === interaction.values[0]
    );

    await interaction.followUp({
      content: `You voted for: __**${selectMenuRow.components[0].options[selectedIndex].label}.**__`,
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

    const votingRights = selectMemberResult[0].VOTING_RIGHTS;

    const selectedValue =
      selectMenuRow.components[0].options[selectedIndex].value.split("_");

    const newValue = Number(selectedValue[1]) + Number(votingRights);

    selectMenuRow.components[0].options[
      selectedIndex
    ].value = `${selectedValue[0]}_${newValue}`;

    await interaction.editReply({
      embeds: interaction.message.embeds,
      components: [interaction.message.components[0], selectMenuRow],
    });

    await connection.release();
  },
};
