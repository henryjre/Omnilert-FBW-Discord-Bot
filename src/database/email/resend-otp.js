require("dotenv").config({ path: "src/.env" });
const mysql = require("mysql2/promise");
const verifyEmail = require("./verify-email");

module.exports = async function resendOTP(email, res) {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

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
    }
  }

  const deleteUserQuery =
    "DELETE FROM User_OTP_Verification WHERE MEMBER_EMAIL = ?";
  await connection
    .query(deleteUserQuery, [email])
    .catch((err) => console.log(err));

  connection.end();
  verifyEmail(email, res);
};
