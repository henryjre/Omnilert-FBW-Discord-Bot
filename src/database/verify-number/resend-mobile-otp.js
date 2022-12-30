require("dotenv").config({ path: "src/.env" });
const mysql = require("mysql2/promise");
const verifyNumber = require("./request-mobile-otp");

module.exports = async function resendMobileOTP(mobile_number, res) {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const findExistingQuery =
    "SELECT VERIFIED FROM User_Mobile_Verification WHERE MOBILE_NUMBER = ?";
  const findExisting = await connection
    .query(findExistingQuery, [mobile_number])
    .catch((err) => console.log(err));

  if (findExisting[0].length > 0) {
    if (findExisting[0][0].VERIFIED === 1) {
      connection.end();
      return res.status(400).send({
        ok: false,
        error: "This mobile number is already verified.",
      });
    } else {
      const deleteUserQuery =
        "DELETE FROM User_Mobile_Verification WHERE MOBILE_NUMBER = ?";
      await connection
        .query(deleteUserQuery, [mobile_number])
        .catch((err) => console.log(err));
    }
  }

  connection.end();
  verifyNumber(mobile_number, res);
};
