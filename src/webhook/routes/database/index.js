const database = require('express').Router();

const addPendingMember = require('./add-pending');
const addTransactionHistory = require('./add-transaction-history');
const api_personalDetails = require('./api-personal-details');
const api_referralDetails = require('./api-referral-details');
const api_txHistory = require('./api-transaction-history');
const changeBalance = require('./change-balance');
const pendingDetails = require('./get-pending-verifications');

database.post('/members/pending', addPendingMember);
database.post('/members/get-pending', pendingDetails);
database.post('/transactions/add-tx-history', addTransactionHistory);
database.post('/transactions/history', api_txHistory);
database.post('/members/personal-details', api_personalDetails);
database.post('/members/referral-details', api_referralDetails);
database.post('/balance/change', changeBalance);

module.exports = database;