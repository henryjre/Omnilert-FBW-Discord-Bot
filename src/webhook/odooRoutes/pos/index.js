const pos = require("express").Router();
const {
  sessionOpen,
  discountOrder,
  refundOrder,
  tokenPayOrder,
  sessionClose,
} = require("./posSession");

// /odoo/pos/pos_open
pos.post("/pos_open", sessionOpen);

// /odoo/pos/pos_close
pos.post("/pos_close", sessionClose);

// /odoo/pos/discount_order
pos.post("/discount_order", discountOrder);

// /odoo/pos/refund_order
pos.post("/refund_order", refundOrder);

// /odoo/pos/token_pay_order
pos.post("/token_pay_order", tokenPayOrder);

module.exports = pos;
