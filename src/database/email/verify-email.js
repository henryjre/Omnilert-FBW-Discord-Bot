const nodemailer = require("nodemailer");
require("dotenv").config({ path: "src/.env" });
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");

module.exports = async function verifyEmail(email, res) {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const findEmailQuery =
    "SELECT MEMBER_EMAIL FROM User_OTP_Verification WHERE MEMBER_EMAIL = ?";
  const findEmail = await connection
    .query(findEmailQuery, [email])
    .catch((err) => console.log(err));

  if (findEmail[0].length > 0) {
    connection.end();
    return res.status(400).send("Email already exists in database.");
  }

  try {
    const otp = `${Math.floor(1000 * Math.random() * 9000)}`;

    console.log(otp);

    const filePath = path.join(__dirname, "./send-otp.html");
    const source = fs.readFileSync(filePath, "utf-8").toString();
    const template = handlebars.compile(source);
    const replacements = {
      otpCode: otp,
    };
    const htmlToSend = template(replacements);

    let transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true, //ssl
      auth: {
        user: process.env.zmailEmail,
        pass: process.env.zmailPass,
      },
    });

    const mailOptions = {
      from: process.env.zmailEmail,
      to: email,
      subject: "Leviosa Email Verification",
      html: htmlToSend,
    };

    const saltRounds = 10;

    const hashedOTP = await bcrypt.hash(otp, saltRounds);

    const otpQuery = `INSERT INTO User_OTP_Verification (MEMBER_EMAIL, OTP_CODE, CREATED_AT, EXPIRES_AT) VALUES (?, ?, ?, ?)`;
    await connection
      .query(otpQuery, [email, hashedOTP, Date.now(), Date.now() + 3600000])
      .catch((err) => console.log(err));

    connection.end();

    transporter.sendMail(mailOptions);
    res.status(200).send({
      ok: true,
      message: "Verification code sent.",
    });
  } catch (error) {
    return res.status(400).send({
      ok: false,
      error: error,
    });
  }
};
