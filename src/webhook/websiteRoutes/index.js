const websiteRoutes = require('express').Router();
const notifications = require('./notifications');

websiteRoutes.use('/notifications', notifications);

module.exports = websiteRoutes;
