const caCertificate = process.env.db_cert;

const mysql = require("mysql2/promise");

const managementPool = mysql.createPool({
  host: process.env.logSqlHost,
  port: process.env.logSqlPort,
  user: process.env.logSqlUsername,
  password: process.env.logSqlPassword,
  database: process.env.logSqlDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    ca: caCertificate,
    rejectUnauthorized: true,
  },
});

const leviosaPool = mysql.createPool({
  host: process.env.logSqlHost,
  port: process.env.logSqlPort,
  user: process.env.logSqlUsername,
  password: process.env.logSqlPassword,
  database: "defaultdb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    ca: caCertificate,
    rejectUnauthorized: true,
  },
});

const inventoryPool = mysql.createPool({
  host: process.env.logSqlHost,
  port: process.env.logSqlPort,
  user: process.env.logSqlUsername,
  password: process.env.logSqlPassword,
  database: "inventory",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    ca: caCertificate,
    rejectUnauthorized: true,
  },
});

module.exports = { managementPool, leviosaPool, inventoryPool };
