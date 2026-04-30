const registration = require('express').Router();
const registrationApproved = require('./registrationApproved');

registration.use('/', registrationApproved);

module.exports = registration;
