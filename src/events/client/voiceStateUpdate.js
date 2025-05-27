module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    const officeChannels = ["1314413190074994690"];

    if (process.env.node_env === "test") return;

    if (newState.channel && officeChannels.includes(newState.channel.id)) {
      client.events.get("managementIn").execute(oldState, newState, client);
    } else if (
      oldState.channel &&
      officeChannels.includes(oldState.channel.id)
    ) {
      client.events.get("managementOut").execute(oldState, newState, client);
    }
  },
};
