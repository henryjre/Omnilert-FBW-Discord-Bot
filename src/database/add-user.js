const { EmbedBuilder, Guild } = require("discord.js");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });
const { client } = require("../index");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

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
  referrerId,
  paymentImage
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

  const personalQuery = `INSERT INTO Personal_Details (MEMBER_ID, FULL_NAME, BIRTHDATE, GENDER, EMAIL, MOBILE_NUMBER, ADDRESS, FRONT_ID, BACK_ID, SELFIE_WITH_ID, PROOF_OF_MEMBERSHIP) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
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
    ])
    .catch((err) => console.log(err));

  const selectQueryDetails =
    "SELECT FULL_NAME FROM Personal_Details WHERE MEMBER_ID = ?";
  const refQuery = await connection
    .query(selectQueryDetails, [referrerId])
    .catch((err) => console.log(err));

  const referrer = refQuery[0][0]["FULL_NAME"];

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

  const verifyButton = new ButtonBuilder()
    .setCustomId("verify-user")
    .setLabel(`Verify`)
    .setStyle(ButtonStyle.Success);

  const rejectButton = new ButtonBuilder()
    .setCustomId("reject-user")
    .setLabel(`Reject`)
    .setStyle(ButtonStyle.Danger);

  await client.channels.cache.get("1053860453853433860").send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(verifyButton).addComponents(rejectButton)],
  });
};
