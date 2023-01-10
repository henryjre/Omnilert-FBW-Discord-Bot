const mobile = require('express').Router();

const requestOtp = require('./request-mobile-otp');
const resendOtp = require('./resend-mobile-otp');
const verifyOtp = require('./verify-mobile-otp');

mobile.post('/request-otp', requestOtp);
mobile.post('/resend-otp', resendOtp);
mobile.post('/verify-otp', verifyOtp);

module.exports = mobile;