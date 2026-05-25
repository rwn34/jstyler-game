# D1 Migrations

## Applying migrations

### Remote (production)

```bash
npx wrangler d1 execute ndj-metrics-db --remote --file=migrations/001_indices.sql
```

### Local (dev)

```bash
npx wrangler d1 execute ndj-metrics-db --local --file=migrations/001_indices.sql
```

## Migration log

| File | Description | Date |
|------|-------------|------|
| 001_indices.sql | Add performance indices on events, sessions, sync_states | 2026-05-26 |
