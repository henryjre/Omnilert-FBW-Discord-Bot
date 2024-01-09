const { EmbedBuilder } = require("discord.js");

let abstainSubmissions = [];
module.exports = {
  data: {
    name: "vrAbstainModal",
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

    const messageEmbed = interaction.message.embeds[0];
    const votedUser = messageEmbed.data.fields[0].value;
    const numberOfVotes = messageEmbed.data.fields[2].value;
    const newVotes = Number(numberOfVotes) + 1;
    messageEmbed.data.fields[2].value = String(newVotes);

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
      .setDescription("## Abstain Remarks")
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
      .setColor("Yellow")
      .setAuthor({
        name: interactionMember.nickname,
        iconURL: interactionMember.displayAvatarURL(),
      });

    const anonymousRemarksEmbed = new EmbedBuilder()
      .setDescription("## Abstain Remarks")
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
      .setColor("Yellow")
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
      content: "Your __**Abstain**__ was successfully submitted.",
      ephemeral: true,
    });

    abstainSubmissions.push({
      vote: "downvote",
      userId: interaction.user.id,
      pbr: pbrCheck,
    });
  },
  getAbstains: function () {
    return abstainSubmissions;
  },
  clearAbstains: function () {
    abstainSubmissions = [];
  },
};
