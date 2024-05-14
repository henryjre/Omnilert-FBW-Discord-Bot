const fs = require("fs");
const path = require("path");
const caCertificatePath = path.join(__dirname, "./DO_Certificate.crt");
const caCertificate = fs.readFileSync(caCertificatePath);

const mysql = require("mysql2/promise");

const commonPoolConfig = {
  host: process.env.logSqlHost,
  port: process.env.logSqlPort,
  user: process.env.logSqlUsername,
  password: process.env.logSqlPassword,
  connectionLimit: 5,
  ssl: {
    ca: caCertificate,
    rejectUnauthorized: true,
  },
};

const managementPool = mysql.createPool({
  ...commonPoolConfig,
  database: "management",
});

const leviosaPool = mysql.createPool({
  ...commonPoolConfig,
  database: "defaultdb",
});

const inventoryPool = mysql.createPool({
  ...commonPoolConfig,
  database: "inventory",
});

module.exports = {
  managementPool,
  leviosaPool,
  inventoryPool,
};
