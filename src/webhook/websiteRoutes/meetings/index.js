const meetings = require('express').Router();
const createChannel = require('./createChannel');

meetings.use('/', createChannel);

module.exports = meetings;
