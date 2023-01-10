// const { EmbedBuilder } = require("discord.js");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });
// const { client } = require("../index");

module.exports = async (req, res) => {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const {
    member_id,
    full_name,
    birthdate,
    gender,
    email_Address,
    mobile_number,
    address,
    id_type,
    front_id,
    back_Id,
    selfie_image,
    referrer_id,
    payment_image,
    approval_token,
  } = req.body;

  const pendingUserQuery = `INSERT INTO Pending_Membership (MEMBER_ID, FULL_NAME, BIRTHDATE, GENDER, EMAIL, MOBILE_NUMBER, ADDRESS, ID_TYPE, FRONT_ID, BACK_ID, SELFIE_WITH_ID, REFERRER_ID, APPROVAL_TOKEN) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  await connection
    .query(pendingUserQuery, [
      member_id,
      full_name,
      birthdate,
      gender,
      email_Address,
      mobile_number,
      address,
      id_type,
      front_id,
      back_Id,
      selfie_image,
      referrer_id,
      approval_token,
    ])
    .catch((err) => console.log(err));

  const pendingPaymentQuery = `INSERT INTO Pending_Payment (MEMBER_ID, PROOF_OF_PAYMENT) VALUES (?, ?)`;
  await connection
    .query(pendingPaymentQuery, [member_id, payment_image])
    .catch((err) => console.log(err));

  connection.end();
  return res.status(200).send({
    ok: true,
    message: "Member pending...",
  });
};
