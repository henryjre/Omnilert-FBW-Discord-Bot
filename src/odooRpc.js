const axios = require("axios");

const rpcUrl = "https://omnilert.odoo.com/jsonrpc";

async function jsonRpc(method, params) {
  const data = {
    jsonrpc: "2.0",
    method: method,
    params: params,
    id: Math.floor(Math.random() * 1000000000),
  };

  try {
    const response = await axios.post(rpcUrl, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.data.error) {
      // Log the full error response
      console.error("Odoo Error Details:", {
        message: response.data.error.message,
        code: response.data.error.code,
        data: response.data.error.data,
      });
      throw new Error(
        `Odoo Server Error: ${JSON.stringify(response.data.error)}`
      );
    }

    return response.data;
  } catch (error) {
    console.error("Error in jsonRpc:", error);
    // If it's an axios error, log the response data if available
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

async function odooLogin() {
  try {
    // Log in to the given database
    const uid = await jsonRpc("call", {
      service: "common",
      method: "login",
      args: [
        process.env.odoo_db,
        process.env.odoo_username,
        process.env.odoo_password,
      ],
    });

    console.log("Logged in as UID:", uid.result);

    return uid.result;
  } catch (error) {
    console.error("Login Error:", error);
    return null;
  }
}

async function createOrUpdateAttendance(discordId, retryCount = 3) {
  // Validate input
  if (!discordId || typeof discordId !== "string") {
    throw new Error("Invalid Discord ID format");
  }

  try {
    // First authenticate
    const uid = await odooLogin();
    if (!uid) {
      throw new Error("Failed to authenticate with Odoo");
    }

    // Optimize 1: Combined query for employee using related field
    const employee = await jsonRpc("call", {
      service: "object",
      method: "execute_kw",
      args: [
        process.env.odoo_db,
        uid,
        process.env.odoo_password,
        "hr.employee",
        "search_read",
        [[["user_partner_id.x_discord_id", "=", discordId]]],
        { fields: ["id"] },
      ],
    });

    if (!employee.result || employee.result.length === 0) {
      throw new Error(`No employee found with Discord ID: ${discordId}`);
    }

    const employeeId = employee.result[0].id;
    // Optimize 2: Cache the formatted date
    const formattedDate = new Date()
      .toISOString()
      .replace("T", " ")
      .split(".")[0];

    // Optimize 3: Use a single query to check for open attendance
    const openAttendance = await jsonRpc("call", {
      service: "object",
      method: "execute_kw",
      args: [
        process.env.odoo_db,
        uid,
        process.env.odoo_password,
        "hr.attendance",
        "search_read",
        [
          [
            ["employee_id", "=", employeeId],
            ["check_out", "=", false],
          ],
        ],
        { fields: ["id", "check_in"] },
      ],
    });

    // Optimize 4: Use a single RPC call for either update or create
    const result =
      openAttendance.result && openAttendance.result.length > 0
        ? await jsonRpc("call", {
            service: "object",
            method: "execute_kw",
            args: [
              process.env.odoo_db,
              uid,
              process.env.odoo_password,
              "hr.attendance",
              "write",
              [
                [openAttendance.result[0].id],
                {
                  check_out: formattedDate,
                },
              ],
            ],
          })
        : await jsonRpc("call", {
            service: "object",
            method: "execute_kw",
            args: [
              process.env.odoo_db,
              uid,
              process.env.odoo_password,
              "hr.attendance",
              "create",
              [
                [
                  {
                    employee_id: employeeId,
                    check_in: formattedDate,
                  },
                ],
              ],
            ],
          });

    return result;
  } catch (error) {
    // Optimize 5: Retry logic for network issues
    if (
      retryCount > 0 &&
      (error.message.includes("network") || error.message.includes("timeout"))
    ) {
      console.log(`Retrying... ${retryCount} attempts left`);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return createOrUpdateAttendance(discordId, retryCount - 1);
    }
    throw error;
  }
}

/**
 * Calls the Odoo webhook for check-in or check-out with the current datetime.
 * @param {'checkin'|'checkout'} action - The action to perform.
 * @param {string} url - The Odoo webhook URL.
 * @param {string} discordId - The Discord user ID.
 * @returns {Promise<object>} - The response from Odoo.
 */
async function callOdooAttendanceWebhook(action, url, discordId) {
  // Format current date/time as 'YYYY-MM-DD HH:MM:SS'
  const now = new Date();
  const formattedDate = now.toISOString().replace("T", " ").split(".")[0];

  // Build payload based on action
  let payload = { x_discord_id: discordId };
  if (action === "checkin") {
    payload.check_in = formattedDate;
  } else if (action === "checkout") {
    payload.check_out = formattedDate;
  } else {
    throw new Error('Invalid action. Use "checkin" or "checkout".');
  }

  try {
    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error(
      "Error calling Odoo webhook:",
      error.response?.data || error.message
    );
    throw error;
  }
}

module.exports = {
  jsonRpc,
  odooLogin,
  callOdooAttendanceWebhook,
};
