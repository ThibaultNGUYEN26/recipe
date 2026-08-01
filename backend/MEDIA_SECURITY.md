# Media security

Profile pictures are stored as `MediaAsset` records. New bytes are written to private quarantine, signature-checked, decoded by Sharp, dimension-checked, re-encoded without metadata, cropped to square WebP variants, and moderated. Only an explicit `approved` moderation result moves variants into approved storage and changes `User.avatarUrl`.

`review_required`, `pending`, `failed`, and `rejected` media are never returned as a public avatar. The previous approved avatar remains active. Users can replace pending/rejected submissions, and administrators can list and resolve manual-review items through `/api/media/review` and `/api/media/:id/review`.

## Moderation provider contract

Set `MEDIA_MODERATION_ENDPOINT` and `MEDIA_MODERATION_API_KEY` in production. The backend sends a JSON request containing:

```json
{
  "kind": "avatar",
  "mimeType": "image/webp",
  "checks": ["nudity", "sexual", "violence", "gore", "hate_symbols", "weapons", "drugs", "abusive_text", "spam"],
  "data": "base64-encoded processed image"
}
```

The provider must return:

```json
{
  "decision": "approved | review_required | rejected",
  "provider": "provider-name",
  "categories": { "nudity": 0.01 },
  "rejectionCategory": null
}
```

Missing credentials, timeouts, transport errors, invalid responses, and unknown decisions fail closed and leave the asset private. `MEDIA_MODERATION_DEV_DECISION` is available only outside production; use `review_required` unless a local test explicitly needs another result.

## Deployment

The default filesystem adapter expects `MEDIA_STORAGE_ROOT` to be private and persistent. In a multi-instance or ephemeral deployment, replace the storage adapter with private object storage while preserving its quarantine/approved interface. Configure `MEDIA_SIGNING_SECRET` independently from `JWT_SECRET`.

Run migrations and regenerate Prisma before starting the updated API:

```bash
npx prisma migrate deploy
npx prisma generate
```
