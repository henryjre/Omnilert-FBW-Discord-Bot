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

  const deleteUserQuery =
    "DELETE FROM User_Mobile_Verification WHERE MOBILE_NUMBER = ?";
  await connection
    .query(deleteUserQuery, [mobile_number])
    .catch((err) => console.log(err));

  connection.end();
  verifyNumber(mobile_number, res);
};
