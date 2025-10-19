const audit = require('express').Router();
const { storeCCTVSpotAudit, calculateWeeklyMerit } = require('./audits.js');

// /odoo/audit/store_cctv_audit
audit.post('/store_cctv_audit', storeCCTVSpotAudit);

// /odoo/audit/calculate_weekly_merit
audit.post('/calculate_weekly_merit', calculateWeeklyMerit);

module.exports = audit;
