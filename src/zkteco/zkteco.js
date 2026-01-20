const ZKLib = require("zklib-js");

// Device config
const DEVICE_IP = process.env.ZKTECO_DEVICE_IP;
const DEVICE_PORT = Number(process.env.ZK_PORT || 4370);
const IN_PORT = Number(process.env.ZK_IN_PORT || 5200);
const TIMEOUT = Number(process.env.ZK_TIMEOUT || 5000);


// Normalize whatever the library returns into your own event shape
function normalizeRtEvent(raw) {
  return {
    deviceIp: DEVICE_IP,
    ts: raw?.time || raw?.timestamp || new Date().toISOString(),
    pin: raw?.userId || raw?.uid || raw?.pin || raw?.id || null,
    verifyType: raw?.verifyType ?? null,
    eventType: raw?.eventType ?? "EVENTLOG",
    inOut: raw?.inOut ?? raw?.state ?? null,
    raw,
  };
}

async function start() {
  const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, IN_PORT, TIMEOUT);

  while (true) {
    try {
      console.log("Connecting to device...");
      await zk.createSocket();

      try {
        const info = await zk.getInfo?.();
        if (info) console.log("Device info:", info);
      } catch {
        console.error("Failed to get device info");
      }

      try {
        await zk.setTime?.(new Date());
        console.log("Time sync ok");
      } catch {
        console.error("Failed to set time");
      }

      console.log("Listening for realtime events on UDP port", IN_PORT);

      await zk.getRealTimeLogs(async (raw) => {
        const evt = normalizeRtEvent(raw);
        console.log("RT EVENT:", evt);

        // TODO: Save to DB, push to Discord, send to Odoo, etc.
        // Important: dedupe using (pin + ts + eventType) or a logId if provided
      });
    } catch (err) {
      console.error("Device loop error:", err?.message || err);
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
}

start().catch(console.error);
