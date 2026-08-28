// Bring in our dependencies
const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const app = express();

// Routes
const odooRoutes = require('./odooRoutes');
const zktecoRoutes = require('./zkteco/routes');
const websiteRoutes = require('./websiteRoutes');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.githubSecret;
const SQLITE_BINDING_CHECK =
  `node -e "const Database=require('better-sqlite3'); const db=new Database(':memory:'); db.close();"`;
const DEPLOY_COMMAND = [
  'cd /root/omnilert-discord-bot',
  'git pull --ff-only origin main',
  'pnpm install --frozen-lockfile --config.confirmModulesPurge=false',
  `(${SQLITE_BINDING_CHECK} || pnpm rebuild better-sqlite3)`,
  SQLITE_BINDING_CHECK,
  'pm2 restart discord-bot --update-env',
].join(' && ');

function captureRawBody(req, res, buf) {
  req.rawBody = buf.toString('utf8');
}

// Mount routes
app.use("/odoo", express.json(), odooRoutes);
app.use("/iclock", zktecoRoutes);
app.use("/website", express.json({ verify: captureRawBody }), websiteRoutes);

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
      DEPLOY_COMMAND,
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


// Turn on that server!
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT} `);
});
