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

const authenticate = require('./auth');

// app.use(helmet());

app.use(express.json());

app.use('/odoo', odooRoutes);
// app.use("/api", authenticate, routes);

app.post('/github-webhook', (req, res) => {
  const signature = `sha256=${crypto
    .createHmac('sha256', SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex')}`;

  const isAllowed = req.headers['x-hub-signature-256'] === signature;

  if (!isAllowed) {
    return res.status(401).send('Unauthorized');
  }

  console.log('Received push event from GitHub. Pulling latest changes...');

  exec(
    'cd /root/omnilert-discord-bot && git pull origin main && npm install && pm2 restart discord-bot',
    (err, stdout, stderr) => {
      if (err) {
        console.error(`Error: ${stderr}`);
        return res.status(500).send('Deployment failed.');
      }
      console.log(`Deployment output: ${stdout}`);
      res.status(200).send('Deployed successfully!');
    }
  );
});

// Turn on that server!
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
