const pino = require("pino");
const {
  createGcpLoggingPinoConfig,
} = require("@google-cloud/pino-logging-gcp-config");

/**
 * Construct a pino logger configured for Google Cloud Logging.
 * The implementation first tries to obtain config from
 * @google-cloud/pino-logging-gcp-config and falls back to sane defaults.
 */
function createLogger(overrides = {}) {
  const service = process.env.SERVICE_NAME || "vapi";
  const version = process.env.SERVICE_VERSION || "1.0.0";
  const level = process.env.LOG_LEVEL || "info";
  const isProduction = Boolean(process.env.K_SERVICE);

  let gcpConfig = {};
  if (isProduction) {
    gcpConfig = createGcpLoggingPinoConfig(
      {
        serviceContext: { service, version },
      },
      {
        level,
      },
    );
  } else {
    console.warn("Development mode, using local logging config only:");
  }

  const baseConfig = {
    level,
    messageKey: "message",
    formatters: {
      level(label, number) {
        // Maintain the Cloud Logging severity field when running locally.
        return { severity: label.toUpperCase(), level: number };
      },
    },
    ...gcpConfig,
    ...overrides,
  };

  return pino(baseConfig);
}

module.exports = {
  createLogger,
};
