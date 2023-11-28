const pending = require("express").Router();

const members = require("./pendingMembers");
const deposits = require("./pendingDeposits");
const withdrawals = require("./pendingWithdrawals");
const orders = require("./pendingOrders");
const cashback = require("./pendingCashback");
const giveaway = require("./pendingDGiveaway");
const tiktokOrders = require("./pendingTiktokOrders");

pending.post("/members", members);
pending.post("/deposits", deposits);
pending.post("/withdrawals", withdrawals);
pending.post("/orders", orders);
pending.post("/cashback", cashback);
pending.post("/dg", giveaway);
pending.post("/tiktokOrder", tiktokOrders);

module.exports = pending;
