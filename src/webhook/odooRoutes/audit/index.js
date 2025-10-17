const audit = require('express').Router();
const { storeCCTVSpotAudit } = require('./storeAudit');

// /odoo/audit/store_cctv_audit
audit.post('/store_cctv_audit', storeCCTVSpotAudit);

module.exports = audit;
