require("dotenv").config({ path: "src/.env" });
const mysql = require("mysql2/promise");
const axios = require("axios");

module.exports = async function verifyNumber(mobile_number, res) {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const findMobileQuery =
    "SELECT MOBILE_NUMBER FROM Personal_Details WHERE MOBILE_NUMBER = ?";
  const findMobile = await connection
    .query(findMobileQuery, [mobile_number])
    .catch((err) => console.log(err));

  if (findMobile[0].length > 0) {
    connection.end();
    return res.status(400).send({
      ok: false,
      error: "An account is already registered with that mobile number.",
    });
  }

  console.log(mobile_number);

  try {
    const verifyMobile = await axios({
      method: "post",
      url: "https://api.movider.co/v1/verify",
      data: {
        to: mobile_number,
        code_length: `6`,
        from: `MVDVERIFY`,
        api_key: process.env.moviderAPI_KEY,
        api_secret: process.env.moviderAPI_SECRET,
      },
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
    });

    console.log("wow");

    console.log(verifyMobile.data);

    const otp = verifyMobile.data.request_id;

    const findExistingQuery =
      "SELECT MOBILE_NUMBER FROM User_Mobile_Verification WHERE MOBILE_NUMBER = ?";
    const findExisting = await connection
      .query(findExistingQuery, [mobile_number])
      .catch((err) => console.log(err));

    if (findExisting[0].length > 0) {
      const updateQuery =
        "UPDATE User_Mobile_Verification SET OTP_ID = ?, CREATED_AT = ?, EXPIRES_AT = ? WHERE MOBILE_NUMBER = ?";
      await connection
        .query(updateQuery, [
          otp,
          Date.now(),
          Date.now() + 3600000,
          mobile_number,
        ])
        .catch((err) => console.log(err));
    } else {
      const otpQuery = `INSERT INTO User_Mobile_Verification (MOBILE_NUMBER, OTP_ID, CREATED_AT, EXPIRES_AT) VALUES (?, ?, ?, ?)`;
      await connection
        .query(otpQuery, [mobile_number, otp, Date.now(), Date.now() + 3600000])
        .catch((err) => console.log(err));
    }

    connection.end();

    res.status(200).send({
      ok: true,
      message: "Verification code sent.",
    });
  } catch (error) {
    return res.status(400).send({
      ok: false,
      error: error,
    });
  }
};
