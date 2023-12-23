const checkAuthenticationSomehow = (req) => {
  const providedApiKey = req.headers["x-api-key"];
  if (providedApiKey && providedApiKey === process.env.apiKey) {
    return true;
  }
  return false;
};

const authenticate = (req, res, next) => {
  const isAuthenticated = checkAuthenticationSomehow(req);

  if (isAuthenticated) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = authenticate;
