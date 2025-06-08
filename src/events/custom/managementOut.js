const managementRole = "1314413671245676685";
const serviceEmployeeRole = "1314413960274907238";

const odooWebhookUrl = "https://omnilert.odoo.com/web/hook/";

const { callOdooAttendanceWebhook } = require("../../odooRpc.js");

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

    await callOdooAttendanceWebhook(
      "checkout",
      `${odooWebhookUrl}${process.env.ODOO_CHECKOUT_SECRET}`,
      memberId
    );
  },
};
