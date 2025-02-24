const employee = require("express").Router();
const { employeeCheckIn, employeeCheckOut } = require("./employeeAttendance");

// /odoo/employee/check_in
employee.post("/check_in", employeeCheckIn);
employee.post("/check_out", employeeCheckOut);

module.exports = employee;
