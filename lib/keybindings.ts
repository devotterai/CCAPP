// Keybindings system — customizable keyboard shortcuts stored in Settings DB

export type KeyBinding = {
  id: string;
  label: string;
  description: string;
  defaultKey: string; // e.g. "Ctrl+Shift+C"
  category: "calling" | "email" | "navigation" | "leads" | "general";
};

// Default keybindings
export const DEFAULT_KEYBINDINGS: KeyBinding[] = [
  // Calling
  {
    id: "call_lead",
    label: "Call Lead",
    description: "Start a call to the selected lead",
    defaultKey: "Ctrl+Shift+C",
    category: "calling",
  },
  {
    id: "hang_up",
    label: "Hang Up",
    description: "End the active call",
    defaultKey: "Ctrl+Shift+B",
    category: "calling",
  },

  // Email
  {
    id: "send_email",
    label: "Send Email",
    description: "Open email compose for the selected lead",
    defaultKey: "Ctrl+Shift+E",
    category: "email",
  },

  // Navigation
  {
    id: "focus_search",
    label: "Focus Search",
    description: "Jump to the search input",
    defaultKey: "Ctrl+K",
    category: "navigation",
  },
  {
    id: "go_dashboard",
    label: "Go to Dashboard",
    description: "Navigate to the Dashboard page",
    defaultKey: "Ctrl+Shift+D",
    category: "navigation",
  },
  {
    id: "go_history",
    label: "Go to Call History",
    description: "Navigate to the Call History page",
    defaultKey: "Ctrl+Shift+H",
    category: "navigation",
  },
  {
    id: "go_settings",
    label: "Go to Settings",
    description: "Navigate to the Settings page",
    defaultKey: "Ctrl+Shift+S",
    category: "navigation",
  },

  // Lead management
  {
    id: "next_lead",
    label: "Next Lead",
    description: "Select the next lead in the list",
    defaultKey: "Alt+ArrowDown",
    category: "leads",
  },
  {
    id: "prev_lead",
    label: "Previous Lead",
    description: "Select the previous lead in the list",
    defaultKey: "Alt+ArrowUp",
    category: "leads",
  },
  {
    id: "edit_notes",
    label: "Edit Notes",
    description: "Start editing notes for the selected lead",
    defaultKey: "Ctrl+Shift+N",
    category: "leads",
  },
  {
    id: "save_notes",
    label: "Save Notes",
    description: "Save the current notes",
    defaultKey: "Ctrl+Enter",
    category: "leads",
  },
  {
    id: "set_new",
    label: "Set Status: New",
    description: "Set lead status to New",
    defaultKey: "Alt+1",
    category: "leads",
  },
  {
    id: "set_no_answer",
    label: "Set Status: No Answer",
    description: "Set lead status to No Answer",
    defaultKey: "Alt+2",
    category: "leads",
  },
  {
    id: "set_voicemail",
    label: "Set Status: Left Voicemail",
    description: "Set lead status to Left Voicemail",
    defaultKey: "Alt+3",
    category: "leads",
  },
  {
    id: "set_callback",
    label: "Set Status: Callback Scheduled",
    description: "Set lead status to Callback Scheduled",
    defaultKey: "Alt+4",
    category: "leads",
  },
  {
    id: "set_booked",
    label: "Set Status: Booked",
    description: "Set lead status to Booked",
    defaultKey: "Alt+5",
    category: "leads",
  },
  {
    id: "set_not_interested",
    label: "Set Status: Not Interested",
    description: "Set lead status to Not Interested",
    defaultKey: "Alt+6",
    category: "leads",
  },
  {
    id: "set_wrong_number",
    label: "Set Status: Wrong Number",
    description: "Set lead status to Wrong Number",
    defaultKey: "Alt+7",
    category: "leads",
  },
  {
    id: "set_dnc",
    label: "Set Status: Do Not Call",
    description: "Set lead status to Do Not Call",
    defaultKey: "Alt+8",
    category: "leads",
  },

  // General
  {
    id: "import_csv",
    label: "Import CSV",
    description: "Trigger CSV file import",
    defaultKey: "Ctrl+Shift+I",
    category: "general",
  },
  {
    id: "show_shortcuts",
    label: "Show Shortcuts",
    description: "Announce all available shortcuts via screen reader",
    defaultKey: "Shift+?",
    category: "general",
  },
];

// Parse a key string like "Ctrl+Shift+C" into components
export function parseKeyString(keyStr: string): {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  key: string;
} {
  const parts = keyStr.split("+");
  const key = parts[parts.length - 1];
  return {
    ctrlKey: parts.includes("Ctrl"),
    shiftKey: parts.includes("Shift"),
    altKey: parts.includes("Alt"),
    key,
  };
}

// Check if a KeyboardEvent matches a key string
export function matchesKeybinding(e: KeyboardEvent, keyStr: string): boolean {
  const parsed = parseKeyString(keyStr);

  // Normalize the key comparison
  let eventKey = e.key;

  // Handle special key names
  if (eventKey === "?" && parsed.key === "?") {
    return e.shiftKey === parsed.shiftKey && e.ctrlKey === parsed.ctrlKey && e.altKey === parsed.altKey;
  }

  // For letter keys, compare case-insensitively
  if (parsed.key.length === 1 && /[a-zA-Z]/.test(parsed.key)) {
    eventKey = eventKey.toUpperCase();
    return (
      e.ctrlKey === parsed.ctrlKey &&
      e.shiftKey === parsed.shiftKey &&
      e.altKey === parsed.altKey &&
      eventKey === parsed.key.toUpperCase()
    );
  }

  // For number keys
  if (/^\d$/.test(parsed.key)) {
    return (
      e.ctrlKey === parsed.ctrlKey &&
      e.shiftKey === parsed.shiftKey &&
      e.altKey === parsed.altKey &&
      eventKey === parsed.key
    );
  }

  // For special keys (ArrowDown, ArrowUp, Enter, etc.)
  return (
    e.ctrlKey === parsed.ctrlKey &&
    e.shiftKey === parsed.shiftKey &&
    e.altKey === parsed.altKey &&
    eventKey === parsed.key
  );
}

// Build a key string from a KeyboardEvent (for recording new bindings)
export function eventToKeyString(e: KeyboardEvent): string | null {
  const parts: string[] = [];

  if (e.ctrlKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");

  let key = e.key;

  // Ignore modifier-only keypresses
  if (["Control", "Shift", "Alt", "Meta"].includes(key)) return null;

  // Normalize key names
  if (key === " ") key = "Space";
  if (key.length === 1) key = key.toUpperCase();

  parts.push(key);
  return parts.join("+");
}

// Format a key string for display
export function formatKeyDisplay(keyStr: string): string {
  return keyStr
    .replace("Ctrl", "Ctrl")
    .replace("Shift", "Shift")
    .replace("Alt", "Alt")
    .replace("ArrowDown", "↓")
    .replace("ArrowUp", "↑")
    .replace("ArrowLeft", "←")
    .replace("ArrowRight", "→")
    .replace("Enter", "Enter")
    .replace("Space", "Space");
}

// Category labels
export const CATEGORY_LABELS: Record<string, string> = {
  calling: "📞 Calling",
  email: "✉️ Email",
  navigation: "🧭 Navigation",
  leads: "👤 Lead Management",
  general: "⚙ General",
};

// Setting key for storing custom keybindings in the DB
export const KEYBINDINGS_SETTING_KEY = "CUSTOM_KEYBINDINGS";
