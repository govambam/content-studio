import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  ContentStatus,
  Label,
  Ticket,
} from "@content-studio/shared";
import { CONTENT_STATUSES, STATUS_LABELS } from "@content-studio/shared";
import { Sidebar } from "../components/Sidebar";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { KanbanBoard } from "../components/KanbanBoard";
import { TicketCard } from "../components/TicketCard";
import { NewTicketModal } from "../components/NewTicketModal";
import { LabelChip } from "../components/LabelChip";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonKanbanBoard } from "../components/Skeleton";
import { useLabels } from "../hooks/useLabels";
import { useProjects } from "../hooks/useProjects";
import { useTickets } from "../hooks/useTickets";

export function ProjectDetailView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { labels, createLabel } = useLabels();
  const { projects, updateProject, deleteProject } = useProjects();
  const {
    tickets,
    loading: ticketsLoading,
    createTicket,
    updateTicket,
  } = useTickets(projectId ?? null);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId]
  );

  const [sidebarFilters, setSidebarFilters] = useState<Set<string>>(new Set());
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingDescription) descriptionTextareaRef.current?.focus();
  }, [editingDescription]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingTitle) setEditingTitle(false);
        else if (editingDescription) setEditingDescription(false);
        else if (statusMenuOpen) setStatusMenuOpen(false);
        else if (labelPickerOpen) setLabelPickerOpen(false);
        else if (menuOpen) setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editingTitle, editingDescription, statusMenuOpen, labelPickerOpen, menuOpen]);

  const handleSaveTitle = async () => {
    const trimmed = titleDraft.trim();
    if (!project || !trimmed || trimmed === project.title) {
      setEditingTitle(false);
      return;
    }
    await updateProject(project.id, { title: trimmed });
    setEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (!project || descriptionDraft === project.description) {
      setEditingDescription(false);
      return;
    }
    await updateProject(project.id, { description: descriptionDraft });
    setEditingDescription(false);
  };

  const handleStatusChange = async (status: ContentStatus) => {
    if (!project) return;
    setStatusMenuOpen(false);
    if (status === project.status) return;
    await updateProject(project.id, { status });
  };

  const handleToggleLabel = async (label: Label) => {
    if (!project) return;
    const has = project.labels.some((l) => l.id === label.id);
    const nextIds = has
      ? project.labels.filter((l) => l.id !== label.id).map((l) => l.id)
      : [...project.labels.map((l) => l.id), label.id];
    await updateProject(project.id, { labelIds: nextIds });
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (
      !window.confirm(
        `Delete project "${project.title}"? All tickets, assets, comments, and activity will be removed.`
      )
    ) {
      return;
    }
    await deleteProject(project.id);
    navigate("/");
  };

  const handleItemMoved = async (
    itemId: string,
    toStatus: ContentStatus,
    toIndex: number
  ) => {
    const ticket = tickets.find((t) => t.id === itemId);
    if (!ticket) return;
    const columnItems = tickets
      .filter((t) => t.status === toStatus && t.id !== itemId)
      .sort((a, b) => a.sort_order - b.sort_order);
    columnItems.splice(toIndex, 0, { ...ticket, status: toStatus });
    await Promise.all(
      columnItems.map((item, idx) => {
        const needsStatus = item.status !== toStatus;
        const needsOrder = item.sort_order !== idx;
        if (item.id === itemId || needsStatus || needsOrder) {
          return updateTicket(item.id, { status: toStatus, sort_order: idx });
        }
        return Promise.resolve();
      })
    );
  };

  const handleCreateTicket = async (input: {
    title: string;
    description?: string;
  }) => {
    const res = await createTicket(input);
    return { error: res.error };
  };

  const handleCreateLabel = async (name: string, color: string) => {
    const res = await createLabel(name, color);
    return { error: res.error };
  };

  if (!project) {
    return (
      <div style={{ display: "flex", height: "100vh" }}>
        <Sidebar
          labels={labels}
          activeFilterIds={sidebarFilters}
          onToggleFilter={(id) => {
            setSidebarFilters(new Set([id]));
            navigate("/");
          }}
          onClearFilters={() => setSidebarFilters(new Set())}
          onCreateLabel={handleCreateLabel}
        />
        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-primary)",
            fontFamily: "var(--font-sans)",
            color: "var(--text-muted)",
            fontSize: "14px",
          }}
        >
          Loading project…
        </main>
      </div>
    );
  }

  const attachedLabelIds = new Set(project.labels.map((l) => l.id));

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        labels={labels}
        activeFilterIds={sidebarFilters}
        onToggleFilter={(id) => {
          setSidebarFilters(new Set([id]));
          navigate("/");
        }}
        onClearFilters={() => setSidebarFilters(new Set())}
        onCreateLabel={handleCreateLabel}
      />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-primary)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "24px 24px 16px",
            borderBottom: "1px solid var(--rule-faint)",
            background: "var(--bg-surface)",
          }}
        >
          <Breadcrumbs
            items={[{ label: "Home", to: "/" }, { label: project.title }]}
          />

          <div style={{ marginTop: "12px" }}>
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
                  fontSize: "24px",
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
                  setTitleDraft(project.title);
                  setEditingTitle(true);
                }}
                style={{
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  cursor: "text",
                  padding: "4px 8px",
                  marginLeft: "-8px",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-secondary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {project.title}
              </h1>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "12px",
              flexWrap: "wrap",
            }}
          >
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
                <StatusBadge status={project.status} />
              </button>
              {statusMenuOpen && (
                <StatusDropdown
                  current={project.status}
                  onSelect={handleStatusChange}
                  onClose={() => setStatusMenuOpen(false)}
                />
              )}
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {project.labels.map((label) => (
                <LabelChip
                  key={label.id}
                  label={label}
                  onRemove={() => handleToggleLabel(label)}
                />
              ))}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setLabelPickerOpen((v) => !v)}
                  style={{
                    background: "transparent",
                    border: "1px dashed var(--rule-faint)",
                    borderRadius: "0",
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-sans)",
                    cursor: "pointer",
                  }}
                >
                  + Label
                </button>
                {labelPickerOpen && (
                  <LabelPicker
                    labels={labels}
                    attachedLabelIds={attachedLabelIds}
                    onToggle={handleToggleLabel}
                    onClose={() => setLabelPickerOpen(false)}
                  />
                )}
              </div>
            </div>

            <div style={{ flex: 1 }} />

            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Project menu"
                style={{
                  background: "transparent",
                  border: "1px solid var(--rule-faint)",
                  borderRadius: "0",
                  padding: "4px 12px",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                …
              </button>
              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 4px)",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--rule-strong)",
                    borderRadius: "0",
                    minWidth: "160px",
                    zIndex: 20,
                  }}
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      void handleDeleteProject();
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      background: "transparent",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-sans)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-secondary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    Delete Project
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: "16px" }}>
            {editingDescription ? (
              <textarea
                ref={descriptionTextareaRef}
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                onBlur={handleSaveDescription}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingDescription(false);
                }}
                rows={4}
                style={{
                  width: "100%",
                  fontSize: "13px",
                  fontWeight: 400,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-sans)",
                  border: "1px solid var(--rule-strong)",
                  borderRadius: "0",
                  padding: "8px 12px",
                  background: "var(--bg-surface)",
                  outline: "none",
                  resize: "vertical",
                }}
                placeholder="Describe this project…"
              />
            ) : (
              <div
                onClick={() => {
                  setDescriptionDraft(project.description);
                  setEditingDescription(true);
                }}
                style={{
                  fontSize: "13px",
                  fontWeight: 400,
                  color: project.description
                    ? "var(--text-secondary)"
                    : "var(--text-muted)",
                  fontFamily: "var(--font-sans)",
                  lineHeight: 1.5,
                  padding: "8px 12px",
                  marginLeft: "-12px",
                  cursor: "text",
                  whiteSpace: "pre-wrap",
                  minHeight: "40px",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-secondary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {project.description || "Click to add a description."}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px 8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontFamily: "var(--font-sans)",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              Tickets
            </div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 400,
                color: "var(--text-muted)",
              }}
            >
              {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
            </div>
          </div>
          <button
            onClick={() => setShowNewTicket(true)}
            style={{
              background: "var(--text-primary)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "0",
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
            }}
          >
            + New Ticket
          </button>
        </div>

        {ticketsLoading ? (
          <SkeletonKanbanBoard />
        ) : (
          <KanbanBoard<Ticket>
            items={tickets}
            renderItem={(ticket) => (
              <TicketCard
                ticket={ticket}
                assetCount={ticket.asset_count ?? 0}
                commentCount={ticket.comment_count ?? 0}
                onClick={() =>
                  navigate(`/projects/${project.id}/tickets/${ticket.id}`)
                }
              />
            )}
            onItemMoved={handleItemMoved}
            emptyMessage="No tickets yet. Break down the work by creating your first ticket."
            emptyAction={
              <button
                onClick={() => setShowNewTicket(true)}
                style={{
                  background: "var(--text-primary)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "0",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: 700,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                }}
              >
                + New Ticket
              </button>
            }
          />
        )}
      </main>

      {showNewTicket && (
        <NewTicketModal
          onClose={() => setShowNewTicket(false)}
          onCreate={handleCreateTicket}
        />
      )}
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

interface LabelPickerProps {
  labels: Label[];
  attachedLabelIds: Set<string>;
  onToggle: (label: Label) => void;
  onClose: () => void;
}

function LabelPicker({
  labels,
  attachedLabelIds,
  onToggle,
  onClose,
}: LabelPickerProps) {
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
        minWidth: "200px",
        maxHeight: "280px",
        overflowY: "auto",
      }}
    >
      {labels.length === 0 && (
        <div
          style={{
            padding: "8px 12px",
            fontSize: "11px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-sans)",
          }}
        >
          No labels yet
        </div>
      )}
      {labels.map((label) => {
        const attached = attachedLabelIds.has(label.id);
        return (
          <button
            key={label.id}
            onClick={() => onToggle(label)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              textAlign: "left",
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              fontSize: "12px",
              fontWeight: attached ? 700 : 500,
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-secondary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: label.color,
              }}
            />
            {label.name}
            {attached && (
              <span style={{ marginLeft: "auto", fontSize: "10px" }}>✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
