# RedirectPreflight opportunity

## Selected problem

SEO engineers and web migration teams often prepare redirect rules in a spreadsheet before the old host, new host, CDN rule, or CMS configuration is available to crawl. Conflicting sources, loops, chains, temporary status codes, fragments, host mistakes, and transport downgrades can therefore survive until launch.

RedirectPreflight checks that planned graph locally. Its direct-map output replaces resolvable chains with terminal destinations and omits rules that cannot be deployed safely.

## Current evidence

Google Search Central recommends server-side permanent redirects such as 301 and 308 for site moves, advises pointing directly to final destinations, and says to avoid chains. RFC 9110 defines the redirect status semantics. Cloudflare supports static bulk redirect lists across account domains.

Screaming Frog can upload a URL list, follow deployed redirects, and report chains and loops. Its paid licence is $279 per year, while its free crawler is capped at 500 URLs. That establishes both an existing workflow and a paid market. RedirectPreflight does not replace a crawler: it operates earlier, while the route graph exists only as a map.

Sources:

- https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- https://developers.google.com/search/docs/crawling-indexing/301-redirects
- https://www.rfc-editor.org/rfc/rfc9110.html
- https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/
- https://www.screamingfrog.co.uk/seo-spider/user-guide/general/
- https://www.screamingfrog.co.uk/seo-spider/faq/

Sources were reviewed on 2026-08-01.

## Alternatives rejected

Webhook retry budgeting has clear technical need: Svix publishes an exponential schedule and starts its professional service at $490 per month, while Stripe retries live deliveries for up to three days. It overlaps FixtureSafe's webhook domain and would have a narrower acquisition path.

Campaign-link governance also has paid demand. UTM.io starts rule enforcement on its $19 monthly plan and charges more for broader parameter rules. A useful first release would repeat ImportDryRun's tabular contract workflow too closely.

## Commercial hypothesis

The free product checks one map. Team would add shared versions, approvals, inventory coverage, Cloudflare and other platform exports, CI checks, and launch history at [TARGET] $24 per workspace per month. Demand, willingness to pay, customers, and revenue are unverified.
