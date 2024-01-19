const { EmbedBuilder } = require("discord.js");
const pool = require("../../sqlConnectionPool");

let downvotesSubmissions = [];
module.exports = {
  data: {
    name: "vrDownvoteModal",
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    // const pbrDetails = interaction.fields.getTextInputValue("pbrInput");
    const remarks = interaction.fields.getTextInputValue("remarksInput");

    // const pbrCheck = Number(pbrDetails);

    // if (isNaN(pbrCheck)) {
    //   await interaction.reply({
    //     content: `🔴 ERROR: Vote not submitted. Please enter a valid number PBR.`,
    //     ephemeral: true,
    //   });
    //   return;
    // } else if (pbrCheck < 1) {
    //   await interaction.reply({
    //     content: `🔴 ERROR: Vote not submitted. PBR must not be a negative value.`,
    //     ephemeral: true,
    //   });
    //   return;
    // } else if (pbrCheck > 50) {
    //   await interaction.reply({
    //     content: `🔴 ERROR: Vote not submitted. PBR must not exceed 50.`,
    //     ephemeral: true,
    //   });
    //   return;
    // }

    const messageEmbed = interaction.message.embeds[0];
    const votedUser = messageEmbed.data.fields[0].value;
    const numberOfVotes = messageEmbed.data.fields[1].value;
    const newVotes = Number(numberOfVotes) + 1;
    messageEmbed.data.fields[1].value = String(newVotes);

    await interaction.editReply({
      embeds: [messageEmbed],
    });

    const match = votedUser.match(/<@(\d+)>/);
    const userId = match && match[1];

    await interactionMember.roles.add("1186987728336846958");
    const member = interaction.guild.members.cache.get(userId);
    const shenonUser =
      interaction.guild.members.cache.get("864920050691866654");

    const votingRightsEmbed = new EmbedBuilder()
      .setDescription("## Downvote Remarks")
      .addFields([
        {
          name: "Voted Member",
          value: member.nickname,
        },
        // {
        //   name: "PBR Vote",
        //   value: pbrDetails,
        // },
        {
          name: "Remarks",
          value: `${remarks}`,
        },
      ])
      .setTimestamp(Date.now())
      .setColor("Red")
      .setAuthor({
        name: interactionMember.nickname,
        iconURL: interactionMember.displayAvatarURL(),
      });

    const anonymousRemarksEmbed = new EmbedBuilder()
      .setDescription("## Downvote Remarks")
      .addFields([
        {
          name: "Voted Member",
          value: member.nickname,
        },
        // {
        //   name: "PBR Vote",
        //   value: pbrDetails,
        // },
        {
          name: "Remarks",
          value: `${remarks}`,
        },
      ])
      .setTimestamp(Date.now())
      .setColor("Red")
      .setAuthor({
        name: "Anonymous",
      });

    await shenonUser.send({
      embeds: [votingRightsEmbed],
    });

    await client.channels.cache.get("1189222831368716368").send({
      embeds: [anonymousRemarksEmbed],
    });

    await interaction.followUp({
      content: "Your __**Downvote**__ was successfully submitted.",
      ephemeral: true,
    });

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    const updateQuery = `UPDATE Board_Of_Directors SET VOTING_RIGHTS = (VOTING_RIGHTS - 1) WHERE MEMBER_ID = ?`;
    await connection.execute(updateQuery, [userId]);

    await connection.release();

    downvotesSubmissions.push({
      vote: "downvote",
      userId: interaction.user.id,
      // pbr: pbrCheck,
    });
  },
  getDownVotes: function () {
    return downvotesSubmissions;
  },
  clearDownvotes: function () {
    downvotesSubmissions = [];
  },
};
