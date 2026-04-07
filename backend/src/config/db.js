const mongoose = require("mongoose");

const DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017/shivam_sports";
const DISABLED_MONGO_URI_VALUES = new Set(["disabled", "off", "none", "false", "null"]);
const READY_STATE_LABELS = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

let connectionEventsBound = false;
let connectionPromise = null;
let lastConnectionError = null;
let lastFailureAt = 0;
let disableNoticePrinted = false;
let lastLoggedErrorSignature = "";

function parseBoolean(rawValue) {
  const normalized = String(rawValue || "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function parsePositiveInteger(rawValue, fallbackValue) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return Math.floor(parsed);
}

function normalizeMongoUri(rawValue) {
  return String(rawValue || "").trim();
}

function resolveMongoConfig() {
  const configuredUri = normalizeMongoUri(process.env.MONGO_URI);
  if (parseBoolean(process.env.MONGO_DISABLED)) {
    return {
      mongoUri: null,
      disabled: true,
      reason: "MONGO_DISABLED=true",
    };
  }

  if (configuredUri && DISABLED_MONGO_URI_VALUES.has(configuredUri.toLowerCase())) {
    return {
      mongoUri: null,
      disabled: true,
      reason: `MONGO_URI=${configuredUri}`,
    };
  }

  return {
    mongoUri: configuredUri || DEFAULT_MONGO_URI,
    disabled: false,
    reason: null,
  };
}

function isConnectionRefusedError(error) {
  return (
    error?.name === "MongoServerSelectionError" &&
    String(error?.message || "").includes("ECONNREFUSED")
  );
}

function isDefaultLocalUri(uri = "") {
  const normalized = String(uri || "").toLowerCase();
  return (
    normalized === DEFAULT_MONGO_URI.toLowerCase() ||
    normalized.startsWith("mongodb://127.0.0.1:27017/")
  );
}

function toConnectionErrorMessage(error, mongoUri) {
  if (isConnectionRefusedError(error) && isDefaultLocalUri(mongoUri)) {
    return "connect ECONNREFUSED 127.0.0.1:27017. Start MongoDB locally or set MONGO_URI to your MongoDB Atlas connection string.";
  }

  return error?.message || "Unknown MongoDB connection error";
}

function logUnavailableError(error, mongoUri) {
  const message = toConnectionErrorMessage(error, mongoUri);
  if (lastLoggedErrorSignature === message) return;
  lastLoggedErrorSignature = message;
  console.warn(
    `MongoDB unavailable (${message}). Public pages will continue with bundled JSON fallback data.`
  );
}

function bindConnectionEvents() {
  if (connectionEventsBound) return;
  connectionEventsBound = true;

  mongoose.connection.on("connected", () => {
    lastConnectionError = null;
    lastFailureAt = 0;
    lastLoggedErrorSignature = "";
    console.log(`MongoDB connected (${mongoose.connection.name})`);
  });

  mongoose.connection.on("error", (error) => {
    lastConnectionError = error;
    lastFailureAt = Date.now();
    const { mongoUri } = resolveMongoConfig();
    logUnavailableError(error, mongoUri);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function isDbDisabled() {
  return resolveMongoConfig().disabled;
}

async function connectDb(options = {}) {
  const { allowFailure = false, forceRetry = false } = options;
  const { mongoUri, disabled, reason } = resolveMongoConfig();
  const serverSelectionTimeoutMs = parsePositiveInteger(
    process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
    5000
  );
  const retryCooldownMs = parsePositiveInteger(process.env.MONGO_RETRY_COOLDOWN_MS, 15000);

  mongoose.set("strictQuery", true);
  bindConnectionEvents();

  if (disabled || !mongoUri) {
    if (!disableNoticePrinted) {
      console.warn(
        `MongoDB disabled via configuration (${reason}). Public pages will use bundled JSON fallback data.`
      );
      disableNoticePrinted = true;
    }
    return null;
  }
  disableNoticePrinted = false;

  if (isDbConnected()) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2 && connectionPromise) {
    return connectionPromise;
  }

  if (
    allowFailure &&
    !forceRetry &&
    lastFailureAt &&
    Date.now() - lastFailureAt < retryCooldownMs
  ) {
    return null;
  }

  connectionPromise = mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: serverSelectionTimeoutMs,
    })
    .then(() => {
      lastConnectionError = null;
      return mongoose.connection;
    })
    .catch(async (error) => {
      lastConnectionError = error;
      lastFailureAt = Date.now();
      logUnavailableError(error, mongoUri);

      if (mongoose.connection.readyState !== 0) {
        try {
          await mongoose.disconnect();
        } catch (disconnectError) {
          // Ignore disconnect failures because the original connect failure is the useful signal.
        }
      }

      if (!allowFailure) {
        throw error;
      }

      return null;
    })
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
}

async function disconnectDb() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
}

function getDbHealth() {
  const { disabled, reason } = resolveMongoConfig();
  if (disabled) {
    return {
      readyState: 0,
      status: "disabled",
      host: null,
      name: null,
      lastError: null,
      disabled: true,
      reason,
    };
  }

  const readyState = mongoose.connection.readyState;
  return {
    readyState,
    status: READY_STATE_LABELS[readyState] || "unknown",
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
    lastError: lastConnectionError?.message || null,
    disabled: false,
    reason: null,
  };
}

module.exports = {
  connectDb,
  disconnectDb,
  getDbHealth,
  isDbConnected,
  isDbDisabled,
  DEFAULT_MONGO_URI,
};
