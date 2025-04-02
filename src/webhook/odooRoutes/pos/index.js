const pos = require("express").Router();
const { sessionOpen } = require("./posSession");

// /odoo/pos/pos_open
inventory.post("/pos_open", sessionOpen);

module.exports = pos;
