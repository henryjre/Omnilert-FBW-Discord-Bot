const managementRole = "1314413671245676685";
const serviceEmployeeRole = "1314413960274907238";
const officeChannels = ["1314413190074994690"];

const { checkInEmployeeByDiscordId } = require("../../odooRpc.js");

module.exports = {
  name: "managementIn",
  async execute(oldState, newState, client) {
    const member = newState.member;

    // If member only has service employee role, deny access
    if (
      member.roles.cache.has(serviceEmployeeRole) &&
      !member.roles.cache.has(managementRole)
    ) {
      return;
    }

    // If member has management role
    if (member.roles.cache.has(managementRole)) {
      // If member also has service employee role, only allow in office channels
      if (member.roles.cache.has(serviceEmployeeRole)) {
        if (!officeChannels.includes(newState.channel.id)) {
          return;
        }
      }
      // If we get here, either:
      // 1. Member has only management role (allowed in all channels)
      // 2. Member has both roles and is in an office channel
      const memberId = member.id;
      const checkInTime = new Date().toISOString().replace("T", " ").split(".")[0];
      try {
        await checkInEmployeeByDiscordId(memberId, checkInTime);
      } catch (error) {
        console.error("Error checking in employee via JSON-RPC:", error);
      }
      return;
    }
  },
};
