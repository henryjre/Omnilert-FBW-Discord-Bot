const employee = require("express").Router();
const { employeeCheckIn } = require("./employeeAttendance");

// /odoo/employee/check_in
employee.post("/check_in", employeeCheckIn);

module.exports = employee;
