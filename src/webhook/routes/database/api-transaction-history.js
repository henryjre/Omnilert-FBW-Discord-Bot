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

  const { member_id } = req.body;

  const queryTransDetails =
    "SELECT * FROM Transaction_History WHERE MEMBER_ID = ? ORDER BY TXN_DATE DESC LIMIT 50";
  const transDetails = await connection
    .query(queryTransDetails, [member_id])
    .catch((err) => console.log(err));

  connection.end();
  return res.send(transDetails[0]);
};
