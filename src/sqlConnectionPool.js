const fs = require("fs");
const path = require("path");
const caCertificatePath = path.join(__dirname, "./DO_Certificate.crt");
const caCertificate = fs.readFileSync(caCertificatePath);

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
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

module.exports = pool;
