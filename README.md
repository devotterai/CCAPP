# CCAPP — Cold Call Assistant

An accessible cold calling web application with one-click Twilio calling, personalized Gmail email outreach, and lead management.

## Features

- **One-Click Calling** via Twilio integration
- **Personalized Email** with template merge fields via Gmail SMTP
- **Lead Management** with CSV import, search, filter, and disposition tracking
- **Fully Accessible** — compatible with JAWS, Fusion, and other screen readers
- **High Contrast Dark Theme** — WCAG AAA targets for color contrast
- **Keyboard Navigation** — full keyboard support with visible focus indicators and shortcuts

## Getting Started

### Prerequisites

- Node.js 18+
- Twilio account (Account SID, Auth Token, Phone Number)
- Gmail/Google Workspace App Password

### Setup

```bash
# Install dependencies
npm install

# Initialize the database
node scripts/init-db.mjs

# Generate Prisma client
npx prisma generate

# Start the dev server
npm run dev
```

### Configuration

1. Open `http://localhost:3000/settings`
2. Enter your Twilio credentials (Account SID, Auth Token, Phone Number)
3. Enter your Gmail credentials (Sender Email, App Password)
4. Create email templates with merge fields

### CSV Import

Import leads from a CSV file with flexible column mapping. Supported column names:
- `first_name`, `last_name`, `email`, `phone`, `company`, `city`, `state`, `website`, `notes`

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Navigate between leads and controls |
| `Enter` / `Space` | Select a lead |
| `Ctrl+Shift+C` | Call the selected lead |
| `Ctrl+Shift+E` | Email the selected lead |
| `Escape` | Close email dialog |

## Tech Stack

- **Next.js 16** (App Router) with TypeScript
- **Tailwind CSS** — high contrast accessible theme
- **SQLite** with Prisma ORM (via LibSQL adapter)
- **Twilio SDK** for calling
- **Nodemailer** for Gmail SMTP email
