const { EmbedBuilder } = require("discord.js");
let db;

(async () => {
  db = await require("../../database/db");
})();

module.exports = {
  data: {
    name: "addprofile",
  },
  async execute(interaction, client) {
    const userName = interaction.fields.getTextInputValue("profileName");
    const uplineID = interaction.fields.getTextInputValue("referrerId");
    const userEmail = interaction.fields.getTextInputValue("email");

    const id = new Date().getTime();

    console.log('lol')

    db.query(
      `INSERT INTO Verified-Users (MEMBER ID, FULL NAME, EMAIL, REFERRER ID) VALUES (LEV${id}IOSA, ${userName}, ${userEmail}, ${uplineID})`
    );

    console.log('wow')

    return
    await newProfile.save().catch(console.error);

    const date = new Date(Date.now() + 28800000).toLocaleString("en-US", {
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
          name: `FULL NAME`,
          value: userName,
        },
        {
          name: `Referred by:`,
          value: uplineID,
        },
      ]);

    await interaction.reply({
      embeds: [embed],
    });

    //////////////////////////////1ST DEGREE REFER
    const firstProfile = await Profile.findOne({ _id: uplineID });

    if (!firstProfile) {
      return;
    } else {
      Profile.findAndModify({
        query: { _id: uplineID },
        update: {
          firstRef: firstProfile.firstRef + 1,
          balance: firstProfile.balance + 1500,
        },
      });
    }
    /////////////////////////////2ND DEGREE REFER
    const secondProfile = await Profile.findOne({ _id: firstProfile.referrer });

    if (!secondProfile) {
      return;
    } else {
      Profile.findAndModify({
        query: { _id: secondProfile.referrer },
        update: {
          secondRef: secondProfile.secondRef + 1,
          balance: secondProfile.balance + 500,
        },
      });
    }
    ////////////////////////////3RD DEGREE REFER
    const thirdProfile = await Profile.findOne({ _id: secondProfile.referrer });

    if (!thirdProfile) {
      return;
    } else {
      Profile.findAndModify({
        query: { _id: thirdProfile.referrer },
        update: {
          thirdRef: thirdProfile.thirdRef + 1,
          balance: thirdProfile.balance + 300,
        },
      });
    }
    /////////////////////////////4TH DEGREE REFER
    const fourthProfile = await Profile.findOne({ _id: thirdProfile.referrer });

    if (!fourthProfile) {
      return;
    } else {
      Profile.findAndModify({
        query: { _id: fourthProfile.referrer },
        update: {
          fourthRef: fourthProfile.fourthRef + 1,
          balance: fourthProfile.balance + 100,
        },
      });
    }
    /////////////////////////////5TH DEGREE REFER
    const fifthProfile = await Profile.findOne({ _id: fourthProfile.referrer });

    if (!fifthProfile) {
      return;
    } else {
      Profile.findAndModify({
        query: { _id: fifthProfile.referrer },
        update: {
          fifthRef: fifthProfile.fifthRef + 1,
          balance: fifthProfile.balance + 50,
        },
      });
    }
    /////////////////////////////////////6TH DEGREE REFER
    const sixthProfile = await Profile.findOne({ _id: fifthProfile.referrer });

    if (!sixthProfile) {
      return;
    } else {
      Profile.findAndModify({
        query: { _id: sixthProfile.referrer },
        update: {
          fifthRef: sixthProfile.fifthRef + 1,
          balance: sixthProfile.balance + 20,
        },
      });
    }
  },
};
