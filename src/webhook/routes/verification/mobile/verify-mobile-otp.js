const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

module.exports = async (req, res) => {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const { otpInput, mobile_number } = req.body;

  const findMobileQuery =
    "SELECT * FROM User_Mobile_Verification WHERE MOBILE_NUMBER = ?";
  const findMobile = await connection
    .query(findMobileQuery, [mobile_number])
    .catch((err) => console.log(err));

  if (findMobile[0].length <= 0) {
    return res.status(400).send({
      ok: false,
      error: "Mobile number does not exist or already verified.",
    });
  }

  const { OTP_ID, EXPIRES_AT } = findMobile[0][0];

  if (EXPIRES_AT < Date.now()) {
    const deleteUserQuery =
      "DELETE FROM User_Mobile_Verification WHERE MOBILE_NUMBER = ?";
    await connection
      .query(deleteUserQuery, [mobile_number])
      .catch((err) => console.log(err));

    return res.status(400).send({
      ok: false,
      error: "Verification code has expired. Resend code again.",
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
        request_id: OTP_ID,
        code: otpInput,
      }),
    };

    await fetch("https://api.movider.co/v1/verify/acknowledge", options)
      .then((response) => response.json())
      .then((response) => console.log(response))
      .catch((error) => {
        throw error;
      });

    return res.status(200).send({
      ok: true,
      message: "Mobile number verified successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).send({
      ok: false,
      error: "Verification error.",
    });
  }
};
