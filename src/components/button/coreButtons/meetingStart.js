const { EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");

module.exports = {
  data: {
    name: `openMeeting`,
  },
  async execute(interaction, client) {
    const messageEmbed = interaction.message.embeds[0].data;

    if (!messageEmbed.fields[1].value.includes(interaction.user.id)) {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }

    const interactedMember = interaction.guild.members.cache.get(
      interaction.user.id
    );

    if (!interactedMember.voice.channel) {
      await interaction.reply({
        content: `🔴 ERROR: You are not connected to a voice channel. Please enter a voice channel first before starting this meeting.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const startTimeIndex = messageEmbed.fields.findIndex(
      (f) => f.name === "Approximate Start Time"
    );
    const hostIndex = messageEmbed.fields.findIndex(
      (f) => f.name === "Meeting Host"
    );

    messageEmbed.fields[startTimeIndex].name = "Start Time";
    messageEmbed.fields[startTimeIndex].value = moment()
      .tz("Asia/Manila")
      .format("MMMM DD, YYYY [at] h:mm A");

    messageEmbed.color = 5793266;
    messageEmbed.description = "## Ongoing Meeting";

    const voiceChannel = interactedMember.voice.channel;
    const channelMembers = voiceChannel.members.map((m) => m.id);

    messageEmbed.fields.splice(hostIndex + 1, 0, {
      name: "Participants",
      value: channelMembers
        .map((m) => `<@${m}>\n`)
        .join("")
        .toString(),
    });

    await interaction.editReply({
      content: "",
      embeds: [messageEmbed],
      components: [],
    });

    const meetingIdIndex = messageEmbed.fields.findIndex(
      (f) => f.name === "Meeting ID"
    );

    const meetingIdMessage = new EmbedBuilder()
      .setTitle("Meeting ID")
      .setColor("Blurple")
      .setDescription(messageEmbed.fields[meetingIdIndex].value);

    await voiceChannel.send({
      embeds: [meetingIdMessage],
    });
  },
};
