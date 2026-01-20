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

app.use(express.json());

app.use('/odoo', odooRoutes);
// app.use("/api", authenticate, routes);

app.post('/github-webhook', express.raw({ type: '*/*' }), (req, res) => {
  try {
    const sig256 = req.get('x-hub-signature-256') || '';
    const body = req.body; // Buffer

    if (!SECRET) {
      return res.status(500).send('Server misconfigured: githubSecret is missing.');
    }

    const hmac = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
    const expected = `sha256=${hmac}`;

    const valid =
      sig256.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(sig256), Buffer.from(expected));

    if (!valid) {
      return res.status(401).send('Unauthorized');
    }

    res.status(200).send('OK');

    console.log('GitHub webhook verified. Pulling latest changes...');

    exec(
      'cd /root/omnilert-discord-bot && git pull origin main && npm install && pm2 restart discord-bot',
      (err, stdout, stderr) => {
        if (err) {
          console.error('Deployment failed:', stderr || err.message);
          return;
        }
        console.log('Deployment output:', stdout);
      }
    );
  } catch (e) {
    console.error('Webhook error:', e);
    if (!res.headersSent) res.status(500).send('Server error');
  }
});


app.use(express.text({ type: "*/*" }));

app.all("/iclock/cdata", (req, res) => {
  console.log("cdata query:", req.query);
  console.log("cdata body:\n", req.body);

  res.send("OK");
});

// Turn on that server!
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
