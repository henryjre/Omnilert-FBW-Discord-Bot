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

    const remarks = interaction.fields.getTextInputValue("remarksInput");

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
      .setDescription("## Abstain Remarks")
      .addFields([
        {
          name: "Voted Member",
          value: member.nickname,
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
      vote: "abstain",
      userId: interaction.user.id,
    });
  },
  getAbstains: function () {
    return abstainSubmissions;
  },
  clearAbstains: function () {
    abstainSubmissions = [];
  },
};
