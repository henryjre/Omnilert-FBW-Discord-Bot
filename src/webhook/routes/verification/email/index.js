const email = require('express').Router();

const checkEmail = require('./check-email');
const requestOtp = require('./request-email-otp');
const resendOTP = require('./resend-otp');
const verifyOtp = require('./verify-otp');

email.post('/check-email', checkEmail);
email.post('/request-otp', requestOtp);
email.post('/resend-otp', resendOTP);
email.post('/verify-otp', verifyOtp);

module.exports = email;