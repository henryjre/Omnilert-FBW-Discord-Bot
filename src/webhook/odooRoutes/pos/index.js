const pos = require("express").Router();
const { sessionOpen } = require("./posSession");

// /odoo/inventory/pos_open
inventory.post("/pos_open", sessionOpen);

module.exports = pos;
