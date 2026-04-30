const websiteRoutes = require('express').Router();
const notifications = require('./notifications');
const registration = require('./registration');

websiteRoutes.use('/notifications', notifications);
websiteRoutes.use('/registration', registration);

module.exports = websiteRoutes;
