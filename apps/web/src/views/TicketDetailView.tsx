import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ContentStatus } from "@content-studio/shared";
import { CONTENT_STATUSES, STATUS_LABELS } from "@content-studio/shared";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Markdown } from "../components/Markdown";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { StatusBadge } from "../components/StatusBadge";
import { ActivityFeed } from "../components/ActivityFeed";
import { AssetsSection } from "../components/AssetsSection";
import { Wordmark } from "../components/Wordmark";
import { useProjects } from "../hooks/useProjects";
import { useTicket } from "../hooks/useTicket";
import { useActivity } from "../hooks/useActivity";
import { useAssets } from "../hooks/useAssets";

export function TicketDetailView() {
  const { projectId, ticketId } = useParams<{
    projectId: string;
    ticketId: string;
  }>();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const {
    ticket,
    loading: ticketLoading,
    error: ticketError,
    updateTicket,
    deleteTicket,
  } = useTicket(ticketId ?? null);
  const {
    items: activityItems,
    addComment,
    editComment,
    deleteComment,
  } = useActivity(ticketId ?? null);
  const {
    assets,
    uploadAsset,
    deleteAsset,
    getDownloadUrl,
  } = useAssets(ticketId ?? null);

  const project = projects.find((p) => p.id === projectId) ?? null;

  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingTitle) setEditingTitle(false);
        else if (statusMenuOpen) setStatusMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editingTitle, statusMenuOpen]);

  const handleSaveTitle = async () => {
    const trimmed = titleDraft.trim();
    if (!ticket || !trimmed || trimmed === ticket.title) {
      setEditingTitle(false);
      return;
    }
    await updateTicket({ title: trimmed });
    setEditingTitle(false);
  };

  const handleSaveDescription = async (value: string) => {
    if (!ticket || value === ticket.description) return;
    await updateTicket({ description: value });
  };

  const handleStatusChange = async (status: ContentStatus) => {
    setStatusMenuOpen(false);
    if (!ticket || status === ticket.status) return;
    await updateTicket({ status });
  };

  const handleDelete = async () => {
    if (!ticket) return;
    if (
      !window.confirm(
        `Delete ticket "${ticket.title}"? All assets, comments, and activity will be removed.`
      )
    ) {
      return;
    }
    const res = await deleteTicket();
    if (res.error) {
      window.alert(`Could not delete ticket: ${res.error}`);
      return;
    }
    navigate(`/projects/${projectId}`);
  };

  if (!ticket) {
    const isError = !ticketLoading && ticketError !== null;
    const message = ticketLoading
      ? "Loading ticket…"
      : isError
        ? `Could not load ticket: ${ticketError}`
        : "Ticket not found.";
    return (
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          background: "var(--bg-primary)",
        }}
      >
        <TopStrip />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            fontFamily: "var(--font-sans)",
            color: ticketLoading ? "var(--text-muted)" : "var(--text-secondary)",
            fontSize: "14px",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div>{message}</div>
          {!ticketLoading && (
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--rule-faint)",
                borderRadius: "0",
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
              }}
            >
              Back to project
            </button>
          )}
        </div>
      </main>
    );
  }

  const createdAt = new Date(ticket.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      <TopStrip
        breadcrumb={
          <Breadcrumbs
            items={[
              { label: "Home", to: "/" },
              {
                label: project?.title ?? "Project",
                to: `/projects/${projectId}`,
              },
              { label: ticket.title },
            ]}
          />
        }
      />
      <div
        style={{
          flex: 1,
          overflow: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "900px",
            width: "100%",
            margin: "0 auto",
            padding: "24px",
          }}
        >
          <div>
            {editingTitle ? (
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSaveTitle();
                  }
                  if (e.key === "Escape") {
                    setEditingTitle(false);
                  }
                }}
                style={{
                  width: "100%",
                  fontSize: "28px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  border: "1px solid var(--rule-strong)",
                  borderRadius: "0",
                  padding: "4px 8px",
                  background: "var(--bg-surface)",
                  outline: "none",
                }}
              />
            ) : (
              <h1
                onClick={() => {
                  setTitleDraft(ticket.title);
                  setEditingTitle(true);
                }}
                style={{
                  margin: 0,
                  fontSize: "28px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  cursor: "text",
                  padding: "4px 8px",
                  marginLeft: "-8px",
                  lineHeight: 1.2,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-secondary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {ticket.title}
              </h1>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "16px",
              paddingBottom: "16px",
              borderBottom: "1px solid var(--rule-faint)",
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              flexWrap: "wrap",
            }}
          >
            <MetaItem label="Status">
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setStatusMenuOpen((v) => !v)}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  <StatusBadge status={ticket.status} />
                </button>
                {statusMenuOpen && (
                  <StatusDropdown
                    current={ticket.status}
                    onSelect={handleStatusChange}
                    onClose={() => setStatusMenuOpen(false)}
                  />
                )}
              </div>
            </MetaItem>

            {project && (
              <MetaItem label="Project">
                <button
                  onClick={() => navigate(`/projects/${projectId}`)}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-sans)",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {project.title}
                </button>
              </MetaItem>
            )}

            <MetaItem label="Created">
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 400,
                  color: "var(--text-secondary)",
                }}
              >
                {createdAt}
              </span>
            </MetaItem>

            <div style={{ flex: 1 }} />

            <button
              onClick={handleDelete}
              style={{
                background: "transparent",
                border: "1px solid var(--rule-faint)",
                borderRadius: "0",
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              Delete Ticket
            </button>
          </div>

          <SectionHeader>Description</SectionHeader>
          <div>
            {editingDescription ? (
              <MarkdownEditor
                initialValue={ticket.description}
                placeholder="Describe this ticket…"
                onSave={handleSaveDescription}
                onCancel={() => setEditingDescription(false)}
              />
            ) : (
              <div
                onClick={() => setEditingDescription(true)}
                style={{
                  padding: "12px",
                  marginLeft: "-12px",
                  minHeight: "60px",
                  cursor: "text",
                  whiteSpace: ticket.description ? "normal" : "pre-wrap",
                  color: ticket.description
                    ? "var(--text-secondary)"
                    : "var(--text-muted)",
                  fontSize: "13px",
                  fontFamily: "var(--font-sans)",
                  lineHeight: 1.6,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-secondary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {ticket.description ? (
                  <Markdown body={ticket.description} />
                ) : (
                  "Click to add a description."
                )}
              </div>
            )}
          </div>

          <SectionHeader>Assets</SectionHeader>
          <AssetsSection
            assets={assets}
            onUpload={uploadAsset}
            onDelete={deleteAsset}
            getDownloadUrl={getDownloadUrl}
          />

          <SectionHeader>Activity</SectionHeader>
          <ActivityFeed
            items={activityItems}
            onAddComment={addComment}
            onEditComment={editComment}
            onDeleteComment={deleteComment}
          />
        </div>
      </div>
    </main>
  );
}

interface TopStripProps {
  breadcrumb?: React.ReactNode;
}

function TopStrip({ breadcrumb }: TopStripProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "24px",
        padding: "16px 24px",
        borderBottom: "1px solid var(--rule-faint)",
        flexShrink: 0,
      }}
    >
      <Wordmark />
      {breadcrumb}
    </div>
  );
}

interface MetaItemProps {
  label: string;
  children: React.ReactNode;
}

function MetaItem({ label, children }: MetaItemProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "var(--text-muted)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "var(--font-sans)",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: "24px",
        marginBottom: "8px",
        fontSize: "12px",
        fontWeight: 700,
        color: "var(--text-primary)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: "var(--font-sans)",
      }}
    >
      {children}
    </div>
  );
}

interface StatusDropdownProps {
  current: ContentStatus;
  onSelect: (status: ContentStatus) => void;
  onClose: () => void;
}

function StatusDropdown({ current, onSelect, onClose }: StatusDropdownProps) {
  useEffect(() => {
    const handleClickOutside = () => onClose();
    const t = setTimeout(() => {
      window.addEventListener("click", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("click", handleClickOutside);
    };
  }, [onClose]);
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        background: "var(--bg-surface)",
        border: "1px solid var(--rule-strong)",
        borderRadius: "0",
        zIndex: 20,
        minWidth: "160px",
      }}
    >
      {CONTENT_STATUSES.map((status) => (
        <button
          key={status}
          onClick={() => onSelect(status)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "8px 12px",
            background:
              status === current ? "var(--bg-secondary)" : "transparent",
            border: "none",
            fontSize: "12px",
            fontWeight: status === current ? 700 : 500,
            color: "var(--text-primary)",
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--bg-secondary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background =
              status === current ? "var(--bg-secondary)" : "transparent")
          }
        >
          {STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
}
