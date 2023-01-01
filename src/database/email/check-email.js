require("dotenv").config({ path: "src/.env" });
const mysql = require("mysql2/promise");

module.exports = async function checkEmail(email, res) {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const findEmailQuery = "SELECT EMAIL FROM Personal_Details WHERE EMAIL = ?";
  const findEmail = await connection
    .query(findEmailQuery, [email])
    .catch((err) => console.log(err));

  if (findEmail[0].length > 0) {
    connection.end();
    return res.status(400).send({
      ok: false,
      error: "An account is already registered with that email.",
    });
  }

  return res.status(200).send({
    ok: true,
    message: "No email found in database.",
  });

  connection.end();
};
