const pending = require("express").Router();

const members = require("./pendingMembers");
const deposits = require("./pendingDeposits");
const withdrawals = require("./pendingWithdrawals");
const orders = require("./pendingOrders");

pending.post("/members", members);
pending.post("/deposits", deposits);
pending.post("/withdrawals", withdrawals);
pending.post("/orders", orders);

module.exports = pending;
