const odooRoutes = require("express").Router();
const employee = require("./employee");
const inventory = require("./inventory");

// /odoo/employee
odooRoutes.use("/employee", employee);
odooRoutes.use("/inventory", inventory);

// /odoo/
odooRoutes.get("/", (req, res) => {
  res.status(200).json({ message: "This is the Omniler Odoo API" });
});

module.exports = odooRoutes;
