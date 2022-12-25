const { EmbedBuilder, Guild } = require("discord.js");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });
const { client } = require("../index");

module.exports = async function addDatabaseDetails(
  fullName,
  birthdate,
  gender,
  email,
  mobileNumber,
  address,
  frontId,
  backId,
  selfieWithId,
  referrerId
) {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });
  const id = new Date().getTime();

  const memberId = `LEV${id}IOSA`;

  const personalQuery = `INSERT INTO Personal_Details (MEMBER_ID, FULL_NAME, BIRTHDATE, GENDER, EMAIL, MOBILE_NUMBER, ADDRESS, FRONT_ID, BACK_ID, SELFIE_WITH_ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
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
    ])
    .catch((err) => console.log(err));

  let referrer;
  let refId;
  if (referrerId.length != 20) {
    refId = "none";
    referrer = "none";
  } else {
    const selectQueryDetails =
      "SELECT FULL_NAME FROM Personal_Details WHERE MEMBER_ID = ?";
    const refQuery = await connection
      .query(selectQueryDetails, [referrerId])
      .catch((err) => console.log(err));

    refId = referrerId;
    referrer = refQuery[0][0]["FULL_NAME"];
  }

  const refQueryDetails = `INSERT INTO Referral_Details (MEMBER_ID, FULL_NAME, REFERRAL_BALANCE, REFERRER_ID, REFERRER_NAME) VALUES (?, ?, ?, ?, ?)`;
  await connection
    .query(refQueryDetails, [memberId, fullName, 0, refId, referrer])
    .catch((err) => console.log(err));

  connection.end();

  const date = new Date(Date.now()).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const embed = new EmbedBuilder()
    .setTitle("✅ MEMBER CREATED")
    .setColor("8e18be")
    .setFooter({
      text: date,
    })
    .setImage(selfieWithId)
    .addFields([
      {
        name: `MEMBER ID`,
        value: memberId,
      },
      {
        name: `NAME`,
        value: fullName,
      },
      {
        name: `GENDER`,
        value: gender,
      },
      {
        name: `DATE OF BIRTH`,
        value: birthdate,
      },
      {
        name: `MOBILE NUMBER`,
        value: mobileNumber,
      },
      {
        name: `EMAIL`,
        value: email,
      },
      {
        name: `ADDRESS`,
        value: `${address}\n\u200b`,
      },
      {
        name: `REFERRER ID`,
        value: refId,
      },
      {
        name: `REFERRED BY`,
        value: referrer,
      },
    ]);

  await client.channels.cache.get("1053860453853433860").send({
    embeds: [embed],
  });
};
