import pino from "pino";

const redactPaths = [
  "apiKey",
  "*.apiKey",
  "OPENAI_API_KEY",
  "*.OPENAI_API_KEY",
  "authorization",
  "*.authorization",
  "Authorization",
  "*.Authorization",
  "headers.authorization",
  "headers.Authorization",
  "*.headers.authorization",
  "*.headers.Authorization",
  "req.headers.authorization",
  "req.headers.Authorization",
];

export const loggerOptions = {
  redact: {
    paths: redactPaths,
    censor: "[Redacted]",
  },
};

export function createLogger(destination) {
  if (destination) {
    return pino(loggerOptions, destination);
  }

  return pino(loggerOptions);
}

export const logger = createLogger();
