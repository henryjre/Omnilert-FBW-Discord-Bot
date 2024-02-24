const inventory = require("express").Router();

const addProductFile = require("./gsheetAddProducts");
const addInventoryFile = require("./gsheetAddInventory");
const editProductFile = require("./gsheetEditProducts");

inventory.post("/addProducts", addProductFile);
inventory.post("/addInventory", addInventoryFile);
inventory.post("/editProducts", editProductFile);

module.exports = inventory;
