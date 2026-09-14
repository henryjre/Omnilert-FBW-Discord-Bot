const managementRole = "1314413671245676685";
const serviceEmployeeRole = "1314413960274907238";

const { checkOutEmployeeByDiscordId } = require("../../odooRpc.js");

module.exports = {
  name: "managementOut",
  async execute(oldState, newState, client) {
    const member = oldState.member;

    // If member only has service employee role, deny access
    if (
      member.roles.cache.has(serviceEmployeeRole) &&
      !member.roles.cache.has(managementRole)
    ) {
      return;
    }

    const memberId = member.id;
    const checkOutTime = new Date().toISOString().replace("T", " ").split(".")[0];
    try {
      await checkOutEmployeeByDiscordId(memberId, checkOutTime);
    } catch (error) {
      console.error("Error checking out employee via JSON-RPC:", error);
    }
  },
};
