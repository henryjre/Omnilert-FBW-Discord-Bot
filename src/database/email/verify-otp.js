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
    connection.end();
    return res.status(400).send("Email does not exist or already verified.");
  }
  const { OTP_CODE, EXPIRES_AT } = findEmail[0][0];

  if (EXPIRES_AT < Date.now()) {
    const deleteUserQuery =
      "DELETE FROM User_OTP_Verification WHERE MEMBER_EMAIL = ?";
    const deleteUser = await connection
      .query(deleteUserQuery, [email])
      .catch((err) => console.log(err));
    connection.end();
    return res.status(400).send("Code expired. Resend code again.");
  }

  const validOTP = await bcrypt.compare(otp, OTP_CODE);
  if (!validOTP) {
    connection.end();
    return res.status(400).send("OTP does not match.");
  }
  const updateValidityQuery =
    "UPDATE User_OTP_Verification SET VERIFIED = ? WHERE MEMBER_EMAIL = ?";
  await connection
    .query(updateValidityQuery, [1, email])
    .catch((err) => console.log(err));

  connection.end();

  return res.status(200).send({
    ok: true,
    message: "Email verified successfully.",
  });
};
