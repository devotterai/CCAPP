"use client";

import { useState, useEffect } from "react";
import { SETTING_KEYS } from "@/lib/constants";

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

function announce(message: string) {
  const el = document.getElementById("live-announcements");
  if (el) {
    el.textContent = "";
    setTimeout(() => {
      el.textContent = message;
    }, 50);
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  // New template form
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateSubject, setNewTemplateSubject] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");

  // Load settings and templates
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings(data && typeof data === 'object' && !data.error ? data : {}))
      .catch(console.error);

    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    setStatus("");
    announce("Saving settings");

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save");
      setStatus("Settings saved successfully");
      announce("Settings saved successfully");
    } catch {
      setStatus("Failed to save settings");
      announce("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName || !newTemplateSubject || !newTemplateBody) {
      setStatus("Please fill in all template fields");
      announce("Please fill in all template fields");
      return;
    }

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplateName,
          subject: newTemplateSubject,
          body: newTemplateBody,
        }),
      });

      if (!res.ok) throw new Error("Failed to create");

      const template = await res.json();
      setTemplates((prev) => [template, ...prev]);
      setNewTemplateName("");
      setNewTemplateSubject("");
      setNewTemplateBody("");
      setStatus(`Template "${template.name}" created`);
      announce(`Email template ${template.name} created successfully`);
    } catch {
      setStatus("Failed to create template");
      announce("Failed to create template");
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;

    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setStatus(`Template "${name}" deleted`);
      announce(`Template ${name} deleted`);
    } catch {
      setStatus("Failed to delete template");
      announce("Failed to delete template");
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "8px" }}>
        Settings
      </h2>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: "32px" }}>
        Configure your Twilio and Gmail credentials. All settings are stored locally.
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
            backgroundColor: status.includes("fail") || status.includes("Failed") || status.includes("Please")
              ? "rgba(238, 68, 68, 0.15)"
              : "rgba(68, 187, 102, 0.15)",
            color: status.includes("fail") || status.includes("Failed") || status.includes("Please")
              ? "#ff6666"
              : "#66dd88",
          }}
        >
          {status}
        </div>
      )}

      {/* Twilio Settings */}
      <section aria-labelledby="twilio-heading" className="card" style={{ marginBottom: "24px" }}>
        <h3 id="twilio-heading" style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "16px", margin: "0 0 16px" }}>
          📞 Twilio Configuration
        </h3>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "16px" }}>
          Get these from your{" "}
          <a
            href="https://console.twilio.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-accent)" }}
          >
            Twilio Console
          </a>.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label htmlFor="twilio-sid" className="form-label">
              Account SID <span aria-hidden="true">*</span>
            </label>
            <input
              id="twilio-sid"
              type="text"
              className="form-input"
              value={settings[SETTING_KEYS.TWILIO_ACCOUNT_SID] || ""}
              onChange={(e) => updateSetting(SETTING_KEYS.TWILIO_ACCOUNT_SID, e.target.value)}
              placeholder="AC..."
              aria-required="true"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="twilio-token" className="form-label">
              Auth Token <span aria-hidden="true">*</span>
            </label>
            <input
              id="twilio-token"
              type="password"
              className="form-input"
              value={settings[SETTING_KEYS.TWILIO_AUTH_TOKEN] || ""}
              onChange={(e) => updateSetting(SETTING_KEYS.TWILIO_AUTH_TOKEN, e.target.value)}
              placeholder="Your Twilio auth token"
              aria-required="true"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="twilio-phone" className="form-label">
              Twilio Phone Number <span aria-hidden="true">*</span>
            </label>
            <input
              id="twilio-phone"
              type="tel"
              className="form-input"
              value={settings[SETTING_KEYS.TWILIO_PHONE_NUMBER] || ""}
              onChange={(e) => updateSetting(SETTING_KEYS.TWILIO_PHONE_NUMBER, e.target.value)}
              placeholder="+1234567890"
              aria-required="true"
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      {/* Gmail Settings */}
      <section aria-labelledby="gmail-heading" className="card" style={{ marginBottom: "24px" }}>
        <h3 id="gmail-heading" style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "16px", margin: "0 0 16px" }}>
          ✉️ Gmail / Google Workspace Configuration
        </h3>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "16px" }}>
          Use a{" "}
          <a
            href="https://myaccount.google.com/apppasswords"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-accent)" }}
          >
            Google App Password
          </a>{" "}
          for authentication (2FA must be enabled).
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label htmlFor="gmail-name" className="form-label">
              Sender Name
            </label>
            <input
              id="gmail-name"
              type="text"
              className="form-input"
              value={settings[SETTING_KEYS.GMAIL_SENDER_NAME] || ""}
              onChange={(e) => updateSetting(SETTING_KEYS.GMAIL_SENDER_NAME, e.target.value)}
              placeholder="Your Name"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="gmail-email" className="form-label">
              Sender Email <span aria-hidden="true">*</span>
            </label>
            <input
              id="gmail-email"
              type="email"
              className="form-input"
              value={settings[SETTING_KEYS.GMAIL_SENDER_EMAIL] || ""}
              onChange={(e) => updateSetting(SETTING_KEYS.GMAIL_SENDER_EMAIL, e.target.value)}
              placeholder="you@yourdomain.com"
              aria-required="true"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="gmail-password" className="form-label">
              App Password <span aria-hidden="true">*</span>
            </label>
            <input
              id="gmail-password"
              type="password"
              className="form-input"
              value={settings[SETTING_KEYS.GMAIL_APP_PASSWORD] || ""}
              onChange={(e) => updateSetting(SETTING_KEYS.GMAIL_APP_PASSWORD, e.target.value)}
              placeholder="16-character app password"
              aria-required="true"
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      {/* Save button */}
      <div style={{ marginBottom: "48px" }}>
        <button
          className="btn btn-success"
          onClick={handleSaveSettings}
          disabled={saving}
          style={{ width: "100%", fontSize: "1rem", padding: "14px" }}
        >
          {saving ? "Saving..." : "Save All Settings"}
        </button>
      </div>

      {/* Email Templates */}
      <section aria-labelledby="templates-heading">
        <h3 id="templates-heading" style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "24px" }}>
          Email Templates
        </h3>

        {/* Create template */}
        <div className="card" style={{ marginBottom: "24px" }}>
          <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "16px", margin: "0 0 16px" }}>
            Create New Template
          </h4>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "16px" }}>
            Merge fields: {"{{first_name}}"}, {"{{last_name}}"}, {"{{company}}"}, {"{{casual_name}}"}, {"{{city}}"}, {"{{state}}"}, {"{{email}}"}, {"{{phone}}"}, {"{{website}}"}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label htmlFor="tpl-name" className="form-label">
                Template Name
              </label>
              <input
                id="tpl-name"
                type="text"
                className="form-input"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g. Initial Outreach"
              />
            </div>

            <div>
              <label htmlFor="tpl-subject" className="form-label">
                Subject Line
              </label>
              <input
                id="tpl-subject"
                type="text"
                className="form-input"
                value={newTemplateSubject}
                onChange={(e) => setNewTemplateSubject(e.target.value)}
                placeholder="e.g. Quick question about {{casual_name}}"
              />
            </div>

            <div>
              <label htmlFor="tpl-body" className="form-label">
                Email Body
              </label>
              <textarea
                id="tpl-body"
                className="form-input"
                value={newTemplateBody}
                onChange={(e) => setNewTemplateBody(e.target.value)}
                rows={6}
                placeholder="Hi {{first_name}},\n\nI noticed..."
                style={{ resize: "vertical" }}
              />
            </div>

            <button className="btn btn-primary" onClick={handleCreateTemplate}>
              Create Template
            </button>
          </div>
        </div>

        {/* Existing templates */}
        {templates.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "24px" }}>
            No email templates yet. Create one above.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }} aria-label="Email templates">
            {templates.map((template) => (
              <li
                key={template.id}
                className="card"
                style={{ marginBottom: "12px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 4px" }}>
                      {template.name}
                    </h4>
                    <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", margin: "0 0 4px" }}>
                      Subject: {template.subject}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", margin: 0, whiteSpace: "pre-wrap" }}>
                      {template.body.length > 150 ? template.body.slice(0, 150) + "..." : template.body}
                    </p>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteTemplate(template.id, template.name)}
                    aria-label={`Delete template ${template.name}`}
                    style={{ fontSize: "0.75rem", padding: "6px 12px", flexShrink: 0 }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
