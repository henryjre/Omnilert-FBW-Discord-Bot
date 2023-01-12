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

  const queryRefDetails = "SELECT * FROM Referral_Details WHERE MEMBER_ID = ?";
  const referralDetails = await connection
    .query(queryRefDetails, [member_id])
    .catch((err) => console.log(err));

  connection.end();
  res.send(referralDetails[0][0]);
};
