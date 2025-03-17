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
      throw new Error(response.data.error.message || "Unknown error");
    }

    return response.data;
  } catch (error) {
    console.error("Error in jsonRpc:", error);
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

module.exports = {
  jsonRpc,
  odooLogin,
};
