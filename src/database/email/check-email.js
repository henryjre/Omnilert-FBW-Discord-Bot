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

  const findExistingQuery =
    "SELECT VERIFIED FROM User_OTP_Verification WHERE MEMBER_EMAIL = ?";
  const findExisting = await connection
    .query(findExistingQuery, [email])
    .catch((err) => console.log(err));

  if (findExisting[0].length > 0) {
    if (findExisting[0][0].VERIFIED === 1) {
      connection.end();
      return res.status(400).send({
        ok: false,
        error: "This email address is already verified.",
      });
    } else {
      return res.status(400).send({
        ok: true,
        error: "update",
      });
    }
  }

  return res.status(200).send({
    ok: true,
    message: "No email found in database.",
  });

  connection.end();
};
