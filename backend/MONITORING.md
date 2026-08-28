# Production monitoring

## Sentry

Create a Sentry Node.js project and set `SENTRY_DSN` in the Railway recipe service. Set
`SENTRY_ENVIRONMENT=production`. Exceptions, unhandled 5xx errors, email-delivery failures,
moderation-provider failures, slow database checks, and media-volume warnings are then reported.

Recommended Sentry alerts:

- Any new error: notify immediately.
- 5xx errors: notify when at least 5 occur in 5 minutes.
- `operation:email-delivery`: notify on the first event.
- `operation:media-moderation`: notify on the first event.
- `operation:database-readiness`: notify on the first event.
- `operation:media-disk-usage`: notify on the first event.

## Health endpoints

- `/health/live` checks that the Node process responds.
- `/health/ready` checks PostgreSQL connectivity and latency, media-volume readability and
  writability, and media-volume capacity. Railway uses this readiness endpoint for deployments.

Defaults can be changed with `DB_LATENCY_WARNING_MS`, `MEDIA_DISK_WARNING_PERCENT`, and
`MEDIA_DISK_CRITICAL_PERCENT`. A critical disk reading makes readiness return HTTP 503.

## External uptime

`.github/workflows/uptime.yml` checks the public frontend and API readiness every five minutes.
Enable GitHub Actions notifications for failed workflows so repository owners receive alerts.
