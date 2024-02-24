const moment = require("moment-timezone");

module.exports = {
  name: "meetingLeave",
  async execute(oldState, client) {
    const currentMeetingIdMessage = await oldState.channel.messages
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
      const disconnectedMember = oldState.member;

      const logsChannel = client.channels.cache.get("1207252051281842197");

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
      const channelMembers = oldState.channel.members;

      const leftMembersIndex = logEmbed.fields.findIndex(
        (f) => f.name === "Disconnected"
      );
      if (channelMembers.size <= 0) {
        const timeStartValue = logEmbed.fields.find(
          (f) => f.name === "Start Time"
        ).value;

        const timeStart = moment(timeStartValue, "MMMM DD, YYYY h:mm A");
        const timeEnd = moment().tz("Asia/Manila");

        console.log(
          timeStart.format("MMM DD, YYYY h:mm A"),
          timeEnd.format("MMM DD, YYYY h:mm A")
        );

        const hoursDifference = timeEnd.diff(timeStart, "hours");
        const minutesDifference = timeEnd.diff(timeStart, "minutes") % 60;

        const hoursDifference1 = timeStart.diff(timeEnd, "hours");
        const minutesDifference1 = timeStart.diff(timeEnd, "minutes") % 60;

        console.log(hoursDifference, minutesDifference);
        console.log(hoursDifference1, minutesDifference1);

        let duration;
        if (hoursDifference === 0) {
          duration = `${minutesDifference} minute${
            minutesDifference !== 1 ? "s" : ""
          }`;
        } else {
          duration = `${hoursDifference} hour${
            hoursDifference !== 1 ? "s" : ""
          }`;

          if (minutesDifference !== 0) {
            duration += ` and ${minutesDifference} minute${
              minutesDifference !== 1 ? "s" : ""
            }`;
          }
        }

        logEmbed.fields.splice(leftMembersIndex, 1);
        logEmbed.fields.push(
          {
            name: "End Time",
            value: timeEnd.format("MMMM DD, YYYY [at] h:mm A"),
          },
          {
            name: "Duration",
            value: duration,
          }
        );

        logEmbed.description = "## Meeting Concluded";
        logEmbed.color = 5763719;

        await logMessage.edit({ embeds: [logEmbed], components: [] });
        await currentMeetingIdMessage.delete();
      } else {
        const participantIndex = logEmbed.fields.findIndex(
          (f) => f.name === "Participants"
        );

        if (leftMembersIndex !== -1) {
          logEmbed.fields[
            leftMembersIndex
          ].value += `\n<@${disconnectedMember.user.id}>`;
        } else {
          logEmbed.fields.splice(participantIndex + 1, 0, {
            name: "Disconnected",
            value: `<@${disconnectedMember.user.id}>`,
          });
        }

        await logMessage.edit({ embeds: [logEmbed] });
      }
    }
  },
};
