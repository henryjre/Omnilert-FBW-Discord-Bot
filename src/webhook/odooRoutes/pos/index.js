const pos = require("express").Router();
const { sessionOpen } = require("./posSession");

// /odoo/pos/pos_open
pos.post("/pos_open", sessionOpen);

module.exports = pos;
