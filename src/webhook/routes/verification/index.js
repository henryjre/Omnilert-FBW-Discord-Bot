const verification = require('express').Router();

const email = require('./email');
const mobile = require('./mobile');

verification.use('/email', email);
verification.use('/mobile', mobile);

module.exports = verification;