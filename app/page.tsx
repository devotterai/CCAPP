"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DISPOSITIONS,
  DISPOSITION_LABELS,
  DISPOSITION_COLORS,
  type Lead,
  type Disposition,
} from "@/lib/constants";

// Helper: announce to screen readers via the global live region
function announce(message: string) {
  const el = document.getElementById("live-announcements");
  if (el) {
    el.textContent = "";
    // Small delay to ensure the screen reader picks up the change
    setTimeout(() => {
      el.textContent = message;
    }, 50);
  }
}

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

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [calling, setCalling] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const emailTriggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("disposition", filter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
      announce("Error loading leads");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Fetch templates
  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  // Focus trap for email modal
  useEffect(() => {
    if (!showEmailModal) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableEls = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableEls[0];
    const lastFocusable = focusableEls[focusableEls.length - 1];

    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowEmailModal(false);
        emailTriggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showEmailModal]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+C = Call
      if (e.ctrlKey && e.shiftKey && e.key === "C" && selectedLead) {
        e.preventDefault();
        handleCall();
      }
      // Ctrl+Shift+E = Email
      if (e.ctrlKey && e.shiftKey && e.key === "E" && selectedLead) {
        e.preventDefault();
        openEmailModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLead]);

  // Handle disposition update
  const updateDisposition = async (leadId: string, disposition: Disposition) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disposition }),
      });
      if (!res.ok) throw new Error("Failed to update");

      const updated = await res.json();
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
      if (selectedLead?.id === leadId) setSelectedLead(updated);

      const label = DISPOSITION_LABELS[disposition];
      setActionStatus(`Status updated to ${label}`);
      announce(`Lead status updated to ${label}`);
    } catch {
      setActionStatus("Failed to update status");
      announce("Failed to update lead status");
    }
  };

  // Handle call using Twilio Voice SDK (browser-based)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeCallRef = useRef<any>(null);
  const [callActive, setCallActive] = useState(false);

  const handleCall = async () => {
    if (!selectedLead?.phone) {
      setActionStatus("No phone number available");
      announce("Cannot call: no phone number available for this lead");
      return;
    }

    // If a call is already active, hang up
    if (callActive && activeCallRef.current) {
      activeCallRef.current.disconnect();
      activeCallRef.current = null;
      setCallActive(false);
      setCalling(false);
      setActionStatus("Call ended");
      announce("Call ended");
      return;
    }

    setCalling(true);
    setActionStatus("Connecting call...");
    announce(`Calling ${selectedLead.firstName} ${selectedLead.lastName} at ${selectedLead.phone}`);

    try {
      // Get access token
      const tokenRes = await fetch("/api/token");
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        setActionStatus(tokenData.error || "Failed to get call token");
        announce(tokenData.error || "Failed to get call token");
        setCalling(false);
        return;
      }

      // Import Twilio Voice SDK dynamically (client-side only)
      const { Device } = await import("@twilio/voice-sdk");

      // Initialize device if needed
      if (!deviceRef.current) {
        deviceRef.current = new Device(tokenData.token, {
          logLevel: 1,
        });
      } else {
        // Update token
        deviceRef.current.updateToken(tokenData.token);
      }

      // Make the call
      const call = await deviceRef.current.connect({
        params: { To: selectedLead.phone },
      });

      activeCallRef.current = call;
      setCallActive(true);
      setActionStatus("Call connected — speaking through browser");
      announce("Call connected. You are now speaking through your browser.");

      call.on("disconnect", () => {
        activeCallRef.current = null;
        setCallActive(false);
        setCalling(false);
        setActionStatus("Call ended");
        announce("Call ended");
      });

      call.on("cancel", () => {
        activeCallRef.current = null;
        setCallActive(false);
        setCalling(false);
        setActionStatus("Call cancelled");
        announce("Call cancelled");
      });

      // Update lead disposition
      if (selectedLead.id) {
        fetch(`/api/leads/${selectedLead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disposition: "CALLED_NO_ANSWER" }),
        }).then(() => fetchLeads()).catch(console.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Call failed";
      setActionStatus(`Call failed: ${message}`);
      announce("Call failed. Check your Twilio settings.");
      setCalling(false);
      setCallActive(false);
    }
  };

  // Open email modal
  const openEmailModal = () => {
    if (!selectedLead?.email) {
      setActionStatus("No email address available");
      announce("Cannot email: no email address for this lead");
      return;
    }
    setShowEmailModal(true);
    setEmailSubject("");
    setEmailBody("");
    setSelectedTemplate("");
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template && selectedLead) {
      setEmailSubject(mergeTemplate(template.subject, selectedLead));
      setEmailBody(mergeTemplate(template.body, selectedLead));
    }
  };

  // Send email
  const handleSendEmail = async () => {
    if (!selectedLead || !emailSubject || !emailBody) return;

    setSendingEmail(true);
    announce(`Sending email to ${selectedLead.email}`);

    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedLead.email,
          subject: emailSubject,
          body: emailBody,
          leadId: selectedLead.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionStatus(data.error || "Email failed");
        announce(data.error || "Email failed to send");
        return;
      }

      setActionStatus("Email sent successfully");
      announce("Email sent successfully");
      setShowEmailModal(false);
      emailTriggerRef.current?.focus();
    } catch {
      setActionStatus("Email failed — check Gmail settings");
      announce("Email failed to send. Check your Gmail settings.");
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle CSV import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionStatus("Importing leads...");
    announce("Importing leads from CSV file");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setActionStatus(data.error || "Import failed");
        announce("Import failed");
        return;
      }

      setActionStatus(`Imported ${data.imported} leads`);
      announce(`Successfully imported ${data.imported} leads`);
      fetchLeads();
    } catch {
      setActionStatus("Import failed");
      announce("Import failed. Check your CSV file format.");
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle lead row keyboard navigation
  const handleLeadKeyDown = (e: React.KeyboardEvent, lead: Lead) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedLead(lead);
      announce(
        `Selected ${lead.firstName} ${lead.lastName}${lead.company ? ` from ${lead.company}` : ""}`
      );
    }
  };

  // Delete all leads
  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete ALL leads? This cannot be undone.")) return;

    try {
      // Delete each lead
      for (const lead of leads) {
        await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      }
      setLeads([]);
      setSelectedLead(null);
      setActionStatus("All leads deleted");
      announce("All leads deleted");
    } catch {
      setActionStatus("Failed to delete leads");
      announce("Failed to delete leads");
    }
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 57px)" }}>
      {/* Left panel: Lead list */}
      <section
        aria-label="Lead list"
        style={{
          flex: "1 1 55%",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--color-border)",
          minWidth: 0,
        }}
      >
        {/* Toolbar */}
        <div
          role="toolbar"
          aria-label="Lead list controls"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-border)",
            backgroundColor: "var(--color-bg-secondary)",
            flexWrap: "wrap",
          }}
        >
          {/* Search */}
          <div style={{ flex: "1 1 200px", minWidth: "150px" }}>
            <label htmlFor="search-leads" className="sr-only">
              Search leads
            </label>
            <input
              id="search-leads"
              type="search"
              className="form-input"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search leads by name, company, email, or phone"
            />
          </div>

          {/* Filter */}
          <div>
            <label htmlFor="filter-disposition" className="sr-only">
              Filter by status
            </label>
            <select
              id="filter-disposition"
              className="form-input"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter leads by disposition status"
              style={{ minWidth: "160px" }}
            >
              <option value="ALL">All Statuses</option>
              {Object.entries(DISPOSITION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Import */}
          <div>
            <label htmlFor="csv-import" className="btn btn-primary" style={{ cursor: "pointer" }}>
              Import CSV
            </label>
            <input
              ref={fileInputRef}
              id="csv-import"
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="sr-only"
              aria-label="Upload a CSV file to import leads"
            />
          </div>

          {/* Delete all */}
          {leads.length > 0 && (
            <button
              className="btn btn-danger"
              onClick={handleDeleteAll}
              style={{ fontSize: "0.8125rem", padding: "8px 14px" }}
            >
              Clear All
            </button>
          )}

          {/* Lead count */}
          <span
            aria-live="polite"
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-text-muted)",
              fontWeight: 600,
            }}
          >
            {leads.length} lead{leads.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Lead table */}
        <div style={{ flex: 1, overflow: "auto" }}>
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
              Loading leads...
            </div>
          ) : leads.length === 0 ? (
            <div
              style={{
                padding: "48px",
                textAlign: "center",
                color: "var(--color-text-muted)",
              }}
            >
              <p style={{ fontSize: "1.125rem", marginBottom: "8px" }}>No leads yet</p>
              <p>Import a CSV file to get started.</p>
            </div>
          ) : (
            <table className="lead-table" aria-label="Leads">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Company</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    tabIndex={0}
                    role="row"
                    aria-current={selectedLead?.id === lead.id ? "true" : undefined}
                    onClick={() => {
                      setSelectedLead(lead);
                      announce(
                        `Selected ${lead.firstName} ${lead.lastName}${lead.company ? ` from ${lead.company}` : ""}`
                      );
                    }}
                    onKeyDown={(e) => handleLeadKeyDown(e, lead)}
                    aria-label={`${lead.firstName} ${lead.lastName}, ${lead.company || "no company"}, ${DISPOSITION_LABELS[lead.disposition as Disposition] || lead.disposition}`}
                  >
                    <td style={{ fontWeight: 600 }}>
                      {lead.firstName} {lead.lastName}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)" }}>
                      {lead.company || "—"}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
                      {lead.phone || "—"}
                    </td>
                    <td>
                      <span
                        className={`badge ${DISPOSITION_COLORS[lead.disposition as Disposition] || "bg-gray-600 text-white"}`}
                      >
                        {DISPOSITION_LABELS[lead.disposition as Disposition] || lead.disposition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Right panel: Lead detail */}
      <aside
        aria-label="Lead details"
        style={{
          flex: "1 1 45%",
          overflow: "auto",
          padding: "24px",
          backgroundColor: "var(--color-bg-primary)",
          minWidth: 0,
        }}
      >
        {!selectedLead ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--color-text-muted)",
              textAlign: "center",
            }}
          >
            <div>
              <p style={{ fontSize: "1.25rem", marginBottom: "8px" }}>No Lead Selected</p>
              <p>Select a lead from the list to see details and take action.</p>
              <p style={{ fontSize: "0.8125rem", marginTop: "16px" }}>
                <kbd style={{ padding: "2px 8px", background: "var(--color-bg-tertiary)", borderRadius: "4px", fontSize: "0.75rem" }}>Tab</kbd> to navigate •{" "}
                <kbd style={{ padding: "2px 8px", background: "var(--color-bg-tertiary)", borderRadius: "4px", fontSize: "0.75rem" }}>Enter</kbd> to select
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Status announcement */}
            {actionStatus && (
              <div
                role="status"
                aria-live="assertive"
                style={{
                  padding: "10px 16px",
                  marginBottom: "16px",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  backgroundColor: actionStatus.includes("fail") || actionStatus.includes("error") || actionStatus.includes("Error") || actionStatus.includes("Cannot")
                    ? "rgba(238, 68, 68, 0.15)"
                    : "rgba(68, 187, 102, 0.15)",
                  color: actionStatus.includes("fail") || actionStatus.includes("error") || actionStatus.includes("Error") || actionStatus.includes("Cannot")
                    ? "#ff6666"
                    : "#66dd88",
                  border: `1px solid ${actionStatus.includes("fail") || actionStatus.includes("error") || actionStatus.includes("Error") || actionStatus.includes("Cannot") ? "rgba(238, 68, 68, 0.3)" : "rgba(68, 187, 102, 0.3)"}`,
                }}
              >
                {actionStatus}
              </div>
            )}

            {/* Lead header */}
            <div className="card" style={{ marginBottom: "16px" }}>
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  marginBottom: "4px",
                  margin: 0,
                }}
              >
                {selectedLead.firstName} {selectedLead.lastName}
              </h2>
              {selectedLead.company && (
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "1rem",
                    margin: "4px 0 12px",
                  }}
                >
                  {selectedLead.company}
                </p>
              )}

              {/* Contact details */}
              <dl
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "8px 16px",
                  margin: 0,
                  fontSize: "0.9375rem",
                }}
              >
                {selectedLead.phone && (
                  <>
                    <dt style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Phone</dt>
                    <dd style={{ margin: 0, fontFamily: "monospace" }}>{selectedLead.phone}</dd>
                  </>
                )}
                {selectedLead.email && (
                  <>
                    <dt style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Email</dt>
                    <dd style={{ margin: 0 }}>{selectedLead.email}</dd>
                  </>
                )}
                {(selectedLead.city || selectedLead.state) && (
                  <>
                    <dt style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Location</dt>
                    <dd style={{ margin: 0 }}>
                      {[selectedLead.city, selectedLead.state].filter(Boolean).join(", ")}
                    </dd>
                  </>
                )}
                {selectedLead.website && (
                  <>
                    <dt style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Website</dt>
                    <dd style={{ margin: 0 }}>
                      <a
                        href={
                          selectedLead.website.startsWith("http")
                            ? selectedLead.website
                            : `https://${selectedLead.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {selectedLead.website}
                      </a>
                    </dd>
                  </>
                )}
                {selectedLead.notes && (
                  <>
                    <dt style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Notes</dt>
                    <dd style={{ margin: 0 }}>{selectedLead.notes}</dd>
                  </>
                )}
              </dl>
            </div>

            {/* Action buttons */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <button
                className="btn btn-success"
                onClick={handleCall}
                disabled={calling || !selectedLead.phone}
                aria-label={`Call ${selectedLead.firstName} ${selectedLead.lastName} at ${selectedLead.phone || "no number"}. Keyboard shortcut: Control plus Shift plus C`}
                style={{ flex: 1, fontSize: "1rem", padding: "14px 20px" }}
                aria-keyshortcuts="Control+Shift+C"
              >
                {calling ? (callActive ? "🔴 Hang Up" : "Connecting...") : "📞 Call Now"}
              </button>

              <button
                ref={emailTriggerRef}
                className="btn btn-primary"
                onClick={openEmailModal}
                disabled={!selectedLead.email}
                aria-label={`Send email to ${selectedLead.firstName} ${selectedLead.lastName} at ${selectedLead.email || "no email"}. Keyboard shortcut: Control plus Shift plus E`}
                style={{ flex: 1, fontSize: "1rem", padding: "14px 20px" }}
                aria-keyshortcuts="Control+Shift+E"
              >
                ✉️ Send Email
              </button>
            </div>

            {/* Keyboard shortcuts hint */}
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
                textAlign: "center",
                marginBottom: "16px",
              }}
            >
              <kbd style={{ padding: "2px 6px", background: "var(--color-bg-tertiary)", borderRadius: "4px" }}>Ctrl+Shift+C</kbd> Call •{" "}
              <kbd style={{ padding: "2px 6px", background: "var(--color-bg-tertiary)", borderRadius: "4px" }}>Ctrl+Shift+E</kbd> Email
            </p>

            {/* Disposition buttons */}
            <div className="card">
              <h3 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "12px", margin: "0 0 12px" }}>
                Update Status
              </h3>
              <div
                role="group"
                aria-label="Lead disposition options"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                {Object.entries(DISPOSITIONS).map(([key, value]) => (
                  <button
                    key={key}
                    className={`btn btn-secondary ${selectedLead.disposition === value ? "active" : ""}`}
                    onClick={() => updateDisposition(selectedLead.id, value)}
                    aria-pressed={selectedLead.disposition === value}
                    style={{
                      fontSize: "0.8125rem",
                      padding: "10px 12px",
                      textAlign: "center",
                      borderColor:
                        selectedLead.disposition === value
                          ? "var(--color-accent)"
                          : "var(--color-border)",
                      backgroundColor:
                        selectedLead.disposition === value
                          ? "var(--color-bg-selected)"
                          : undefined,
                    }}
                  >
                    {DISPOSITION_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Email compose modal */}
      {showEmailModal && selectedLead && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Send email to ${selectedLead.firstName} ${selectedLead.lastName}`}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEmailModal(false);
              emailTriggerRef.current?.focus();
            }
          }}
        >
          <div
            ref={modalRef}
            className="card"
            style={{
              width: "90%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "16px", margin: "0 0 16px" }}>
              Email {selectedLead.firstName} {selectedLead.lastName}
            </h2>

            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "16px" }}>
              Sending to: <strong>{selectedLead.email}</strong>
            </p>

            {/* Template selector */}
            {templates.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="email-template" className="form-label">
                  Use Template
                </label>
                <select
                  id="email-template"
                  className="form-input"
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                >
                  <option value="">— Select a template —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Subject */}
            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="email-subject" className="form-label">
                Subject <span aria-hidden="true">*</span>
              </label>
              <input
                id="email-subject"
                type="text"
                className="form-input"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                aria-required="true"
                placeholder="Email subject line"
              />
            </div>

            {/* Body */}
            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="email-body" className="form-label">
                Body <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="email-body"
                className="form-input"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                aria-required="true"
                rows={8}
                placeholder="Email body. Use merge fields like {{first_name}}, {{company}}, {{casual_name}}, {{city}}, {{state}}"
                style={{ resize: "vertical" }}
              />
            </div>

            {/* Merge fields hint */}
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "16px" }}>
              Available merge fields: {"{{first_name}}"}, {"{{last_name}}"}, {"{{company}}"}, {"{{casual_name}}"}, {"{{city}}"}, {"{{state}}"}, {"{{email}}"}, {"{{phone}}"}, {"{{website}}"}
            </p>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowEmailModal(false);
                  emailTriggerRef.current?.focus();
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailSubject || !emailBody}
                aria-label={sendingEmail ? "Sending email" : "Send email now"}
              >
                {sendingEmail ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
