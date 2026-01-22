const express = require("express");
const router = express.Router();
const { toggleAttendance } = require("../../odooRpc");

// Store registered devices
const devices = new Map();

// Parse URL-encoded and text bodies
router.use(express.urlencoded({ extended: true }));
router.use(express.text({ type: "*/*" }));

/**
 * Device Registry (F22 and newer devices use this)
 * POST /iclock/registry?SN=XXXXX
 */
router.post("/registry", (req, res) => {
  const { SN } = req.query;

  console.log(`[ADMS] Registry request: SN=${SN}`);

  // Register device
  devices.set(SN, {
    serialNumber: SN,
    lastSeen: new Date(),
    registered: true
  });

  // Response tells device the server is ready
  const response = [
    `RegistryCode=200`,
    `ServerVersion=3.1.2`,
    `ServerName=ADMS`,
    `PushProtVer=3.1.2`,
    `ErrorDelay=60`,
    `RequestDelay=10`,
    `TransInterval=1`,
    `TransFlag=TransData AttLog OpLog`,
    `Realtime=1`,
    `Encrypt=0`,
    `SupportPing=1`
  ].join("\r\n");

  res.set("Content-Type", "text/plain");
  res.status(200).send(response);
});

/**
 * Device Handshake (older protocol / options request)
 * GET /iclock/cdata?SN=XXXXX&options=all
 */
router.get("/cdata", (req, res) => {
  const { SN, options, pushver } = req.query;

  console.log(`[ADMS] Options request: SN=${SN}, options=${options}, pushver=${pushver}`);

  // Update device
  if (devices.has(SN)) {
    devices.get(SN).lastSeen = new Date();
  } else {
    devices.set(SN, {
      serialNumber: SN,
      lastSeen: new Date(),
      pushVersion: pushver
    });
  }

  // Return stamps to tell device what data to send
  const response = [
    `ATTLOGStamp=0`,
    `OPERLOGStamp=0`,
    `ATTPHOTOStamp=0`
  ].join("\r\n");

  res.set("Content-Type", "text/plain");
  res.status(200).send(response);
});

/**
 * Device Posts Attendance Data
 * POST /iclock/cdata?SN=XXXXX&table=ATTLOG&Stamp=XXXXX
 */
router.post("/cdata", (req, res) => {
  const { SN, table } = req.query;
  const body = req.body;

  // Update device last seen
  if (devices.has(SN)) {
    devices.get(SN).lastSeen = new Date();
  }

  let recordCount = 0;

  // Real-time attendance log (when someone punches)
  if (table === "rtlog" && body) {
    console.log(`[ADMS] Real-time log from ${SN}:`, body);

    // F22 format: key=value pairs separated by tabs
    const data = {};
    const parts = typeof body === "string" ? body.split("\t") : [];

    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key && value !== undefined) {
        data[key.trim()] = value.trim();
      }
    }

    const attendance = {
      odoo_badge_id: data.pin || null,              // Employee ID
      timestamp: data.time || null,                  // DateTime
      status: parseInt(data.inoutstatus) || 0,       // 0=Check-in, 1=Check-out
      verify: parseInt(data.verifytype) || 0,        // 1=Fingerprint, etc.
      event: parseInt(data.event) || 0,
      cardno: data.cardno || null,
      deviceSN: SN
    };

    console.log("[ADMS] *** ATTENDANCE EVENT ***:", attendance);
    recordCount = 1;

    // Toggle attendance in Odoo (check-in or check-out)
    if (attendance.odoo_badge_id) {
      toggleAttendance(attendance.odoo_badge_id, attendance.timestamp)
        .then(result => {
          console.log("[ADMS] Odoo attendance result:", result);
        })
        .catch(error => {
          console.error("[ADMS] Error toggling attendance:", error.message);
        });
    }
  }

  // Real-time state (device status updates)
  if (table === "rtstate" && body) {
    console.log(`[ADMS] Device state from ${SN}:`, body);
  }

  // Batch attendance logs (historical data)
  if (table === "ATTLOG" && body) {
    console.log(`[ADMS] Batch attendance from ${SN}:`, body);

    const lines = typeof body === "string" ? body.trim().split("\n") : [];
    recordCount = lines.length;

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split("\t");

      const attendance = {
        odoo_badge_id: parts[0],
        timestamp: parts[1],
        status: parseInt(parts[2]) || 0,
        verify: parseInt(parts[3]) || 0,
        workCode: parts[4] || "",
        deviceSN: SN
      };

      console.log("[ADMS] Batch Attendance:", attendance);
    }
  }

  res.type("text/plain").send(`OK: ${recordCount}`);
});

/**
 * Device requests commands
 * GET /iclock/getrequest?SN=XXXXX
 */
router.get("/getrequest", (req, res) => {
  const { SN } = req.query;

  // Return empty OK if no commands to send
  res.type("text/plain").send("OK");
});

/**
 * Device confirms command execution
 * POST /iclock/devicecmd?SN=XXXXX
 */
router.post("/devicecmd", (req, res) => {
  const { SN } = req.query;
  const body = req.body;

  console.log(`[ADMS] Command result from SN=${SN}:`, body);

  res.type("text/plain").send("OK");
});

/**
 * Get registered devices (for debugging)
 */
router.get("/devices", (req, res) => {
  const deviceList = Array.from(devices.values());
  res.json(deviceList);
});

module.exports = router;
