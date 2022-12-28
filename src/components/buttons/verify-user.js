const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

module.exports = {
  data: {
    name: `verify-user`,
  },
  async execute(interaction, client) {
    const connection = await mysql.createConnection({
      host: process.env.sqlHost,
      user: process.env.sqlUsername,
      password: process.env.sqlPassword,
      database: process.env.sqlDatabase,
      port: process.env.sqlPort,
    });

    const memberId =
      interaction.message.embeds[0].data.fields[0].value.split(" ");
    const referrerId =
      interaction.message.embeds[0].data.fields[7].value.split(" ");
    const email = interaction.message.embeds[0].data.fields[5].value.split(" ");
    console.log(email);

    await connection.query(
      `UPDATE Personal_Details SET MEMBER_STATUS = ? WHERE MEMBER_ID = ?`,
      ["verified", memberId[1]]
    );

    const data = {
      member: {
        loginEmail: email[1],
      },
    };

    const fetchWix = await fetch("https://www.wixapis.com/members/v1/members", {
      method: "post",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        "wix-site-id": "5a97175f-bb1f-49ad-83a1-5d374ee503b0",
        "wix-account-id": "0544f251-792a-4896-8b54-6a5e4b9a7efa",   
        Authorization: process.env.wixAPItoken,
      },
    })
    const response = await fetchWix.json()

    console.log(response);

    await interaction.reply({
      content: `hello`,
    });

    //////////////////////////////1ST DEGREE REFER
    await connection.query(
      `UPDATE Referral_Details SET REFERRAL_BALANCE =  REFERRAL_BALANCE + 1500, firstRef = firstRef + 1 WHERE MEMBER_ID = ?`,
      [referrerId[1]]
    );

    const firstProfile = await connection.query(
      `SELECT REFERRER_ID FROM Referral_Details WHERE MEMBER_ID = ?`,
      [referrerId[1]]
    );
    if (firstProfile[0][0]["REFERRER_ID"] === "none") return;
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
    if (secondProfile[0][0]["REFERRER_ID"] === "none") return;
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
    if (thirdProfile[0][0]["REFERRER_ID"] === "none") return;
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
    if (fourthProfile[0][0]["REFERRER_ID"] === "none") return;
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
    if (fifthProfile[0][0]["REFERRER_ID"] === "none") return;
    const sixthRefId = fifthProfile[0][0]["REFERRER_ID"];

    ////////////////////////////5TH DEGREE REFER
    await connection.query(
      `UPDATE Referral_Details SET REFERRAL_BALANCE = REFERRAL_BALANCE + 20, sixthRef = sixthRef + 1 WHERE MEMBER_ID = ?`,
      [sixthRefId]
    );

    connection.end();
  },
};
