import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  DragOverlay,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ContentStatus } from "@content-studio/shared";
import { CONTENT_STATUSES, STATUS_LABELS } from "@content-studio/shared";
import { StatusDot } from "./StatusBadge";

export interface KanbanItem {
  id: string;
  status: ContentStatus;
  sort_order: number;
}

interface KanbanBoardProps<T extends KanbanItem> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  onItemMoved: (
    itemId: string,
    toStatus: ContentStatus,
    toIndex: number
  ) => void;
  // Shown as a centered banner over the empty columns when items.length === 0.
  // The columns are always rendered so the user sees the board structure.
  emptyMessage?: string;
  emptyAction?: ReactNode;
}

export function KanbanBoard<T extends KanbanItem>({
  items,
  renderItem,
  onItemMoved,
  emptyMessage,
  emptyAction,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const grouped = useMemo(() => {
    const map: Record<ContentStatus, T[]> = {
      backlog: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const item of items) {
      map[item.status].push(item);
    }
    for (const status of CONTENT_STATUSES) {
      map[status].sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [items]);

  const isEmpty = items.length === 0;
  const showEmptyOverlay = isEmpty && Boolean(emptyMessage || emptyAction);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const activeItem = items.find((i) => i.id === active.id);
    if (!activeItem) return;

    // `over.id` is either a column id (one of CONTENT_STATUSES) or an item id.
    const overId = String(over.id);
    let toStatus: ContentStatus;
    let toIndex: number;

    if (CONTENT_STATUSES.includes(overId as ContentStatus)) {
      toStatus = overId as ContentStatus;
      toIndex = grouped[toStatus].length; // append
    } else {
      const overItem = items.find((i) => i.id === overId);
      if (!overItem) return;
      toStatus = overItem.status;
      const list = grouped[toStatus];
      const idx = list.findIndex((i) => i.id === overItem.id);
      toIndex = idx < 0 ? list.length : idx;
    }

    // If nothing actually changed, skip
    const fromList = grouped[activeItem.status];
    const fromIndex = fromList.findIndex((i) => i.id === activeItem.id);
    if (activeItem.status === toStatus && fromIndex === toIndex) return;

    onItemMoved(activeItem.id, toStatus, toIndex);
  };

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "16px",
            flex: 1,
            padding: "var(--page-padding)",
            overflow: "auto",
          }}
        >
          {CONTENT_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              items={grouped[status]}
              renderItem={renderItem}
            />
          ))}
        </div>
        {showEmptyOverlay && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                pointerEvents: "auto",
                background: "var(--bg-surface)",
                border: "1px solid var(--rule-strong)",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                maxWidth: "360px",
                textAlign: "center",
                fontFamily: "var(--font-sans)",
              }}
            >
              {emptyMessage && (
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 400,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {emptyMessage}
                </div>
              )}
              {emptyAction}
            </div>
          </div>
        )}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div style={{ opacity: 0.9 }}>{renderItem(activeItem)}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps<T extends KanbanItem> {
  status: ContentStatus;
  items: T[];
  renderItem: (item: T) => ReactNode;
}

function KanbanColumn<T extends KanbanItem>({
  status,
  items,
  renderItem,
}: KanbanColumnProps<T>) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        minWidth: "220px",
        display: "flex",
        flexDirection: "column",
        background: isOver ? "var(--bg-secondary)" : "transparent",
        transition: "background 120ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <StatusDot status={status} />
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--text-primary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontFamily: "var(--font-sans)",
          }}
        >
          {STATUS_LABELS[status]}
        </span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 400,
            color: "var(--text-muted)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {items.length}
        </span>
      </div>
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            flex: 1,
            overflowY: "auto",
          }}
        >
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id}>
              {renderItem(item)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

interface SortableItemProps {
  id: string;
  children: ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
