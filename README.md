# RedirectPreflight

RedirectPreflight checks a planned redirect map before the rules reach a server. SEO engineers and migration teams can find redirect loops, chains, conflicting sources, wrong status intent, host drift, HTTPS downgrades, source fragments, query loss, and homepage catch-alls in the browser.

The direct-map output replaces resolvable chains with their terminal destinations. It excludes conflicts, loops, self-redirects, malformed rows, and source fragments that a server cannot receive.

## Local setup

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The routing desk includes a risky map and a launch-ready map.

## Input

Provide source and target origins, declare whether the migration is permanent or temporary, then paste CSV with these headers:

```csv
source,target,status
/old-page,/new-page,301
```

Sources and targets may be absolute HTTP(S) URLs or root-relative paths. Version 0.1 accepts up to 1,000,000 input characters and 5,000 redirect rows.

## Verification

```bash
pnpm verify
pnpm audit --prod
```

The first command checks formatting, lint, TypeScript, tests, the production build, and the IAMUVIN signature gate.

## What remains outside the check

Static analysis cannot prove deployed response codes, destination availability, CDN or CMS rule order, cache behavior, query preservation, or how a crawler interprets the live site. Run an HTTP crawl after deployment.

## Monetization status

One map is free. Demand, price acceptance, customers, and revenue are unverified.

---

Built by Uvin Vindula — [iamuvin.com](https://iamuvin.com)
