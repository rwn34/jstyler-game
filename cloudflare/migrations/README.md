# D1 Migrations

## Applying migrations

### Remote (production)

```bash
npx wrangler d1 execute ndj-metrics-db --remote --file=migrations/001_indices.sql
npx wrangler d1 execute ndj-metrics-db --remote --file=migrations/002_stats_daily.sql
```

### Local (dev)

```bash
npx wrangler d1 execute ndj-metrics-db --local --file=migrations/001_indices.sql
npx wrangler d1 execute ndj-metrics-db --local --file=migrations/002_stats_daily.sql
```

### After applying 002: backfill aggregation

After deploying the worker with Phase 4 code and applying the migration, run a one-shot backfill:

```bash
curl -X POST "https://<worker-url>/admin/aggregate?days=30" -H "Cookie: ndj_dash=<your-auth-cookie>"
```

This populates `stats_daily` for the last 30 days. The hourly cron will keep it current after that.

## Migration log

| File | Description | Date |
|------|-------------|------|
| 001_indices.sql | Add performance indices on events, sessions, sync_states | 2026-05-26 |
| 002_stats_daily.sql | Pre-aggregated daily stats, retention, player flags, feedback status | 2026-05-26 |
