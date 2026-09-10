# Feature modules

Cinema-first domains. **New code** should import from `@features/<domain>`.

| Folder | Domain |
|--------|--------|
| `home` | Fan premiere home, region, trending |
| `film` | Title pages, trailers, profile watch |
| `premiere` | Ticketed events, premiere room |
| `creator` | Filmmaker studio |
| `live` | Profile lives + embed engine |
| `discover` | Explore, clips, communities |
| `user` | Auth, profile, inbox |
| `payments` | Paystack checkout + server verify |

**Phase 5:** `premiere/lib/myTickets`, `MyTicketsPage`, payment recovery. Core libs migrate into `features/` with shims at old paths.

Implementation files still live under `pages/` and `components/` while we migrate; barrels re-export for stable imports.
