const { connectDb, getDbHealth, isDbConnected, isDbDisabled } = require("../config/db");

async function requireDatabase(req, res, next) {
  if (isDbConnected()) {
    next();
    return;
  }

  if (isDbDisabled()) {
    return res.status(503).json({
      message:
        "Database is disabled by configuration. Set MONGO_DISABLED=false and provide a valid MONGO_URI to enable account, order, career application, and admin actions.",
      db: getDbHealth(),
    });
  }

  await connectDb({ allowFailure: true });
  if (isDbConnected()) {
    next();
    return;
  }

  res.status(503).json({
    message:
      "Database is currently unavailable. Public catalog pages are still available, but account, order, career application, and admin actions are temporarily disabled.",
    db: getDbHealth(),
  });
}

module.exports = { requireDatabase };
