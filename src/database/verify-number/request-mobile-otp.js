require("dotenv").config({ path: "src/.env" });
const mysql = require("mysql2/promise");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

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

  try {
    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        api_key: process.env.moviderAPI_KEY,
        api_secret: process.env.moviderAPI_SECRET,
        code_length: "6",
        from: "MOVIDER",
        pin_expire: 600,
        to: mobile_number,
      }),
    };

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
      }
      const fetchAPI = await fetch(
        "https://api.movider.co/v1/verify",
        options
      ).catch((err) => console.error(err));

      const verifyMobile = await fetchAPI.json();
      const otp = verifyMobile.request_id;

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
      const fetchAPI = await fetch(
        "https://api.movider.co/v1/verify",
        options
      ).catch((err) => console.error(err));

      const verifyMobile = await fetchAPI.json();
      const otp = verifyMobile.request_id;

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
