const employees = require('express').Router();
const archive = require('./archive');

employees.use('/', archive);

module.exports = employees;
