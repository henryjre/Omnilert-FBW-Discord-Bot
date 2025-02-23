// Bring in our dependencies
const express = require("express");
const crypto = require("crypto");
const { exec } = require("child_process");
// const helmet = require('helmet');
const app = express();
// const routes = require("./routes");
// const shopRoutes = require("./shopRoutes");
const PORT = process.env.PORT || 3000;
const SECRET = process.env.githubSecret;

const authenticate = require("./auth");

// app.use(helmet());

app.use(express.json());

// app.use("/shops", shopRoutes);
// app.use("/api", authenticate, routes);

app.post("/github-webhook", (req, res) => {
  const signature = `sha256=${crypto
    .createHmac("sha256", SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex")}`;

  const isAllowed = req.headers["x-hub-signature-256"] === signature;

  if (!isAllowed) {
    return res.status(401).send("Unauthorized");
  }

  console.log("Received push event from GitHub. Pulling latest changes...");

  exec("git diff --name-only HEAD^ HEAD", (err, stdout) => {
    if (err) return console.error(`Error checking changes: ${err}`);

    let cmd = "cd /opt/omnilert-bot && git pull origin main";

    if (stdout.includes("package.json")) {
      cmd += " && npm install";
    }

    cmd += " && pm2 restart discord-bot";

    exec(cmd, (err, stdout, stderr) => {
      if (err) console.error(`Error: ${stderr}`);
      console.log(`Deployment output: ${stdout}`);
    });
  });
});

// Turn on that server!
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
