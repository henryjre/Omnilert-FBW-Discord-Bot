// Bring in our dependencies
const express = require("express");
// const helmet = require('helmet');
const app = express();
const routes = require("./routes");
const shopRoutes = require("./shopRoutes");
const PORT = process.env.PORT || 3000;

const authenticate = require("./auth");

// app.use(helmet());

app.use(express.json());

app.use("/shops", shopRoutes);
app.use("/api", authenticate, routes);

// Turn on that server!
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
