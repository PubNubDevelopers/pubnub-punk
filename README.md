# PubNub Developer Tools

A client-side HTML-based collection of canonical developer tools for making it easier to learn, use, and test all of the PubNub Services.

## Overview

This application provides a modern, scalable UI framework for PubNub developer tools. It includes tool pages for each PubNub service and advanced tools for testing workflows across multiple services.

### Core Services

**Messaging Services**
- Pub/Sub
- Mobile Push
- Events & Actions

**Application Services**
- File Sharing
- Presence
- Functions
- App Context

**Analytics Services**
- Illuminate
- Insights

### Advanced Tools
- Stream Generator
- Event Workflow

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

### Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Built Version

```bash
npm run preview
```

## Architecture

This is a client-side only application built with:
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Radix UI components
- Wouter for routing

### Storage
- Settings and preferences are stored in localStorage
- Uses PubNub App Context for any data that needs to be persisted across sessions

### Design System
- Uses PubNub brand colors:
  - `#f9f9f9` - Light background/light grey
  - `#070f39` - Dark background/navy blue
  - `#c71929` - Buttons/PubNub Red
  - `#528dfa` - Highlight color/light blue
  - `#171717` - Text/very dark grey

## Project Structure

```
├── src/
│   ├── components/         # Reusable components
│   │   ├── ui/            # Base UI components (Radix UI)
│   │   ├── app-shell.tsx  # Main layout component
│   │   └── sidebar.tsx    # Navigation sidebar
│   ├── pages/             # Page components for each tool
│   ├── lib/               # Utilities and storage
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript type definitions
├── index.html
├── package.json
└── vite.config.ts
```

## Adding New Tools

To add a new tool page:

1. Create a new component in `src/pages/`
2. Add the route to `App.tsx`
3. Add the page configuration to the `pageConfig` object
4. Update the sidebar navigation in `components/sidebar.tsx`