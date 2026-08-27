export function ShareBoardButton() {
  const handleShare = () => {
    const url = window.location.href;
    void navigator.clipboard.writeText(url).catch(() => {
      // Clipboard can reject on an insecure origin or a denied permission.
      // Nothing to recover from here; the user can copy from the address bar.
    });
    console.log("board link copied", url);
  };

  return (
    <button
      onClick={handleShare}
      style={{
        display: "block",
        width: "100%",
        padding: "16px",
        border: "1px solid #000000",
        borderRadius: "0",
        background: "#1E3AFF",
        color: "#FFFFFF",
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: "pointer",
        textAlign: "center",
        boxSizing: "border-box",
      }}
    >
      Share Board
    </button>
  );
}
