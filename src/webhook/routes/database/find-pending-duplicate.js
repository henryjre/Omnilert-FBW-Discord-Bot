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

  const { reference_number } = req.body;

  const selectQuery = "SELECT * FROM Approved_Payments WHERE REF_NUMBER = ?";
  const findMatch = await connection
    .query(selectQuery, [reference_number])
    .catch((err) => console.log(err));

  connection.end();

  if (findMatch[0].length === 0) {
    return res.status(200).send({
      ok: true,
      message: "No match found.",
    });
  } else {
    return res.status(200).send({
      ok: false,
      message: "Match found.",
      object: findMatch[0][0]
    });
  }
};
