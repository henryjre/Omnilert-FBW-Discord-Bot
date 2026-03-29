const notifications = require('express').Router();
const cronNotifications = require('./cronNotifications');

notifications.use('/', cronNotifications);

module.exports = notifications;
