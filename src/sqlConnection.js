// const fs = require("fs");
// const path = require("path");
// const caCertificatePath = path.join(__dirname, "./DO_Certificate.crt");
// const caCertificate = fs.readFileSync(caCertificatePath);

// const mysql = require("mysql2/promise");

// const commonPoolConfig = {
//   host: process.env.logSqlHost,
//   port: process.env.logSqlPort,
//   user: process.env.logSqlUsername,
//   password: process.env.logSqlPassword,
//   ssl: {
//     ca: caCertificate,
//     rejectUnauthorized: true,
//   },
// };

// const managementConnection = async () =>
//   await mysql.createConnection({
//     ...commonPoolConfig,
//     database: "management",
//   });

// const leviosaConnection = async () =>
//   await mysql.createConnection({
//     ...commonPoolConfig,
//     database: "defaultdb",
//   });

// const inventoryConnection = async () =>
//   await mysql.createConnection({
//     ...commonPoolConfig,
//     database: "inventory",
//   });

// module.exports = {
//   managementConnection,
//   leviosaConnection,
//   inventoryConnection,
// };
