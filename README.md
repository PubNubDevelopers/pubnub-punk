# PubNub Ultimate Ninja Kit

A comprehensive client-side developer toolkit for building, testing, and managing PubNub applications. This modern web application provides professional-grade tools for all PubNub services with advanced features like real-time monitoring, bulk operations, and configuration management.

## Overview

The PubNub Ultimate Ninja Kit is a complete developer toolset built specifically for PubNub developers and engineers. It provides intuitive interfaces for managing real-time applications, testing functionality, and administering PubNub services without writing code.

## ✨ Fully Implemented Features

### 🔥 **Pub/Sub (Advanced Real-time Messaging)**
- **Real-time publish/subscribe** with advanced message filtering
- **Split-view display** for messages and presence events
- **Server-side filtering** with expression builder
- **Message history integration** with cursor management
- **Advanced configuration** with TTL, metadata, and custom message types
- **Copy functionality** for messages and presence events
- **Real-time settings capture** with JSON export

### 🔐 **Access Manager (PAM)**
- **Complete token management** system with granular permissions
- **Token creation wizard** with channel, channel group, and UUID permissions
- **Pattern-based permissions** with regex support
- **Token parsing and validation** tools
- **Token revocation** capabilities
- **TTL management** and expiration tracking
- **Permission testing** with real API calls
- **Enhanced authentication** with proper token handling across all API calls

### 👥 **Presence (Real-time User Monitoring)**
- **Real-time presence event monitoring** (join, leave, timeout, state-change)
- **Multi-user simulation** with up to 50 test instances
- **Here Now and Where Now** API integration
- **Occupancy tracking** with auto-refresh
- **User state management** and monitoring
- **Batch operations** for connecting/disconnecting users

### 📁 **File Sharing (Complete File Management)**
- **Drag-and-drop file upload** with progress tracking
- **Bulk file operations** (delete, download)
- **ZIP archive creation** for multi-file downloads
- **Advanced search and filtering** across all files
- **Multi-select operations** with visual feedback
- **Real-time file notifications** and updates
- **Gallery mode** for image viewing with thumbnails

### 📱 **Mobile Push Notifications**
- **Cross-platform support** for iOS (APNs) and Android (FCM)
- **Device token management** with environments (dev/prod)
- **Platform-specific notification builders** with rich features
- **Channel association management** for devices
- **Debug monitoring** with real-time delivery status
- **Custom payload support** with JSON editor
- **Working implementation** with proper authentication handling

### 📚 **PubNub Persistence (Message History)**
- **Message history retrieval** with advanced filtering
- **Delete-from-history** operations
- **Time-based queries** and analytics
- **Message search and filtering** capabilities
- **Export functionality** for data analysis
- **Bulk message operations**

### 📂 **Channel Groups**
- **Query-based API approach** for improved performance
- **Complete channel group management** (create, edit, delete)
- **Channel association management** (add/remove channels)
- **Real-time synchronization** with PubNub APIs
- **Bulk channel operations**
- **Group listing and administration**

### ⚙️ **Settings & Configuration**
- **Comprehensive PubNub credentials management**
- **Configuration versioning and history** with PubNub App Context
- **Auto-save functionality** with backup/restore
- **Environment-specific settings** management
- **Configuration migration** tools

### 🎯 **App Context (Objects)**
- **Complete user, channel, and membership management** interface
- **Bulk operations** for creating, editing, and deleting objects
- **Server-side search support** with filtering capabilities
- **Membership management** with advanced relationship handling
- **Real-time synchronization** with PubNub Object APIs
- **Configuration versioning** and persistence integration

## 🚧 Coming Soon

### **Functions**
Serverless function testing and debugging tools

### **Events & Actions**
Event-driven automation configuration

### **Analytics (Illuminate & Insights)**
Real-time and historical analytics dashboards

### **Stream Generator**
Test data stream generation tools

### **Event Workflow**
Multi-service workflow testing

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- PubNub account with API keys

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd pn_devtools

# Install dependencies
npm install

# Install additional dependencies for file operations
npm install jszip
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

### Technology Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for responsive styling
- **Radix UI** for accessible component primitives
- **Wouter** for lightweight routing
- **PubNub JavaScript SDK** (loaded via CDN)

### Application Structure
```
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Base components (Radix UI)
│   │   ├── config-versions/ # Configuration management UI
│   │   ├── app-shell.tsx  # Main layout
│   │   └── sidebar.tsx    # Navigation
│   ├── pages/             # Feature pages
│   │   ├── pubsub.tsx     # Pub/Sub tool
│   │   ├── presence.tsx   # Presence monitoring
│   │   ├── file-sharing.tsx # File management
│   │   ├── mobile-push.tsx # Push notifications
│   │   ├── access-manager.tsx # PAM tools
│   │   └── settings.tsx   # Configuration
│   ├── lib/               # Core utilities
│   │   ├── storage.ts     # Local storage management
│   │   └── config-service.ts # Configuration versioning
│   ├── contexts/          # React contexts
│   │   └── config-context.tsx # Page settings management
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript definitions
├── utils/                 # Development utilities
└── docs/                 # Implementation documentation
```

### Storage & Persistence
- **Local Storage**: Settings and preferences for offline use
- **PubNub App Context**: Configuration versioning and sharing
- **PubNub Persistence**: Message history for version control
- **Real-time Configuration**: All settings captured in JSON format

### Design System
Built with PubNub brand guidelines:
- **Navy Blue** (`#070f39`) - Primary dark theme
- **PubNub Red** (`#c71929`) - Action buttons and highlights
- **Light Blue** (`#528dfa`) - Secondary highlights
- **Light Grey** (`#f9f9f9`) - Backgrounds
- **Dark Grey** (`#171717`) - Text

## Key Features

### Advanced Configuration Management
- **Real-time Settings Capture**: All user inputs automatically saved to JSON
- **Version History**: Full configuration versioning with PubNub App Context
- **Auto-restore**: Automatic loading of saved configurations
- **Backup/Restore**: Complete application state management

### Professional File Management
- **Enterprise Features**: Bulk operations, ZIP downloads, advanced search
- **Real-time Updates**: Live file notifications and status updates
- **Gallery Mode**: Thumbnail view for images with download capabilities
- **Progress Tracking**: Visual feedback for long-running operations

### Comprehensive Testing Tools
- **Multi-user Simulation**: Test presence with up to 50 simulated users
- **Real-time Monitoring**: Live event streams with filtering
- **Debug Channels**: Specialized debugging for mobile push notifications
- **API Testing**: Direct integration with all PubNub REST APIs

### Developer Experience
- **TypeScript Support**: Full type safety throughout the application
- **Error Handling**: Comprehensive error management with user feedback
- **Documentation**: Extensive implementation guides and API references
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Implementation Guides

### Adding New Tools
1. Create page component in `src/pages/`
2. Add route to `App.tsx`
3. Update sidebar navigation
4. Implement configuration management pattern
5. Add comprehensive error handling

### Configuration Pattern
```typescript
// Implement page settings for persistence
const [pageSettings, setPageSettings] = useState({
  // Feature-specific configuration
});

// Auto-sync with config context
useEffect(() => {
  setConfigPageSettings(pageSettings);
  console.log('🔧 Page Settings Updated:', pageSettings);
}, [pageSettings]);
```

### Error Handling Pattern
```typescript
try {
  // PubNub API calls
  const result = await pubnub.someOperation();
  toast({ title: "Success", description: "Operation completed" });
} catch (error) {
  console.error('Operation failed:', error);
  toast({ 
    title: "Error", 
    description: "Operation failed", 
    variant: "destructive" 
  });
}
```

## Testing Utilities

### File Upload Testing
```bash
# Use the provided Python script to bulk upload test files
python utils/upload_test_files.py
```

### Mobile Push Testing
- Requires valid APNs certificates or FCM server keys
- Test with real device tokens for accurate results
- Use debug channels for delivery monitoring

## Recent Updates

### Latest Features (July 2025)
- **App Context Implementation**: Full user, channel, and membership management with bulk operations
- **Enhanced Access Manager**: Improved PAM with better authentication handling across all APIs
- **Mobile Push Enhancement**: Working implementation with proper cross-platform support
- **Channel Groups Restructure**: Query-based API approach for better performance
- **Gallery Mode**: Enhanced file sharing with thumbnail viewing capabilities
- **Connection Management**: Centralized connection handling for stateless PubNub API calls
- **Enhanced Presence Tools**: Simplified UI with always-visible advanced options
- **Configuration Versioning**: Full PubNub App Context integration

### Performance Improvements
- **Optimized File Loading**: Efficient pagination for large file sets
- **Real-time Updates**: Minimized API calls with intelligent caching
- **Memory Management**: Proper cleanup of PubNub instances
- **Error Resilience**: Graceful degradation and fallback strategies

## Security & Best Practices

### Credential Management
- **Secure Storage**: API keys encrypted in local storage
- **No Secret Key Exposure**: Client-side safety measures
- **PAM Integration**: Proper token-based access control

### Code Quality
- **TypeScript**: 100% type coverage for reliability
- **Error Boundaries**: Comprehensive error handling
- **Memory Management**: Proper cleanup of subscriptions and instances
- **Performance**: Optimized rendering and API usage

## Contributing

### Development Workflow
1. **Feature Development**: Follow established patterns
2. **Configuration**: Implement page settings management
3. **Documentation**: Update implementation guides
4. **Testing**: Verify with real PubNub credentials

### Code Standards
- **TypeScript**: Required for all new code
- **React Hooks**: Functional components only
- **Error Handling**: Comprehensive try-catch blocks
- **User Feedback**: Toast notifications for all operations

This PubNub Ultimate Ninja Kit represents a complete developer toolkit for building and managing real-time applications with PubNub's suite of services.