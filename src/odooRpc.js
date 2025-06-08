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

/**
 * Searches for active attendance records based on Discord ID
 * @param {string} discordId - The Discord user ID to search for
 * @returns {Promise<object>} - The response containing active attendance information
 */
async function searchActiveAttendance(discordId) {
  // Validate input
  if (!discordId || typeof discordId !== "string") {
    throw new Error("Invalid Discord ID format");
  }

  try {
    // Search for active attendance directly using x_discord_id
    const activeAttendance = await jsonRpc("call", {
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
            ["x_discord_id", "=", discordId],
            ["check_out", "=", false],
          ],
        ],
        {
          fields: ["id", "employee_id", "check_in", "in_mode", "x_discord_id"],
        },
      ],
    });

    return activeAttendance.result;
  } catch (error) {
    console.error("Error searching active attendance:", error);
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
  searchActiveAttendance,
};
