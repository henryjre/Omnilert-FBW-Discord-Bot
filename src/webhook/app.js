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

app.all("/iclock/cdata", (req, res) => {
  const { options, SN } = req.query;

  // Device is requesting PushOptions configuration
  if (options === "all") {
    // Tell device what to push + how often to poll
    // These keys are what many ZKTeco firmwares expect (BioTime-like).
    const pushOptions =
      "GET OPTION FROM: " + SN + "\n" +
      "Stamp=9999\n" +
      "ErrorDelay=30\n" +
      "Delay=10\n" +
      "TransTimes=00:00;23:59\n" +
      "TransInterval=1\n" +
      "TransFlag=1111111111\n" +
      "Realtime=1\n" +
      "Encrypt=0\n";

    res.set("Content-Type", "text/plain");
    return res.send(pushOptions);
  }

  console.log("CDATA query:", req.query);
  console.log("CDATA body:", req.body);
  res.type("text/plain").send("OK");
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
