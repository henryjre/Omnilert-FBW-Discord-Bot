const inventory = require("express").Router();

const addProdcutFile = require("./gsheetAddProducts");

inventory.post("/addProducts", addProdcutFile);

module.exports = inventory;
