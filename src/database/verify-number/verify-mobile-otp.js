const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

module.exports = async function verifyMobiletp(otp, mobile_number, res) {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

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
      .query(deleteUserQuery, [email])
      .catch((err) => console.log(err));

    return res.status(400).send({
      ok: false,
      error: "Verification code has expired. Resend code again.",
    });
  }

  await axios
    .post({
      method: "post",
      url: "https://api.movider.co/v1/verify/acknowledge",
      data: {
        request_id: OTP_ID,
        code: otp,
        api_key: process.env.moviderAPI_KEY,
        api_secret: process.env.moviderAPI_SECRET,
      },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
    })
    .catch(function (err) {
      if (err.response) {
        return res.status(400).send({
          ok: false,
          error: "Verification error.",
        });
      }
    });

  return res.status(200).send({
    ok: true,
    message: "Email verified successfully.",
  });
};
