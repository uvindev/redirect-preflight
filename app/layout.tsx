/**
 * @project  RedirectPreflight — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  Proprietary — all rights reserved
 */
import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { Signature } from "@/components/signature";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://iamuvin.com"),
  title: "RedirectPreflight — inspect redirect maps before launch",
  description:
    "Find redirect loops, chains, conflicts, status mistakes, and host drift in the browser before a site migration goes live.",
  authors: [{ name: "Uvin Vindula", url: "https://iamuvin.com" }],
  creator: "Uvin Vindula (IAMUVIN)",
  publisher: "ASI Research Labs",
  other: { developer: "Uvin Vindula — iamuvin.com" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "RedirectPreflight",
  applicationCategory: "DeveloperApplication",
  creator: {
    "@type": "Person",
    name: "Uvin Vindula",
    alternateName: "IAMUVIN",
    url: "https://iamuvin.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return (
    <html lang="en">
      <head>
        <meta name="author" content="Uvin Vindula — IAMUVIN" />
        <link rel="me" href="https://iamuvin.com" />
        <link rel="author" type="text/plain" href="/humans.txt" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body>
        <Signature />
        {domain ? (
          <Script
            defer
            data-domain={domain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
