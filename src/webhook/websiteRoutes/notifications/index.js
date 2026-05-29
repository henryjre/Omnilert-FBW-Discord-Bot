const notifications = require('express').Router();
const cronNotifications = require('./cronNotifications');
const useSend = require('./useSend');

notifications.use('/', cronNotifications);
notifications.use('/', useSend);

module.exports = notifications;
