module.exports = {
  name: "meetingEnter",
  async execute(newState, client) {
    const currentMeetingIdMessage = await newState.channel.messages
      .fetch()
      .then((messages) => {
        return messages
          .filter(
            (m) =>
              m.author.bot &&
              m.embeds.length > 0 &&
              m.embeds[0].title === "Meeting ID"
          )
          .first();
      });

    if (currentMeetingIdMessage) {
      const logsChannel = client.channels.cache.get("1207252051281842197");
      const connectedMember = newState.member;

      const currentMeetingId = currentMeetingIdMessage.embeds[0].description;

      const logMessage = await logsChannel.messages.fetch().then((messages) => {
        return messages
          .filter(
            (m) =>
              m.author.bot &&
              m.embeds.length > 0 &&
              m.embeds[0].data.fields.length > 0 &&
              m.embeds[0].data.fields[0].value === currentMeetingId
          )
          .first();
      });

      const logEmbed = logMessage.embeds[0].data;

      const participantIndex = logEmbed.fields.findIndex(
        (f) => f.name === "Participants"
      );
      const leftMembersIndex = logEmbed.fields.findIndex(
        (f) => f.name === "Disconnected"
      );

      if (
        !logEmbed.fields[participantIndex].value.includes(
          `<@${connectedMember.user.id}>`
        )
      ) {
        logEmbed.fields[
          participantIndex
        ].value += `\n<@${connectedMember.user.id}>`;
      }

      if (leftMembersIndex !== -1) {
        logEmbed.fields[leftMembersIndex].value = logEmbed.fields[
          leftMembersIndex
        ].value.replace(`<@${connectedMember.user.id}>`, "");
        if (logEmbed.fields[leftMembersIndex].value.length <= 0) {
          logEmbed.fields.splice(leftMembersIndex, 1);
        }
      }

      await logMessage.edit({
        embeds: [logEmbed],
      });
    }
  },
};
