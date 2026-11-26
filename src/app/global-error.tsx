"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: "system-ui", display: "grid", placeItems: "center", minHeight: "100vh", background: "#14142b", color: "#fff" }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <h1>Something went badly wrong</h1>
          <p style={{ opacity: 0.7 }}>{error.digest ? `Error reference: ${error.digest}` : "Please try again."}</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 999, border: 0, background: "#f97316", color: "#fff", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
