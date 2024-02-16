module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    const meetingChannels = [
      "1186355359699439766",
      "1201761715318947851",
      "1207251622124720168",
    ];

    if (newState.channel) {
      if (meetingChannels.includes(newState.channelId)) {
        client.events.get("meetingEnter").execute(newState, client);
      }
    } else if (oldState.channel) {
      if (meetingChannels.includes(oldState.channelId)) {
        client.events.get("meetingLeave").execute(oldState, client);
      }
    }
  },
};
