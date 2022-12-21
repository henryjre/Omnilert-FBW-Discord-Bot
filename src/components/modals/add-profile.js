const { EmbedBuilder } = require("discord.js");
const mysql = require("mysql2/promise");
const chalk = require("chalk");
require('dotenv').config()

module.exports = {
  data: {
    name: "add-profile",
  },
  async execute(interaction, client) {
    const connection = await mysql.createConnection({
      host: "51.77.202.155",
      user: process.env.sqlUsername,
      password: process.env.sqlPassword,
      database: "s80969_Leviosa-Database",
      port: "3306",
    });

    var uplineID = "'" + interaction.fields.getTextInputValue("referrerId") + "'";
    // const update = await connection.query(
    //   `UPDATE Verified_Users SET REFERRAL_BALANCE = REFERRAL_BALANCE + 1500, firstRef = firstRef + 1 WHERE MEMBER_ID = ${uplineID}`
    // );

    // console.log(update)
    // const ads = await connection.query(
    //   `SELECT MEMBER_ID, REFERRER_ID FROM Verified_Users WHERE MEMBER_ID = ${uplineID}`
    // );

    // console.log(ads[0].length === 0)
    // console.log(ads[0][0]['MEMBER_ID'].length === 0)

    // return
    
    const id = new Date().getTime();
    const uplId = interaction.fields.getTextInputValue("referrerId");

    const userId = "'" + `LEV${id}IOSA` + "'";
    const userName =
      "'" + interaction.fields.getTextInputValue("profileName") + "'";
    const userEmail = "'" + interaction.fields.getTextInputValue("email") + "'";

    let upline;
    let referrer;
    if (uplId.length != 20) {
      upline = "No_Referrer_ID";
      referrer = "No_Referrer";
    } else {
      upline = interaction.fields.getTextInputValue("referrerId");

      var uplineID = "'" + upline + "'";
      const refQuery = await connection.query(
        `SELECT FULL_NAME FROM Verified_Users WHERE MEMBER_ID = ${uplineID}`
      );
      referrer = "'" + refQuery[0][0]["FULL_NAME"] + "'";
      var embedReferrer = refQuery[0][0]["FULL_NAME"]
    }

    const embedUserId = `LEV${id}IOSA`;
    const embedUserName = interaction.fields.getTextInputValue("profileName");
    const embedUserEmail = interaction.fields.getTextInputValue("email");

    await connection
      .query(
        `INSERT INTO Verified_Users (MEMBER_ID, FULL_NAME, EMAIL, REFERRER_ID, REFERRER_NAME) VALUES (${userId}, ${userName}, ${userEmail}, ${uplineID}, ${referrer})`
      )
      .catch((err) => console.log(err));

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
      .addFields([
        {
          name: `MEMBER ID`,
          value: embedUserId,
        },
        {
          name: `MEMBER NAME`,
          value: embedUserName,
        },
        {
          name: `EMAIL`,
          value: `${embedUserEmail}\n\u200b`,
        },
        {
          name: `REFERRED BY`,
          value: embedReferrer,
        },
        {
          name: `REFERRER ID`,
          value: upline,
        },
      ]);

    // const embed = new EmbedBuilder()
    //   .setTitle("✅ MEMBER CREATED")
    //   .setColor("8e18be")
    //   .setFooter({
    //     text: date,
    //   })
    //   .setDescription(
    //     `**USER ID**: ${embedUserId}\n**MEMBER NAME**: ${embedUserName}\n**EMAIL**: ${embedUserEmail}\n\n**REFERRED BY:** ${referrer}\n**REFERRER ID**: ${upline}`
    //   );

    await interaction.reply({
      embeds: [embed],
    });

    //////////////////////////////1ST DEGREE REFER
    const firstProfile = await connection.query(
      `SELECT MEMBER_ID, REFERRER_ID FROM Verified_Users WHERE MEMBER_ID = ${uplineID}`
    );

    if (firstProfile[0].length === 0) {
      return;
    } else {
      await connection.query(
        `UPDATE Verified_Users SET REFERRAL_BALANCE = REFERRAL_BALANCE + 1500, firstRef = firstRef + 1 WHERE MEMBER_ID = ${uplineID}`
      );
    }
    const secondRefId = "'" + firstProfile[0][0]["REFERRER_ID"] + "'";

    /////////////////////////////2ND DEGREE REFER
    const secondProfile = await connection.query(
      `SELECT MEMBER_ID, REFERRER_ID FROM Verified_Users WHERE MEMBER_ID = ${secondRefId}`
    );

    if (secondProfile[0].length === 0) {
      return;
    } else {
      await connection.query(
        `UPDATE Verified_Users SET REFERRAL_BALANCE = REFERRAL_BALANCE + 500, secondRef = secondRef + 1 WHERE MEMBER_ID = ${secondRefId}`
      );
    }
    const thirdRefId = "'" + secondProfile[0][0]["REFERRER_ID"] + "'";

    ////////////////////////////3RD DEGREE REFER
    const thirdProfile = await connection.query(
      `SELECT MEMBER_ID, REFERRER_ID FROM Verified_Users WHERE MEMBER_ID = ${thirdRefId}`
    );

    if (thirdProfile[0].length === 0) {
      return;
    } else {
      await connection.query(
        `UPDATE Verified_Users SET REFERRAL_BALANCE = REFERRAL_BALANCE + 200, thirdRef = thirdRef + 1 WHERE MEMBER_ID = ${thirdRefId}`
      );
    }
    const fourthRefId = "'" + thirdProfile[0][0]["REFERRER_ID"] + "'";

    /////////////////////////////4TH DEGREE REFER
    const fourthProfile = await connection.query(
      `SELECT MEMBER_ID, REFERRER_ID FROM Verified_Users WHERE MEMBER_ID = ${fourthRefId}`
    );

    if (fourthProfile[0].length === 0) {
      return;
    } else {
      await connection.query(
        `UPDATE Verified_Users SET REFERRAL_BALANCE = REFERRAL_BALANCE + 100, fourthRef = fourthRef + 1 WHERE MEMBER_ID = ${fourthRefId}`
      );
    }
    const fifthRefId = "'" + fourthProfile[0][0]["REFERRER_ID"] + "'";

    /////////////////////////////5TH DEGREE REFER
    const fifthProfile = await connection.query(
      `SELECT MEMBER_ID, REFERRER_ID FROM Verified_Users WHERE MEMBER_ID = ${fifthRefId}`
    );

    if (fifthProfile[0].length === 0) {
      return;
    } else {
      await connection.query(
        `UPDATE Verified_Users SET REFERRAL_BALANCE = REFERRAL_BALANCE + 50, fifthRef = fifthRef + 1 WHERE MEMBER_ID = ${fifthRefId}`
      );
    }
    const sixthRefId = "'" + fifthProfile[0][0]["REFERRER_ID"] + "'";

    /////////////////////////////////////6TH DEGREE REFER
    const sixthProfile = await connection.query(
      `SELECT MEMBER_ID, REFERRER_ID FROM Verified_Users WHERE MEMBER_ID = ${sixthRefId}`
    );

    if (sixthProfile[0].length === 0) {
      return;
    } else {
      await connection.query(
        `UPDATE Verified_Users SET REFERRAL_BALANCE = REFERRAL_BALANCE + 20, sixthRef = sixthRef + 1 WHERE MEMBER_ID = ${sixthRefId}`
      );
    }
  },
};
