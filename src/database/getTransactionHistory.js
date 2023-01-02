require("dotenv").config({ path: "src/.env" });
const mysql = require("mysql2/promise");

module.exports = async function getTransactionHistory(member_id, res) {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const queryTransDetails = "SELECT * FROM Transaction_History WHERE MEMBER_ID = ? LIMIT 10 ORDER BY TXN_DATE DESC";
  const transDetails = await connection
    .query(queryTransDetails, [member_id])
    .catch((err) => console.log(err));

  connection.end();
  res.send(transDetails[0]);
};
