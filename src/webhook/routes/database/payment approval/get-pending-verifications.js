require("dotenv").config({ path: "src/.env" });
const mysql = require("mysql2/promise");

module.exports = async (req, res) => {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const queryPaymentDetails = "SELECT * FROM Pending_Payment ORDER BY TIMESTAMP DESC LIMIT 20";
  const pendingPaymentDetails = await connection
    .query(queryPaymentDetails)
    .catch((err) => console.log(err));

  const queryMemberDetails =
    "SELECT * FROM Pending_Membership ORDER BY TIMESTAMP DESC LIMIT 20";
  const pendingMemberDetails = await connection
    .query(queryMemberDetails)
    .catch((err) => console.log(err));

  connection.end();
  const obj = {
    pending_payments: pendingPaymentDetails[0],
    pending_membership: pendingMemberDetails[0],
  };

  res.send(obj);
};
