"use client";

import { useState, useEffect } from "react";

type CallLogEntry = {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  callSid: string;
  status: string;
  duration: number;
  notes: string;
  recordingUrl: string;
  startedAt: string;
  endedAt: string | null;
};

export default function CallHistoryPage() {
  const [calls, setCalls] = useState<CallLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/calls")
      .then((r) => r.json())
      .then((data) => setCalls(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "24px" }}>
        📞 Call History
      </h1>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--color-text-muted)" }}>
          Loading call history...
        </div>
      ) : calls.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--color-text-muted)" }}>
          <p style={{ fontSize: "1.125rem", marginBottom: "8px" }}>No calls yet</p>
          <p>Call a lead from the Dashboard to see call history here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {calls.map((call) => (
            <div
              key={call.id}
              className="card"
              style={{ padding: "16px 20px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                {/* Left: Lead info */}
                <div style={{ flex: "1 1 auto" }}>
                  <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "4px" }}>
                    {call.leadName || "Unknown"}
                  </div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", fontFamily: "monospace" }}>
                    {call.leadPhone || "—"}
                  </div>
                </div>

                {/* Right: Time + status */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "4px" }}>
                    {new Date(call.startedAt).toLocaleDateString()}{" "}
                    {new Date(call.startedAt).toLocaleTimeString()}
                  </div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "2px 10px",
                        borderRadius: "4px",
                        backgroundColor:
                          call.status === "completed"
                            ? "rgba(68, 187, 102, 0.15)"
                            : "rgba(238, 187, 68, 0.15)",
                        color: call.status === "completed" ? "#66dd88" : "#ddbb44",
                      }}
                    >
                      {call.status}
                    </span>
                    <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                      {formatDuration(call.duration)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recording player */}
              {call.recordingUrl && (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "6px" }}>
                    🎙️ Recording
                  </div>
                  <audio
                    controls
                    preload="none"
                    src={`/api/recording/${call.id}`}
                    style={{
                      width: "100%",
                      height: "36px",
                      borderRadius: "6px",
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
