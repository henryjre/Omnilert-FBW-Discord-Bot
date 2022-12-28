const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");

require("dotenv").config({ path: "src/.env" });
const chalk = require("chalk");
const authenticateToken = require("./auth");
const addDatabaseDetails = require("../database/add-user");
const verifyEmail = require("../database/email/verify-email");
const verifyOtp = require("../database/email/verify-otp");
const resendOTP = require("../database/email/resend-otp");

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

  app.post("/api/registerUser", authenticateToken, async (req, res) => {
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

  app.post("/api/request-otp", authenticateToken, async (req, res) => {
    const { email_Address } = req.body;

    await verifyEmail(email_Address, res);
    return;
  });

  app.post("/api/verify-otp", authenticateToken, async (req, res) => {
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

  app.post("/api/resend-otp", authenticateToken, async (req, res) => {
    const { email_Address } = req.body;

    await resendOTP(email_Address, res);
    return;
  });

  app.listen(PORT, () =>
    console.log(chalk.yellow(`🟠 Webhook running on PORT ${PORT}`))
  );
};

listen();
