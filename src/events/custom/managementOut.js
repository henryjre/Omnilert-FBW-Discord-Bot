const managementRole = "1314413671245676685";
const serviceEmployeeRole = "1314413960274907238";

const odooWebhookUrl = "https://omnilert.odoo.com/web/hook/";

const { callOdooAttendanceWebhook } = require("../../odooRpc.js");

module.exports = {
  name: "managementOut",
  async execute(oldState, newState, client) {
    console.log("Management out");

    const member = oldState.member;

    if (
      !member.roles.cache.has(managementRole) ||
      member.roles.cache.has(serviceEmployeeRole)
    )
      return;

    const memberId = member.id;

    await callOdooAttendanceWebhook(
      "checkout",
      `${odooWebhookUrl}${process.env.ODOO_CHECKOUT_SECRET}`,
      memberId
    );
  },
};
