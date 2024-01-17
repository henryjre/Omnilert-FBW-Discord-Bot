const { EmbedBuilder } = require("discord.js");

let pbrSubmissions = [];
let votes = 0;
let voteTimeout;
module.exports = {
  data: {
    name: "votingPbrModal",
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();
    const interactionMember = interaction.guild.members.cache.get(
      interaction.user.id
    );

    if (interactionMember.roles.cache.has("1186987728336846958")) {
      await interaction.followUp({
        content: `You already voted, cannot vote again.`,
        ephemeral: true,
      });
      return;
    }

    const pbrDetails = interaction.fields.getTextInputValue("pbrInput");
    const remarks = interaction.fields.getTextInputValue("remarksInput");

    const pbrCheck = Number(pbrDetails);

    if (isNaN(pbrCheck)) {
      await interaction.reply({
        content: `🔴 ERROR: Vote not submitted. Please enter a valid number PBR.`,
        ephemeral: true,
      });
      return;
    } else if (pbrCheck < 1) {
      await interaction.reply({
        content: `🔴 ERROR: Vote not submitted. PBR must not be a negative value.`,
        ephemeral: true,
      });
      return;
    } else if (pbrCheck > 50) {
      await interaction.reply({
        content: `🔴 ERROR: Vote not submitted. PBR must not exceed 50.`,
        ephemeral: true,
      });
      return;
    }

    clearTimeout(voteTimeout);
    votes += 1;

    const messageEmbed = interaction.message.embeds[0];
    const votedUser = messageEmbed.data.fields[0].value;

    voteTimeout = setTimeout(async () => {
      messageEmbed.data.fields[2].value = String(votes);

      await interaction.editReply({
        embeds: [messageEmbed],
      });

      votes = 0;
    }, 1200);

    const match = votedUser.match(/<@(\d+)>/);
    const userId = match && match[1];

    await interactionMember.roles.add("1186987728336846958");
    const member = interaction.guild.members.cache.get(userId);
    const shenonUser =
      interaction.guild.members.cache.get("864920050691866654");

    const votingRightsEmbed = new EmbedBuilder()
      .setDescription("## PBR Remarks")
      .addFields([
        {
          name: "Voted Member",
          value: member.nickname,
        },
        {
          name: "PBR Vote",
          value: pbrDetails,
        },
        {
          name: "Remarks",
          value: `${remarks}`,
        },
      ])
      .setTimestamp(Date.now())
      .setColor("Orange")
      .setAuthor({
        name: interactionMember.nickname,
        iconURL: interactionMember.displayAvatarURL(),
      });

    const anonymousRemarksEmbed = new EmbedBuilder()
      .setDescription("## PBR Remarks")
      .addFields([
        {
          name: "Voted Member",
          value: member.nickname,
        },
        {
          name: "PBR Vote",
          value: pbrDetails,
        },
        {
          name: "Remarks",
          value: `${remarks}`,
        },
      ])
      .setTimestamp(Date.now())
      .setColor("Orange")
      .setAuthor({
        name: "Anonymous",
      });

    await shenonUser.send({
      embeds: [votingRightsEmbed],
    });

    await client.channels.cache.get("1196800785338613852").send({
      embeds: [anonymousRemarksEmbed],
    });

    await interaction.followUp({
      content: "Your __**PBR Vote**__ was successfully submitted.",
      ephemeral: true,
    });

    pbrSubmissions.push({
      vote: "pbr",
      userId: interaction.user.id,
      pbr: pbrCheck,
    });
  },
  getPbr: function () {
    return pbrSubmissions;
  },
  clearPbr: function () {
    pbrSubmissions = [];
  },
};
