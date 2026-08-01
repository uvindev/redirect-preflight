/** @author Uvin Vindula (IAMUVIN) @website https://iamuvin.com */
import { Workbench } from "@/app/_components/workbench";
import { IntentLink } from "@/components/intent-link";

export default function HomePage() {
  const email = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || "hello@iamuvin.com";
  const checkout = process.env.NEXT_PUBLIC_TEAM_CHECKOUT_URL;
  const teamHref =
    checkout || `mailto:${email}?subject=RedirectPreflight%20Team%20pilot`;
  return (
    <main id="top">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="RedirectPreflight home">
          <span>RP</span> RedirectPreflight
        </a>
        <nav aria-label="Primary navigation">
          <a href="#preflight">Preflight</a>
          <a href="#boundary">Boundary</a>
          <a href="#team">Team</a>
        </nav>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-index">
          <span>BUILD</span>
          <strong>06</strong>
          <small>MAP / BEFORE SERVER</small>
        </div>
        <div className="hero-copy">
          <p className="kicker">Site migration routing check</p>
          <h1 id="hero-title">
            A redirect crawler is late if the map is still in a spreadsheet.
          </h1>
          <p>
            Inspect the route graph before launch. Find loops, chains,
            conflicting sources, host drift, status mistakes, and HTTPS
            downgrades without uploading the map.
          </p>
          <a className="primary-link" href="#preflight">
            Inspect the supplied map
          </a>
        </div>
        <aside className="route-key" aria-label="Route finding legend">
          <p>ROUTE KEY / RFC 9110</p>
          <div>
            <b>301</b>
            <span>permanent / method may change</span>
          </div>
          <div>
            <b>308</b>
            <span>permanent / method preserved</span>
          </div>
          <div>
            <b>302</b>
            <span>temporary / method may change</span>
          </div>
          <div>
            <b>307</b>
            <span>temporary / method preserved</span>
          </div>
        </aside>
      </section>

      <Workbench />

      <section
        className="boundary"
        id="boundary"
        aria-labelledby="boundary-title"
      >
        <div>
          <p className="kicker">Evidence boundary</p>
          <h2 id="boundary-title">
            The map can pass while the deployed redirect still fails.
          </h2>
        </div>
        <div className="boundary-notes">
          <article>
            <span>01</span>
            <div>
              <strong>Static graph only</strong>
              <p>
                No request reaches the source host, destination host, CDN, CMS,
                or redirect service.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <strong>Runtime checks remain</strong>
              <p>
                After deployment, crawl response codes, final destinations,
                cache behavior, and platform rule order.
              </p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <strong>Query policy needs an owner</strong>
              <p>
                A warning identifies possible query loss. It cannot decide
                whether removal is correct for the migration.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="team" id="team" aria-labelledby="team-title">
        <div>
          <p className="kicker">Commercial hypothesis</p>
          <h2 id="team-title">
            One map is free. Agencies need review history tied to every launch.
          </h2>
          <p>
            Team would add shared versions, approvals, inventory coverage,
            Cloudflare and platform exports, CI checks, and launch history.
            Price and demand are unverified.
          </p>
        </div>
        <aside>
          <span>TEAM / TARGET</span>
          <strong>$24</strong>
          <small>per workspace / month</small>
          <IntentLink event="team_interest" href={teamHref}>
            Request a Team pilot
          </IntentLink>
        </aside>
      </section>

      <footer>
        <div>
          <span>RedirectPreflight 0.1</span>
          <span>Map analysis stays local</span>
        </div>
        <IntentLink
          event="feedback_intent"
          href={`mailto:${email}?subject=RedirectPreflight%20feedback`}
        >
          Send product feedback
        </IntentLink>
        <span>
          Built by{" "}
          <a
            href="https://iamuvin.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Uvin Vindula
          </a>
        </span>
      </footer>
    </main>
  );
}
