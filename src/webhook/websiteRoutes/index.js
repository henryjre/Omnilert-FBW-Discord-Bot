const websiteRoutes = require('express').Router();
const notifications = require('./notifications');
const registration = require('./registration');
const meetings = require('./meetings');
const employees = require('./employees');

websiteRoutes.use('/notifications', notifications);
websiteRoutes.use('/registration', registration);
websiteRoutes.use('/meetings', meetings);
websiteRoutes.use('/employees', employees);

module.exports = websiteRoutes;
