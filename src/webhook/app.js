// Bring in our dependencies
const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
// const helmet = require('helmet');
const app = express();
// const routes = require("./routes");
const odooRoutes = require('./odooRoutes');
const PORT = process.env.PORT || 3000;
const SECRET = process.env.githubSecret;

// const authenticate = require('./auth');

// 1) JSON only for routes that need JSON
app.use("/odoo", express.json(), odooRoutes);

// 2) GitHub webhook must be RAW (Buffer) for signature verification
app.post("/github-webhook", express.raw({ type: "*/*" }), (req, res) => {
  try {
    const sig256 = req.get("x-hub-signature-256") || "";
    const body = req.body; // Buffer

    if (!SECRET) return res.status(500).send("Server misconfigured: githubSecret is missing.");

    const hmac = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
    const expected = `sha256=${hmac}`;

    const valid =
      sig256.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig256), Buffer.from(expected));

    if (!valid) return res.status(401).send("Unauthorized");

    res.type("text/plain").send("OK");

    console.log("GitHub webhook verified. Pulling latest changes...");

    exec(
      "cd /root/omnilert-discord-bot && git pull origin main && npm install && pm2 restart discord-bot",
      (err, stdout, stderr) => {
        if (err) {
          console.error("Deployment failed:", stderr || err.message);
          return;
        }
        console.log("Deployment output:", stdout);
      }
    );
  } catch (e) {
    console.error("Webhook error:", e);
    if (!res.headersSent) res.status(500).send("Server error");
  }
});



app.use((req, res, next) => {
  console.log("INCOMING:", req.method, req.originalUrl);
  next();
});


// 3) ZKTeco ADMS: parse as TEXT ONLY under /iclock
app.use("/iclock", express.text({ type: "*/*" }));

function pushOptionsResponse(sn) {
  const tz = "+08:00"; // Philippines
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stampTime =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    `GET OPTION FROM: ${sn}\r\n` +
    `ErrorDelay=60\r\n` +
    `Delay=30\r\n` +
    `TransTimes=00:00;23:59\r\n` +
    `TransInterval=1\r\n` +
    `TransFlag=AttLog\tOpLog\tAttPhoto\tEnrollUser\tChgUser\tEnrollFP\tChgFP\r\n` +
    `Realtime=1\r\n` +
    `Encrypt=0\r\n` +
    `TimeZone=${tz}\r\n` +
    `Timeout=60\r\n` +
    `SyncTime=3600\r\n` +
    `ServerVer=1.0\r\n` +
    `ATTLOGStamp=${stampTime}\r\n` +
    `OPERLOGStamp=${stampTime}\r\n` +
    `ATTPHOTOStamp=${stampTime}\r\n`
  );
}

app.all("/iclock/cdata", (req, res) => {
  const { options, SN } = req.query;

  if (options === "all") {
    res.set("Content-Type", "text/plain; charset=utf-8");
    return res.send(pushOptionsResponse(SN || ""));
  }

  // time sync request from device
  if (req.query.type === "time") {
    // If device asks for time, respond Time=...
    // (We can keep this too, many firmwares do it.)
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const timeStr =
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
      `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}+08:00`;

    res.set("Content-Type", "text/plain; charset=utf-8");
    return res.send(`Time=${timeStr}`);
  }

  console.log("CDATA query:", req.query);
  console.log("CDATA body:", req.body);
  return res.type("text/plain").send("OK");
});



app.post("/iclock/registry", (req, res) => {
  console.log("REGISTRY query:", req.query);
  console.log("REGISTRY body:", req.body);
  res.type("text/plain").send("OK");
});

app.get("/iclock/getrequest", (req, res) => {
  console.log("getrequest query:", req.query);
  res.type("text/plain").send("OK");
});

app.get("/iclock/devicecmd", (req, res) => {
  console.log("devicecmd query:", req.query);
  res.type("text/plain").send("OK");
});

// Turn on that server!
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
