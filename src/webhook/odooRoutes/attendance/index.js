const attendance = require("express").Router();
const { publishedShift } = require("./publishedShift");

// /odoo/employee/check_in
attendance.post("/published_shift", publishedShift);

module.exports = attendance;
