const { EmbedBuilder } = require("discord.js");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

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

  const queryDetails =
    "INSERT INTO Personal_Details VALUES ('" +
    memberId +
    "','" +
    fullName +
    "','" +
    birthdate +
    "','" +
    gender +
    "','" +
    email +
    "','" +
    "','" +
    mobileNumber +
    "','" +
    address +
    "','" +
    frontId +
    "','" +
    backId +
    "','" +
    selfieWithId +
    "'";
  await connection.query(queryDetails).catch((err) => console.log(err));

  let referrer;
  let refId;
  if (referrerId.length != 20) {
    refId = "none";
    referrer = "none";
  } else {
    const selectQueryDetails =
      "SELECT FULL_NAME FROM Personal_Details WHERE MEMBER_ID = '" +
      referrerId +
      "'";

    const refQuery = await connection
      .query(selectQueryDetails)
      .catch((err) => console.log(err));

    refId = referrerId;
    referrer = refQuery[0][0]["FULL_NAME"];
  }

  const refQueryDetails =
    "INSERT INTO Referral_Details VALUES ('" +
    memberId +
    "','" +
    fullName +
    "','" +
    0 +
    "','" +
    refId +
    "','" +
    referrer +
    "'";
  await connection.query(refQueryDetails).catch((err) => console.log(err));

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

  await interaction.reply({
    embeds: [embed],
  });
}
