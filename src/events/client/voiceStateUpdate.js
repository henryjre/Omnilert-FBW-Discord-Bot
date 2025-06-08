module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    const officeChannels = ["1314413190074994690"];

    if (process.env.node_env === "test") return;

    if (newState.channel) {
      client.events.get("managementIn").execute(oldState, newState, client);
    } else if (!newState.channel) {
      client.events.get("managementOut").execute(oldState, newState, client);
    }
  },
};
