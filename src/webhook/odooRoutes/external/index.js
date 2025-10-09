const external = require("express").Router();

const { getLoyaltyCardData } = require("./loyaltyCard.js");
const { getLoyaltyRewards } = require("./discount.js");
const {
  getAverageTransactionValue,
  getOrderSalesJournal,
  getAttendance,
} = require("./employees.js");

// /odoo/external/getLoyaltyCardData
external.get("/getLoyaltyCardData", getLoyaltyCardData);

// /odoo/external/getLoyaltyRewards
external.get("/getLoyaltyRewards", getLoyaltyRewards);

// /odoo/external/getATV
external.post("/getATV", getAverageTransactionValue);

// /odoo/external/getOrderSales
external.post("/getOrderSales", getOrderSalesJournal);

// /odoo/external/getAttendances
external.post("/getAttendances", getAttendance);

module.exports = external;
