const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");

require("dotenv").config({ path: "src/.env" });
const chalk = require("chalk");
const authenticateToken = require("./auth");
const addDatabaseDetails = require("../database/add-user");
///////////////////////EMAIL
const checkEmail = require("../database/email/check-email");
const verifyEmail = require("../database/email/verify-email");
const verifyOtp = require("../database/email/verify-otp");
const resendOTP = require("../database/email/resend-otp");
//////////////////////MOBILE
const verifyNumber = require("../database/verify-number/request-mobile-otp");
const verifyMobiletp = require("../database/verify-number/verify-mobile-otp");
const resendMobileOTP = require("../database/verify-number/resend-mobile-otp");
/////////////////////DATA
const getReferralDetails = require("../database/getBalanceAPI");
const getPersonalDetails = require("../database/getPersonalAPI");

const PORT = process.env.PORT;

const app = express();

const listen = async () => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(helmet());
  app.use(cors());

  app.get("/api", (req, res) => {
    res.json("Listening for User Registrations...");
  });

  app.post("/api/database/get-referral-details", authenticateToken, async (req, res) => {
    const { member_id } = req.body;

    await getReferralDetails(member_id, res);
    return;
  });

  app.post("/api/database/get-personal-details", authenticateToken, async (req, res) => {
    const { member_id } = req.body;

    await getPersonalDetails(member_id, res);
    return;
  });

  app.post("/api/registerUser", authenticateToken, async (req, res) => {
    console.log(req.body);
    await addDatabaseDetails(
      req.body.full_name,
      req.body.birthdate,
      req.body.gender,
      req.body.email_Address,
      req.body.mobile_number,
      req.body.address,
      req.body.front_id,
      req.body.back_Id,
      req.body.selfie_image,
      req.body.referrer_id,
      req.body.payment_image
    );
    res.send("🟢 Successful!");
    return;
  });

  app.post("/api/email/check-email", authenticateToken, async (req, res) => {
    const { email_Address } = req.body;

    await checkEmail(email_Address, res);
    return;
  });

  app.post("/api/email/request-otp", authenticateToken, async (req, res) => {
    const { email_Address, otpCode } = req.body;

    await verifyEmail(email_Address, otpCode, res);
    return;
  });

  app.post("/api/email/verify-otp", authenticateToken, async (req, res) => {
    const { otpInput, email_Address } = req.body;

    if (!otpInput) {
      return res.status(400).send({
        ok: false,
        error: "No OTP Input",
      });
    }

    await verifyOtp(otpInput, email_Address, res);
    return;
  });

  app.post("/api/email/resend-otp", authenticateToken, async (req, res) => {
    const { email_Address } = req.body;

    await resendOTP(email_Address, res);
    return;
  });

  app.post("/api/mobile/request-otp", authenticateToken, async (req, res) => {
    const { mobileNumber } = req.body;

    await verifyNumber(mobileNumber, res);
    return;
  });

  app.post("/api/mobile/verify-otp", authenticateToken, async (req, res) => {
    const { otpInput, mobileNumber } = req.body;

    await verifyMobiletp(otpInput, mobileNumber, res);
    return;
  });

  app.post("/api/mobile/resend-otp", authenticateToken, async (req, res) => {
    const { email_Address } = req.body;

    await resendMobileOTP(email_Address, res);
    return;
  });

  app.listen(PORT, () =>
    console.log(chalk.yellow(`🟠 Webhook running on PORT ${PORT}`))
  );
};

listen();
