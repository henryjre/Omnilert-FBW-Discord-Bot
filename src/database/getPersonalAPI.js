require("dotenv").config({ path: "src/.env" });
const mysql = require("mysql2/promise");

module.exports = async function getPersonalDetails(member_id, res) {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const queryRefDetails = "SELECT * FROM Personal_Details WHERE MEMBER_ID = ?";
  const personalDetails = await connection
    .query(queryRefDetails, [member_id])
    .catch((err) => console.log(err));

  connection.end();
  res.send(personalDetails[0][0]);
};
