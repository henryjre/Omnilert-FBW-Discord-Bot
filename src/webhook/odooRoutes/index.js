const odooRoutes = require("express").Router();
const employee = require("./employee");

// /odoo/employee
odooRoutes.use("/employee", employee);

// /odoo/
odooRoutes.get("/", (req, res) => {
  res.status(200).json({ message: "This is the Omniler Odoo API" });
});

module.exports = odooRoutes;
