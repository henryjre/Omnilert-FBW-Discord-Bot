const pos = require("express").Router();
const { sessionOpen, discountOrder } = require("./posSession");

// /odoo/pos/pos_open
pos.post("/pos_open", sessionOpen);

// /odoo/pos/discount_order
pos.post("/discount_order", discountOrder);

module.exports = pos;
