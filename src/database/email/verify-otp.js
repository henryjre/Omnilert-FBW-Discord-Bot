const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });
const bcrypt = require("bcrypt");

module.exports = async function verifyOtp(otp, email, res) {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const findEmailQuery =
    "SELECT * FROM User_OTP_Verification WHERE MEMBER_EMAIL = ?";
  const findEmail = await connection
    .query(findEmailQuery, [email])
    .catch((err) => console.log(err));

  if (findEmail[0].length <= 0) {
    return res.status(400).send({
      ok: false,
      error: "Email does not exist or already verified.",
    });
  }
  const { OTP_CODE, EXPIRES_AT } = findEmail[0][0];

  if (EXPIRES_AT < Date.now()) {
    const deleteUserQuery =
      "DELETE FROM User_OTP_Verification WHERE MEMBER_EMAIL = ?";
    await connection
      .query(deleteUserQuery, [email])
      .catch((err) => console.log(err));

    return res.status(400).send({
      ok: false,
      error: "Code has expired. Resend code again.",
    });
  }

  const validOTP = await bcrypt.compare(otp, OTP_CODE);
  if (!validOTP) {
    return res.status(400).send({
      ok: false,
      error: "Invalid OTP code.",
    });
  }

  connection.end();

  return res.status(200).send({
    ok: true,
    message: "Email verified successfully.",
  });
};
