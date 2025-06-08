const managementRole = "1314413671245676685";
const serviceEmployeeRole = "1314413960274907238";
const officeChannels = ["1314413190074994690"];

const odooWebhookUrl = "https://omnilert.odoo.com/web/hook/";

const { callOdooAttendanceWebhook } = require("../../odooRpc.js");

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
      await callOdooAttendanceWebhook(
        "checkin",
        `${odooWebhookUrl}${process.env.ODOO_CHECKIN_SECRET}`,
        memberId
      );
      return;
    }
  },
};
