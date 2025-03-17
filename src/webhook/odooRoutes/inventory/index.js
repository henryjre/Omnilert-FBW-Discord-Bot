const inventory = require("express").Router();
const { receiveValuation } = require("./inventoryValuation");

// /odoo/inventory/aic_flag
inventory.post("/aic_flag", receiveValuation);

module.exports = inventory;
