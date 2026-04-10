import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  body: string;
}

// Thin wrapper around react-markdown with remark-gfm (tables, task lists,
// autolinks). Phase 2 uses this for ticket descriptions, comment bodies,
// and markdown asset previews.
export function Markdown({ body }: MarkdownProps) {
  if (!body.trim()) return null;
  return (
    <div
      style={{
        fontSize: "13px",
        fontWeight: 400,
        color: "var(--text-secondary)",
        fontFamily: "var(--font-sans)",
        lineHeight: 1.6,
      }}
      className="cs-markdown"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}
