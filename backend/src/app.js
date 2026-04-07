const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const apiRoutes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { getDbHealth, isDbConnected } = require("./config/db");

const app = express();

app.use(
  express.json({
    limit: "2mb",
    verify: (req, res, buffer) => {
      req.rawBody = buffer;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
  })
);
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  const db = getDbHealth();
  const degraded = !isDbConnected();

  res.status(200).json({
    ok: true,
    degraded,
    mode: degraded ? "json-fallback" : "mongo",
    service: "shivam-sports-api",
    now: new Date().toISOString(),
    db,
    features: {
      publicCatalog: true,
      publicContent: true,
      account: !degraded,
      admin: !degraded,
      orders: !degraded,
    },
  });
});

app.use("/api", apiRoutes);

const frontendPath = path.join(__dirname, "../../frontend");
const assetsPath = path.join(__dirname, "../../assets");
app.use("/assets", express.static(assetsPath));
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
