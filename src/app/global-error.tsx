"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#0b0c11", color: "#eceef2", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 520 }}>
            <div style={{ width: 52, height: 52, margin: "0 auto", borderRadius: 16, display: "grid", placeItems: "center", background: "rgba(240,131,150,.15)", color: "#f08396", fontSize: 24 }}>!</div>
            <h1 style={{ margin: "22px 0 0", fontSize: 28 }}>Academic Planner no pudo iniciar</h1>
            <p style={{ margin: "12px auto 0", color: "#a3a7b2", lineHeight: 1.6 }}>{error.message || "Ocurrió un error inesperado al cargar la aplicación."}</p>
            {error.digest ? <p style={{ color: "#6d7180", fontSize: 12 }}>Referencia: {error.digest}</p> : null}
            <button type="button" onClick={reset} style={{ marginTop: 24, border: 0, borderRadius: 10, padding: "11px 18px", background: "#8b86f0", color: "white", fontWeight: 650, cursor: "pointer" }}>Reintentar</button>
          </div>
        </main>
      </body>
    </html>
  );
}
