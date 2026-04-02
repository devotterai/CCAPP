"use client";

import { useState, useEffect, useCallback } from "react";
import { type Lead } from "@/lib/constants";

// Helper: merge template with lead data
function mergeTemplate(template: string, lead: Lead): string {
  return template
    .replace(/\{\{first_name\}\}/gi, lead.firstName)
    .replace(/\{\{last_name\}\}/gi, lead.lastName)
    .replace(/\{\{company\}\}/gi, lead.company)
    .replace(/\{\{casual_name\}\}/gi, lead.casualName || lead.company)
    .replace(/\{\{city\}\}/gi, lead.city)
    .replace(/\{\{state\}\}/gi, lead.state)
    .replace(/\{\{email\}\}/gi, lead.email)
    .replace(/\{\{phone\}\}/gi, lead.phone)
    .replace(/\{\{website\}\}/gi, lead.website);
}

function announce(message: string) {
  const el = document.getElementById("live-announcements");
  if (el) {
    el.textContent = "";
    setTimeout(() => {
      el.textContent = message;
    }, 50);
  }
}

type SmsLogEntry = {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  body: string;
  status: string;
  twilioSid: string;
  direction: string;
  sentAt: string;
};

export default function TextsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [smsHistory, setSmsHistory] = useState<SmsLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch leads for the dropdown
  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => setLeads(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  // Fetch all SMS history
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/sms");
      const data = await res.json();
      setSmsHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch SMS history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // When a lead is selected from dropdown, fill in phone
  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (leadId) {
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        setPhoneNumber(lead.phone || "");
      }
    }
  };

  // Get the selected lead object
  const selectedLead = leads.find((l) => l.id === selectedLeadId) || null;

  // Apply merge fields to message body
  const processedBody = selectedLead ? mergeTemplate(messageBody, selectedLead) : messageBody;

  const handleSend = async () => {
    if (!phoneNumber || !messageBody.trim()) {
      setStatus("Phone number and message are required");
      announce("Phone number and message are required");
      return;
    }

    setSending(true);
    setStatus("Sending text message...");
    announce("Sending text message");

    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phoneNumber,
          body: processedBody,
          leadId: selectedLeadId || "",
          leadName: selectedLead
            ? `${selectedLead.firstName} ${selectedLead.lastName}`
            : "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || "Text failed to send");
        announce(data.error || "Text failed to send");
        return;
      }

      setStatus("Text sent successfully!");
      announce("Text message sent successfully");
      setMessageBody("");
      fetchHistory();
    } catch {
      setStatus("Text failed — check Twilio settings");
      announce("Text failed to send. Check your Twilio settings.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "8px" }}>
        💬 Texts
      </h2>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: "32px" }}>
        Send text messages to any phone number or to a lead from your list.
      </p>

      {/* Status message */}
      {status && (
        <div
          role="status"
          aria-live="assertive"
          style={{
            padding: "12px 16px",
            marginBottom: "24px",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: 600,
            backgroundColor:
              status.includes("fail") || status.includes("Failed") || status.includes("required")
                ? "rgba(238, 68, 68, 0.15)"
                : "rgba(68, 187, 102, 0.15)",
            color:
              status.includes("fail") || status.includes("Failed") || status.includes("required")
                ? "#ff6666"
                : "#66dd88",
          }}
        >
          {status}
        </div>
      )}

      {/* Compose Section */}
      <div className="card" style={{ marginBottom: "32px" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 16px" }}>
          Compose Message
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Lead Picker */}
          <div>
            <label htmlFor="sms-lead-picker" className="form-label">
              Select a Lead (optional)
            </label>
            <select
              id="sms-lead-picker"
              className="form-input"
              value={selectedLeadId}
              onChange={(e) => handleLeadSelect(e.target.value)}
            >
              <option value="">— Manual entry —</option>
              {leads
                .filter((l) => l.phone)
                .map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.firstName} {lead.lastName}
                    {lead.company ? ` — ${lead.company}` : ""} ({lead.phone})
                  </option>
                ))}
            </select>
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="sms-phone" className="form-label">
              Phone Number <span aria-hidden="true">*</span>
            </label>
            <input
              id="sms-phone"
              type="tel"
              className="form-input"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              aria-required="true"
            />
          </div>

          {/* Message Body */}
          <div>
            <label htmlFor="sms-body" className="form-label">
              Message <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="sms-body"
              className="form-input"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={4}
              placeholder="Type your message here... Use merge fields like {{first_name}}, {{company}}, {{casual_name}}"
              aria-required="true"
              style={{ resize: "vertical" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>

          {/* Merge fields hint */}
          {selectedLead && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", margin: 0 }}>
              Available merge fields: {"{{first_name}}"}, {"{{last_name}}"}, {"{{company}}"}, {"{{casual_name}}"}, {"{{city}}"}, {"{{state}}"}, {"{{phone}}"}, {"{{website}}"}
            </p>
          )}

          {/* Preview if merge fields used */}
          {selectedLead && messageBody.includes("{{") && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                fontSize: "0.8125rem",
              }}
            >
              <span style={{ fontWeight: 700, color: "#a78bfa", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Preview:
              </span>
              <p style={{ margin: "4px 0 0", color: "var(--color-text-secondary)", whiteSpace: "pre-wrap" }}>
                {processedBody}
              </p>
            </div>
          )}

          {/* Send Button */}
          <button
            className="btn btn-success"
            onClick={handleSend}
            disabled={sending || !phoneNumber || !messageBody.trim()}
            style={{ width: "100%", fontSize: "1rem", padding: "14px" }}
          >
            {sending ? "Sending..." : "Send Text Message"}
          </button>

          <p style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", textAlign: "center", margin: 0 }}>
            Press{" "}
            <kbd style={{ padding: "1px 4px", background: "var(--color-bg-tertiary)", borderRadius: "3px", fontSize: "0.625rem" }}>
              Ctrl+Enter
            </kbd>{" "}
            to send
          </p>
        </div>
      </div>

      {/* SMS History */}
      <section aria-labelledby="sms-history-heading">
        <h3 id="sms-history-heading" style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "24px" }}>
          Recent Messages
        </h3>

        {loading ? (
          <div
            role="status"
            aria-busy="true"
            style={{
              padding: "48px",
              textAlign: "center",
              color: "var(--color-text-muted)",
            }}
          >
            Loading messages...
          </div>
        ) : smsHistory.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "24px" }}>
            No text messages sent yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {smsHistory.map((sms) => (
              <div
                key={sms.id}
                className="card"
                style={{ padding: "16px" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                      {sms.leadName || "Unknown"}
                    </span>
                    <span
                      style={{
                        color: "var(--color-text-muted)",
                        fontSize: "0.8125rem",
                        marginLeft: "8px",
                        fontFamily: "monospace",
                      }}
                    >
                      {sms.leadPhone}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      backgroundColor: "rgba(139, 92, 246, 0.15)",
                      color: "#a78bfa",
                    }}
                  >
                    {sms.status}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--color-text-secondary)",
                    margin: "0 0 8px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {sms.body}
                </p>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {new Date(sms.sentAt).toLocaleDateString()}{" "}
                  {new Date(sms.sentAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
