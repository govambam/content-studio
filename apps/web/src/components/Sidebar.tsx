import type { Project } from "@content-studio/shared";

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
}

export function Sidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
}: SidebarProps) {
  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        background: "var(--bg-sidebar)",
        padding: "20px 0",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Wordmark */}
      <div style={{ padding: "0 20px", marginBottom: "24px" }}>
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

      {/* Section header */}
      <div
        style={{
          padding: "0 20px",
          marginBottom: "6px",
          fontSize: "10px",
          fontWeight: 600,
          color: "#475569",
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          fontFamily: "var(--font-sans)",
        }}
      >
        Projects
      </div>

      {/* Project list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 12px",
        }}
      >
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          return (
            <button
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 8px",
                borderRadius: "6px",
                border: "none",
                background: isActive ? "#1E293B" : "transparent",
                textAlign: "left",
                fontFamily: "var(--font-sans)",
              }}
            >
              {/* Project icon */}
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: `${project.color}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: project.color,
                  flexShrink: 0,
                }}
              >
                {project.icon}
              </div>

              {/* Project name */}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#FFFFFF" : "#94A3B8",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {project.name}
                </div>
              </div>
            </button>
          );
        })}

        {/* New project button */}
        <button
          onClick={onNewProject}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "10px 8px",
            marginTop: "4px",
            border: "1px dashed #334155",
            borderRadius: "0",
            background: "transparent",
            fontSize: "12px",
            color: "#475569",
            fontFamily: "var(--font-sans)",
          }}
        >
          + New Project
        </button>
      </div>
    </aside>
  );
}
