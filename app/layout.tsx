import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CCAPP — Cold Call Assistant",
  description:
    "Accessible cold calling web app with one-click Twilio calling and Gmail email integration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        {/* Skip to main content link — first focusable element for screen readers */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Navigation landmark */}
        <nav aria-label="Main navigation">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 24px",
              borderBottom: "1px solid var(--color-border)",
              backgroundColor: "var(--color-bg-secondary)",
            }}
          >
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                margin: 0,
                color: "var(--color-accent)",
              }}
            >
              CCAPP
            </h1>
            <div style={{ display: "flex", gap: "8px" }}>
              <a
                href="/"
                className="btn btn-secondary"
                style={{ fontSize: "0.875rem", padding: "8px 16px" }}
              >
                Dashboard
              </a>
              <a
                href="/settings"
                className="btn btn-secondary"
                style={{ fontSize: "0.875rem", padding: "8px 16px" }}
              >
                Settings
              </a>
            </div>
          </div>
        </nav>

        {/* Main content landmark */}
        <main id="main-content" role="main" tabIndex={-1}>
          {children}
        </main>

        {/* Live region for screen reader announcements */}
        <div
          id="live-announcements"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          role="status"
        />
      </body>
    </html>
  );
}
