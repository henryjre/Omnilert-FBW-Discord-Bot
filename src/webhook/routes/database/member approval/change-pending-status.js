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

  //////////////////////////////1ST DEGREE REFER
  await connection.query(
    `UPDATE Referral_Details SET REFERRAL_BALANCE =  REFERRAL_BALANCE + 1500, firstRef = firstRef + 1 WHERE MEMBER_ID = ?`,
    [referrer_id]
  );

  const firstProfile = await connection.query(
    `SELECT REFERRER_ID FROM Referral_Details WHERE MEMBER_ID = ?`,
    [referrer_id]
  );
  if (firstProfile[0][0]["REFERRER_ID"] === "none") {
    return res.status(200).send({
      ok: true,
      message: "Member approved.",
      token: approval_token,
    });
  }
  const secondRefId = firstProfile[0][0]["REFERRER_ID"];

  /////////////////////////////2ND DEGREE REFER
  await connection.query(
    `UPDATE Referral_Details SET REFERRAL_BALANCE = REFERRAL_BALANCE + 500, secondRef = secondRef + 1 WHERE MEMBER_ID = ?`,
    [secondRefId]
  );

  const secondProfile = await connection.query(
    `SELECT REFERRER_ID FROM Referral_Details WHERE MEMBER_ID = ?`,
    [secondRefId]
  );
  if (secondProfile[0][0]["REFERRER_ID"] === "none") {
    return res.status(200).send({
      ok: true,
      message: "Member approved.",
      token: approval_token,
    });
  }
  const thirdRefId = secondProfile[0][0]["REFERRER_ID"];

  /////////////////////////////3RD DEGREE REFER
  await connection.query(
    `UPDATE Referral_Details SET REFERRAL_BALANCE = REFERRAL_BALANCE + 200, thirdRef = thirdRef + 1 WHERE MEMBER_ID = ?`,
    [thirdRefId]
  );

  const thirdProfile = await connection.query(
    `SELECT REFERRER_ID FROM Referral_Details WHERE MEMBER_ID = ?`,
    [thirdRefId]
  );
  if (thirdProfile[0][0]["REFERRER_ID"] === "none") {
    return res.status(200).send({
      ok: true,
      message: "Member approved.",
      token: approval_token,
    });
  }
  const fourthRefId = thirdProfile[0][0]["REFERRER_ID"];

  /////////////////////////////4TH DEGREE REFER
  await connection.query(
    `UPDATE Referral_Details SET REFERRAL_BALANCE = REFERRAL_BALANCE + 100, fourthRef = fourthRef + 1 WHERE MEMBER_ID = ?`,
    [fourthRefId]
  );

  const fourthProfile = await connection.query(
    `SELECT REFERRER_ID FROM Referral_Details WHERE MEMBER_ID = ?`,
    [fourthRefId]
  );
  if (fourthProfile[0][0]["REFERRER_ID"] === "none") {
    return res.status(200).send({
      ok: true,
      message: "Member approved.",
      token: approval_token,
    });
  }
  const fifthRefId = fourthProfile[0][0]["REFERRER_ID"];

  /////////////////////////////5TH DEGREE REFER
  await connection.query(
    `UPDATE Referral_Details SET REFERRAL_BALANCE = REFERRAL_BALANCE + 50, fifthRef = fifthRef + 1 WHERE MEMBER_ID = ?`,
    [fifthRefId]
  );

  const fifthProfile = await connection.query(
    `SELECT REFERRER_ID FROM Referral_Details WHERE MEMBER_ID = ?`,
    [fifthRefId]
  );
  if (fifthProfile[0][0]["REFERRER_ID"] === "none") {
    return res.status(200).send({
      ok: true,
      message: "Member approved.",
      token: approval_token,
    });
  }
  const sixthRefId = fifthProfile[0][0]["REFERRER_ID"];

  ////////////////////////////5TH DEGREE REFER
  await connection.query(
    `UPDATE Referral_Details SET REFERRAL_BALANCE = REFERRAL_BALANCE + 20, sixthRef = sixthRef + 1 WHERE MEMBER_ID = ?`,
    [sixthRefId]
  );

  return res.status(200).send({
    ok: true,
    message: "Member approved.",
    token: approval_token,
  });
};
