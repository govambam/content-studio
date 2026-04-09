function App() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside
        style={{
          width: "var(--sidebar-width)",
          background: "var(--bg-sidebar)",
          padding: "20px 12px",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "0 8px", marginBottom: "24px" }}>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "15px",
              fontWeight: 800,
              color: "var(--accent-blue)",
              letterSpacing: "-0.02em",
            }}
          >
            Macroscope
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "11px",
              fontWeight: 400,
              color: "#64748B",
              marginTop: "2px",
            }}
          >
            Content Studio
          </div>
        </div>
      </aside>
      <main
        style={{
          flex: 1,
          background: "var(--bg-primary)",
          padding: "var(--page-padding)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <h1
          style={{
            fontSize: "18px",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
          }}
        >
          Content Studio
        </h1>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 400,
            color: "var(--text-secondary)",
            marginTop: "8px",
          }}
        >
          Select or create a project to get started.
        </p>
      </main>
    </div>
  );
}

export default App;
