const approved = require("express").Router();

const members = require("./approvedMembers");
const deposits = require("./approvedDeposits");
const withdrawals = require("./approvedWithdrawals");

approved.post("/members", members);
approved.post("/deposits", deposits);
approved.post("/withdrawals", withdrawals);

module.exports = approved;
