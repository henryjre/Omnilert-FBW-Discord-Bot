const websiteRoutes = require('express').Router();
const notifications = require('./notifications');
const registration = require('./registration');
const meetings = require('./meetings');

websiteRoutes.use('/notifications', notifications);
websiteRoutes.use('/registration', registration);
websiteRoutes.use('/meetings', meetings);

module.exports = websiteRoutes;
