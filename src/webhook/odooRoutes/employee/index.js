const employee = require("express").Router();
const {
  employeeCheckIn,
  employeeCheckOut,
  check_in,
  check_out,
} = require("./employeeAttendance");

// /odoo/employee/check_in
employee.post("/check_in", employeeCheckIn);
employee.post("/check_out", employeeCheckOut);
employee.post("/employee_check_in", check_in);
employee.post("/employee_check_out", check_out);

module.exports = employee;
