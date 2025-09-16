const attendance = require("express").Router();
const { publishedShift } = require("./planningShift");
const { attendanceCheckIn, attendanceCheckOut } = require("./attendance");

// /odoo/employee/check_in
attendance.post("/published_shift", publishedShift);
attendance.post("/check_in", attendanceCheckIn);
attendance.post("/check_out", attendanceCheckOut);

module.exports = attendance;
