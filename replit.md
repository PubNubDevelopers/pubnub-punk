# PubNub Developer Tools

## Overview

This is a full-stack web application for PubNub developers, providing a comprehensive suite of tools for testing and debugging PubNub services. The application features a React frontend with TypeScript, Express.js backend, and PostgreSQL database using Drizzle ORM for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom PubNub color scheme
- **State Management**: TanStack Query for server state and local storage for settings
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Development**: tsx for TypeScript execution in development
- **Production Build**: esbuild for server-side bundling

### Database Schema
- **Users Table**: Basic user authentication with username/password
- **PubNub Settings Table**: User-specific PubNub configuration storage
  - Credentials (publish/subscribe/secret keys, user ID)
  - Environment settings (origin, SSL, logging, heartbeat)
  - Storage preferences (auto-save, message history)

## Key Components

### Application Shell
- **Responsive Layout**: Mobile-first design with collapsible sidebar navigation
- **Navigation System**: Categorized tool organization (Messaging, Application, Insights)
- **Connection Status**: Real-time display of PubNub connection state
- **Theme System**: Light/dark mode support with PubNub branding

### Tool Categories
1. **Core Settings**: PubNub credentials and environment configuration
2. **Messaging Services**: Pub/Sub, Mobile Push, Events & Actions
3. **Application Services**: File Sharing, Presence, Functions, App Context
4. **Insights & Analytics**: Illuminate, Insights, Stream Generator, Event Workflow

### Settings Management
- **Local Storage**: Client-side persistence for user preferences
- **Form Validation**: Zod schemas for type-safe data validation
- **Auto-save**: Configurable automatic settings persistence
- **Connection Testing**: Real-time validation of PubNub credentials

## Data Flow

1. **Settings Configuration**: Users input PubNub credentials through the settings form
2. **Local Persistence**: Settings are stored in browser localStorage with fallback to database
3. **Connection Management**: Real-time connection status monitoring and updates
4. **Tool Integration**: Each tool accesses shared settings for PubNub operations
5. **History Management**: Optional message history storage for debugging purposes

## External Dependencies

### Core Libraries
- **@neondatabase/serverless**: Neon database connectivity for PostgreSQL
- **drizzle-orm**: Type-safe database operations and migrations
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form**: Form state management with validation
- **zod**: Schema validation and type inference

### UI Components
- **@radix-ui**: Accessible component primitives (dialogs, dropdowns, forms)
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library for consistent iconography
- **wouter**: Lightweight React router

### Development Tools
- **vite**: Fast build tool with hot module replacement
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast bundler for production builds
- **drizzle-kit**: Database migration and schema management

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with Express.js backend
- **Hot Reload**: Full-stack development with automatic reloading
- **Database**: PostgreSQL with Drizzle migrations
- **Environment Variables**: DATABASE_URL for database connectivity

### Production Build
1. **Frontend Build**: Vite builds React app to static assets
2. **Backend Build**: esbuild bundles Express server with dependencies
3. **Static Serving**: Express serves built frontend from `/dist/public`
4. **Database Migrations**: Drizzle handles schema migrations

### Replit Deployment
- **Auto-scaling**: Configured for Replit's autoscale deployment target
- **Port Configuration**: Express server on port 5000, external port 80
- **Build Process**: npm run build creates production-ready artifacts
- **Start Command**: npm run start launches production server

## Changelog

- June 26, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.