const { EmbedBuilder } = require("discord.js");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });
const { client } = require("../index");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = async function addDatabaseDetails(
  memberId,
  fullName,
  birthdate,
  gender,
  email,
  mobileNumber,
  address,
  frontId,
  backId,
  selfieWithId,
  referrerId,
  paymentImage,
  approvalToken,
  res
) {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const personalQuery = `INSERT INTO Personal_Details (MEMBER_ID, FULL_NAME, BIRTHDATE, GENDER, EMAIL, MOBILE_NUMBER, ADDRESS, FRONT_ID, BACK_ID, SELFIE_WITH_ID, PROOF_OF_MEMBERSHIP, MEMBER_STATUS) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  await connection
    .query(personalQuery, [
      memberId,
      fullName,
      birthdate,
      gender,
      email,
      mobileNumber,
      address,
      frontId,
      backId,
      selfieWithId,
      paymentImage,
      approvalToken
    ])
    .catch((err) => console.log(err));

  const selectQueryDetails =
    "SELECT FULL_NAME FROM Personal_Details WHERE MEMBER_ID = ?";
  const refQuery = await connection
    .query(selectQueryDetails, [referrerId])
    .catch((err) => console.log(err));

  let referrer;
  if (!refQuery[0]) {
    referrer = "Invalid";
  } else {
    referrer = refQuery[0][0]["FULL_NAME"];
  }

  const refQueryDetails = `INSERT INTO Referral_Details (MEMBER_ID, FULL_NAME, REFERRAL_BALANCE, REFERRER_ID, REFERRER_NAME) VALUES (?, ?, ?, ?, ?)`;
  await connection
    .query(refQueryDetails, [memberId, fullName, 0, referrerId, referrer])
    .catch((err) => console.log(err));

  connection.end();

  const date = new Date(Date.now()).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  let genderEmoji;
  if (gender === "Male") {
    genderEmoji = "👨";
  } else {
    genderEmoji = "👩";
  }

  const embed = new EmbedBuilder()
    .setTitle("⌛ PENDING VERIFICATION")
    .setColor("ff9646")
    .setDescription(
      `**FRONT ID IMAGE**: [Click to view](${frontId})\n**BACK ID IMAGE**: [Click to view](${backId})\n**SELFIE WITH ID**: [Click to view](${selfieWithId})`
    )
    .setFooter({
      text: date,
    })
    .setImage(paymentImage)
    .addFields([
      {
        name: `MEMBER ID`,
        value: `🆔 ${memberId}`,
      },
      {
        name: `NAME`,
        value: `📛 ${fullName}`,
      },
      {
        name: `GENDER`,
        value: `${genderEmoji} ${gender}`,
      },
      {
        name: `DATE OF BIRTH`,
        value: `🎂 ${birthdate}`,
      },
      {
        name: `MOBILE NUMBER`,
        value: `📞 ${mobileNumber}`,
      },
      {
        name: `EMAIL`,
        value: `📧 ${email}`,
      },
      {
        name: `ADDRESS`,
        value: `🏠 ${address}\n\u200b`,
      },
      {
        name: `REFERRER ID`,
        value: `🆔 ${referrerId}`,
      },
      {
        name: `REFERRED BY`,
        value: `👥 ${referrer}`,
      },
    ]);

  await client.channels.cache.get("1053860453853433860").send({
    embeds: [embed],
  });
  return res.status(200).send({
    ok: true,
    message: memberId,
  });
};
