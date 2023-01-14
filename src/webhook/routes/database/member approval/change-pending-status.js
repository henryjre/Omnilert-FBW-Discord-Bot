require("dotenv").config({ path: "src/.env" });
const mysql = require("mysql2/promise");

module.exports = async (req, res) => {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const { id, status, verifier } = req.body;

  const queryRefDetails = "SELECT * FROM Pending_Membership WHERE _id = ?";
  const personalDetails = await connection
    .query(queryRefDetails, [id])
    .catch((err) => console.log(err));

  if (status === "verifying") {
    if (personalDetails[0].length <= 0) {
      connection.end();
      return res.status(404).send({
        ok: false,
        message: "🔴 Oops! Could not find the item you were getting.",
      });
    }

    if (
      personalDetails[0][0]["PAYMENT_STATUS"] === "verifying" &&
      personalDetails[0][0]["VERIFIER"].length > 0
    ) {
      connection.end();
      return res.status(200).send({
        ok: true,
        message: "On-hold verifying.",
      });
    } else if (
      personalDetails[0][0]["PAYMENT_STATUS"] === "verifying" &&
      personalDetails[0][0]["VERIFIER"].length <= 0
    ) {
      connection.end();
      return res.status(400).send({
        ok: false,
        message: "🔴 Oops! That payment has already been get.",
      });
    }

    const updateQuery =
      "UPDATE Pending_Payment SET PAYMENT_STATUS = ?, VERIFIER = ? WHERE _id = ?";
    await connection
      .query(updateQuery, [status, verifier, id])
      .catch((err) => console.log(err));

    connection.end();
    return res.status(200).send({
      ok: true,
      message: "Status Updated.",
    });
  }

  const member_id = personalDetails[0][0]["MEMBER_ID"];
  const full_name = personalDetails[0][0]["FULL_NAME"];
  const birthdate = personalDetails[0][0]["BIRTHDATE"];
  const gender = personalDetails[0][0]["GENDER"];
  const email_address = personalDetails[0][0]["EMAIL"];
  const mobile_number = personalDetails[0][0]["MOBILE_NUMBER"];
  const home_address = personalDetails[0][0]["ADDRESS"];
  const id_type = personalDetails[0][0]["ID_TYPE"];
  const front_id = personalDetails[0][0]["FRONT_ID"];
  const back_id = personalDetails[0][0]["BACK_ID"];
  const selfie_id = personalDetails[0][0]["SELFIE_WITH_ID"];
  const referrer_id = personalDetails[0][0]["REFERRER_ID"];
  const approval_token = personalDetails[0][0]["APPROVAL_TOKEN"];
  const verifier_name = personalDetails[0][0]["VERIFIER"];

  const selectQuery =
    "SELECT FULL_NAME FROM Personal_Details WHERE MEMBER_ID = ?";
  const referrer_name = await connection
    .query(selectQuery, [referrer_id])
    .catch((err) => console.log(err));

  const insertPersonalQuery =
    "INSERT INTO Personal_Details (MEMBER_ID, FULL_NAME, BIRTHDATE, GENDER, EMAIL, MOBILE_NUMBER, ADDRESS, ID_TYPE, FRONT_ID, BACK_ID, SELFIE_WITH_ID, APPROVED_BY) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  await connection
    .query(insertPersonalQuery, [
      member_id,
      full_name,
      birthdate,
      gender,
      email_address,
      mobile_number,
      home_address,
      id_type,
      front_id,
      back_id,
      selfie_id,
      verifier_name,
    ])
    .catch((err) => console.log(err));

  const insertReferralQuery =
    "INSERT INTO Referral_Details (MEMBER_ID, FULL_NAME, REFERRER_ID, REFERRER_NAME) VALUES (?, ?, ?, ?)";
  await connection
    .query(insertReferralQuery, [
      member_id,
      full_name,
      referrer_id,
      referrer_name[0][0]["FULL_NAME"],
    ])
    .catch((err) => console.log(err));

  const deleteQuery = "DELETE FROM Pending_Membership WHERE _id = ?";
  await connection.query(deleteQuery, [id]).catch((err) => console.log(err));

  connection.end();
  return res.status(200).send({
    ok: true,
    message: "Member approved.",
    token: approval_token
  });
};
