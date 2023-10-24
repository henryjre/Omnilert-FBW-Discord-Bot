const rejected = require("express").Router();

const members = require("./rejectedMembers");
const deposits = require("./rejectedDeposits");
const withdrawals = require("./rejectedWithdrawals");

rejected.post("/members", members);
rejected.post("/deposits", deposits);
rejected.post("/withdrawals", withdrawals);

module.exports = rejected;
