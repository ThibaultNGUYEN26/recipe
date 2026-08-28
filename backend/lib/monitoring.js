import * as Sentry from "@sentry/node";
import process from "node:process";

const alertTimes = new Map();
const recentServerErrors = [];

export function initializeMonitoring() {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    release: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.05),
    sendDefaultPii: false,
  });
  return true;
}

export function captureOperationalFailure(name, error, context = {}) {
  if (!Sentry.isEnabled()) return;
  Sentry.withScope((scope) => {
    scope.setTag("operation", name);
    scope.setContext("operation", context);
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

export function captureOperationalAlert(name, message, context = {}, cooldownMs = 15 * 60 * 1000) {
  if (!Sentry.isEnabled()) return;
  const now = Date.now();
  if (now - (alertTimes.get(name) || 0) < cooldownMs) return;
  alertTimes.set(name, now);
  Sentry.withScope((scope) => {
    scope.setTag("operation", name);
    scope.setContext("operation", context);
    Sentry.captureMessage(message, "warning");
  });
}

export function installExpressErrorMonitoring(app) {
  if (Sentry.isEnabled()) Sentry.setupExpressErrorHandler(app);
  app.use((error, req, res, next) => {
    captureOperationalFailure("unhandled-request", error, {
      method: req.method,
      path: req.path,
      status: error.statusCode || error.status || 500,
    });
    if (res.headersSent) return next(error);
    res.status(error.statusCode || error.status || 500).json({ error: "Internal server error" });
  });
}

export function monitorServerErrors(req, res, next) {
  res.once("finish", () => {
    if (res.statusCode < 500) return;
    const now = Date.now();
    recentServerErrors.push(now);
    while (recentServerErrors[0] < now - 5 * 60 * 1000) recentServerErrors.shift();
    if (recentServerErrors.length >= 5) {
      captureOperationalAlert("elevated-5xx", "Elevated HTTP 5xx response rate", {
        count: recentServerErrors.length,
        windowMinutes: 5,
        latestMethod: req.method,
        latestPath: req.path,
        latestStatus: res.statusCode,
      }, 5 * 60 * 1000);
    }
  });
  next();
}
