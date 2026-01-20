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

  return (
    `GET OPTION FROM: ${sn}\r\n` +
    `Stamp=0\r\n` +
    `OpStamp=0\r\n` +
    `PhotoStamp=0\r\n` +
    `ErrorDelay=30\r\n` +
    `Delay=10\r\n` +
    `TransTimes=00:00;14:05\r\n` +
    `TransInterval=1\r\n` +
    `TransFlag=1111000000\r\n` +
    `Realtime=1\r\n` +
    `Encrypt=0\r\n`
  );
}

app.all("/iclock/cdata", (req, res) => {
  const { options, SN } = req.query;
  if (options === "all") {
    console.log(`[HANDSHAKE] Device ${SN} is asking for options.`);
    res.set("Content-Type", "text/plain");
    return res.send(pushOptionsResponse(SN || ""));
  }
  if (req.method === 'POST' && !options) {
    console.log(`[DATA RECEIVED] from ${SN}`);
    console.log("Body Content:", req.body);
    res.set("Content-Type", "text/plain");
    return res.send("OK");
  }

  return res.type("text/plain").send("OK");
});

app.post("/iclock/registry", (req, res) => {
  console.log(`[REGISTRY] Device ${req.query.SN} is registering.`);
  res.set("Content-Type", "text/plain");
  res.send("Registry=OK");
});

// Keep these as they are strictly required for connectivity checks
app.get("/iclock/getrequest", (req, res) => res.type("text/plain").send("OK"));
app.get("/iclock/devicecmd", (req, res) => res.type("text/plain").send("OK"));

// Turn on that server!
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
