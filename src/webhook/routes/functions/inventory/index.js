const inventory = require("express").Router();

const addProductFile = require("./gsheetAddProducts");
const addInventoryFile = require("./gsheetAddInventory");

inventory.post("/addProducts", addProductFile);
inventory.post("/addInventory", addInventoryFile);

module.exports = inventory;
