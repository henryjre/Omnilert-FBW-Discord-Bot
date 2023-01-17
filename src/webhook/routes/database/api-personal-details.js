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

  const queryRefDetails = "SELECT * FROM Personal_Details WHERE MEMBER_ID = ?";
  const personalDetails = await connection
    .query(queryRefDetails, [member_id])
    .catch((err) => console.log(err));

  if (personalDetails[0].length <= 0) {
    connection.end();
    return res.send("none")
  }

  connection.end();
  return res.send(personalDetails[0][0]);
};
