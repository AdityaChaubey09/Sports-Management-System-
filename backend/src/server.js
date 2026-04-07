require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { connectDb, disconnectDb, isDbConnected, isDbDisabled } = require("./config/db");
const app = require("./app");

const PORT = Number(process.env.PORT) || 4000;
let server;

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }

    await disconnectDb();
    process.exit(0);
  } catch (error) {
    console.error("Graceful shutdown failed:", error.message);
    process.exit(1);
  }
}

async function start() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing. Add it to backend/.env");
    }
    await connectDb({ allowFailure: true });
    server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      if (!isDbConnected()) {
        if (isDbDisabled()) {
          console.warn(
            "MongoDB is disabled via env configuration. Starting in JSON fallback mode for public pages."
          );
        } else {
          console.warn(
            "MongoDB is unavailable. Starting in degraded mode with bundled JSON fallback for public pages."
          );
        }
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error?.message || error);
});

start();
