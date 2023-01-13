const payment_approval = require("express").Router();

const pendingDetails = require("./get-pending-verifications");
const pendingStatus = require("./change-pending-status");
const duplicatePayment = require("./find-pending-duplicate");

payment_approval.get('/get-pending', pendingDetails);
payment_approval.post('/change-pending-status', pendingStatus);
payment_approval.post('/find-duplicate-payment', duplicatePayment);

module.exports = payment_approval;
