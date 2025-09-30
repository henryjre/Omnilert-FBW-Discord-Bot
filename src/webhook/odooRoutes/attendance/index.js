const attendance = require("express").Router();
const { publishedShift, deletedPlanningShift } = require("./planningShift");
const { attendanceCheckIn, attendanceCheckOut } = require("./attendance");

// /odoo/employee/check_in
attendance.post("/published_shift", publishedShift);
attendance.post("/deleted_shift", deletedPlanningShift);
attendance.post("/check_in", attendanceCheckIn);
attendance.post("/check_out", attendanceCheckOut);

module.exports = attendance;
