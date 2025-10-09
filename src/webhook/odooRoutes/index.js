const odooRoutes = require("express").Router();
const employee = require("./employee");
const inventory = require("./inventory");
const pos = require("./pos");
const attendance = require("./attendance");
const external = require("./external");

// /odoo/employee
odooRoutes.use("/employee", employee);

// /odoo/inventory
odooRoutes.use("/inventory", inventory);

// /odoo/pos
odooRoutes.use("/pos", pos);

// /odoo/attendance
odooRoutes.use("/attendance", attendance);

// /odoo/external
odooRoutes.use("/external", external);

// /odoo/
odooRoutes.get("/", (req, res) => {
  res.status(200).json({ message: "This is the Omniler Odoo API" });
});

module.exports = odooRoutes;
