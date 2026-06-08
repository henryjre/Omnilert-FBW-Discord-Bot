const notifications = require('express').Router();
const cronNotifications = require('./cronNotifications');
const useSend = require('./useSend');
const portalNotification = require('./portalNotification');

notifications.use('/', cronNotifications);
notifications.use('/', useSend);
notifications.use('/', portalNotification);

module.exports = notifications;
