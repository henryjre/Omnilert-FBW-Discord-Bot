const member_approval = require("express").Router();

const pending_member = require("./get-pending-verifications");

member_approval.get('/change-pending-status', pending_member);

module.exports = member_approval;
