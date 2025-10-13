# Version Manager System

## Overview

The version management system provides dynamic version display and changelog functionality for the PubNub DevTools application. It consists of a client-side version manager that integrates with the sidebar component to show the current app version and provide changelog information.

## Architecture

### Components

1. **VersionManager Class** (`src/lib/version-client.ts`)
   - Singleton client-side class for version management
   - Provides utility methods for version parsing and changelog generation
   - Relies on build-time injected version information

2. **Sidebar Integration** (`src/components/sidebar.tsx`)
   - Displays current version dynamically in the footer
   - Provides changelog modal functionality
   - Integrates with the VersionManager class

3. **Server-side Version Manager** (`src/lib/version.ts`)
   - Node.js utility for extracting version info from git
   - Used at build time to generate version information
   - Handles semantic versioning and commit analysis

## Client-Side Version Manager

### Features

- **Dynamic Version Display**: Gets version from build-time injected globals
- **Semantic Version Parsing**: Parses and formats semantic version strings
- **Development Build Detection**: Identifies pre-release and development versions
- **Changelog Generation**: Creates categorized changelogs from commit history

### API

```typescript
class VersionManager {
  // Get current application version
  getCurrentVersion(): string
  
  // Get detailed version information
  getVersionInfo(): VersionInfo
  
  // Check if current version is a development build
  isDevelopmentBuild(): boolean
  
  // Get formatted changelog entries
  getChangelog(): ChangelogEntry[]
  
  // Parse semantic version string
  parseVersion(version: string): SemanticVersion
  
  // Format version for display
  formatVersion(version: SemanticVersion): string
}
```

### Usage Example

```typescript
import { versionManager } from '@/lib/version-client';

// Get current version
const version = versionManager.getCurrentVersion();

// Check if development build
const isDev = versionManager.isDevelopmentBuild();

// Get changelog entries
const changelog = versionManager.getChangelog();
```

## Sidebar Integration

### Features

- **Dynamic Version Display**: Shows current version in footer
- **Clickable Version**: Opens changelog modal when clicked
- **Changelog Modal**: Displays recent changes and updates
- **Responsive Design**: Works on mobile and desktop

### Implementation

The sidebar component:
1. Imports the `versionManager` singleton
2. Uses React state to manage version and modal state
3. Fetches version on component mount
4. Displays version as clickable button in footer
5. Opens modal with changelog when version is clicked

### Code Example

```typescript
// In sidebar component
const [currentVersion, setCurrentVersion] = useState('v1.0.0');
const [isChangelogModalOpen, setChangelogModalOpen] = useState(false);

useEffect(() => {
  // Fetch the current version dynamically
  setCurrentVersion(versionManager.getCurrentVersion());
}, []);

// Version display in footer
<button 
  onClick={() => setChangelogModalOpen(true)}
  className="hover:text-white transition-colors"
>
  {currentVersion}
</button>
```

## Build-Time Integration

### Required Globals

The version manager expects these globals to be injected at build time:

```typescript
declare global {
  interface Window {
    __APP_VERSION__: string;
    __BUILD_TIME__: string;
    __GIT_COMMIT__: string;
    __RELEASE_INFO__: {
      version: string;
      buildTime: string;
      gitCommit: string;
      commitsSinceTag: number;
      isDevelopment: boolean;
      changelog: ChangelogEntry[];
    };
  }
}
```

### Build System Setup

To integrate with your build system:

1. **Webpack Configuration**:
```javascript
const webpack = require('webpack');
const { VersionManager } = require('./src/lib/version');

const versionManager = new VersionManager();
const releaseInfo = versionManager.getReleaseInfo();

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      '__APP_VERSION__': JSON.stringify(releaseInfo.version),
      '__BUILD_TIME__': JSON.stringify(releaseInfo.buildTime),
      '__GIT_COMMIT__': JSON.stringify(releaseInfo.gitCommit),
      '__RELEASE_INFO__': JSON.stringify(releaseInfo),
    }),
  ],
};
```

2. **Vite Configuration**:
```javascript
import { defineConfig } from 'vite';
import { VersionManager } from './src/lib/version';

const versionManager = new VersionManager();
const releaseInfo = versionManager.getReleaseInfo();

export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(releaseInfo.version),
    '__BUILD_TIME__': JSON.stringify(releaseInfo.buildTime),
    '__GIT_COMMIT__': JSON.stringify(releaseInfo.gitCommit),
    '__RELEASE_INFO__': JSON.stringify(releaseInfo),
  },
});
```

## Version Management Workflow

### Development Workflow

1. **Development Builds**: Version shows as "v1.0.0-dev.5+abc1234" format
2. **Commit Tracking**: Tracks commits since last tag
3. **Dynamic Updates**: Version updates automatically on each build

### Release Workflow

1. **Tag Creation**: Create git tag for new release
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

2. **Build Process**: Build system extracts version from git tag
3. **Version Display**: Shows clean version number (e.g., "v1.1.0")
4. **Changelog**: Generates changelog from commits since previous tag

### Changelog Generation

The system automatically categorizes commits based on conventional commit messages:

- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation changes
- **style**: Code style changes
- **refactor**: Code refactoring
- **test**: Test additions/changes
- **chore**: Maintenance tasks

## Data Types

### VersionInfo

```typescript
interface VersionInfo {
  version: string;
  buildTime: string;
  gitCommit: string;
  commitsSinceTag: number;
  isDevelopment: boolean;
}
```

### ChangelogEntry

```typescript
interface ChangelogEntry {
  title: string;
  date: string;
  description: string;
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';
  hash: string;
}
```

### SemanticVersion

```typescript
interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}
```

## Error Handling

The version manager includes fallback mechanisms:

1. **Missing Globals**: Falls back to package.json version or default
2. **Invalid Version**: Uses default version format
3. **Empty Changelog**: Shows placeholder message
4. **Git Errors**: Gracefully handles git command failures

## Testing

### Unit Tests

Test the version manager functionality:

```typescript
describe('VersionManager', () => {
  it('should parse semantic versions correctly', () => {
    const version = versionManager.parseVersion('1.2.3-beta.1+build.123');
    expect(version.major).toBe(1);
    expect(version.minor).toBe(2);
    expect(version.patch).toBe(3);
    expect(version.prerelease).toBe('beta.1');
    expect(version.build).toBe('build.123');
  });

  it('should detect development builds', () => {
    // Mock development build globals
    window.__RELEASE_INFO__ = { isDevelopment: true };
    expect(versionManager.isDevelopmentBuild()).toBe(true);
  });
});
```

### Integration Tests

Test the sidebar integration:

```typescript
describe('Sidebar Version Display', () => {
  it('should display current version in footer', () => {
    render(<Sidebar isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText(/v\d+\.\d+\.\d+/)).toBeInTheDocument();
  });

  it('should open changelog modal on version click', () => {
    render(<Sidebar isOpen={true} onClose={jest.fn()} />);
    fireEvent.click(screen.getByText(/v\d+\.\d+\.\d+/));
    expect(screen.getByText('Changelog')).toBeInTheDocument();
  });
});
```

## Future Enhancements

1. **Auto-update Notifications**: Notify users when new version is available
2. **Version History**: Display full version history
3. **Release Notes**: Rich formatting for release notes
4. **Update Mechanism**: In-app update functionality
5. **Version Comparison**: Compare changes between versions

## Dependencies

- React (for sidebar component)
- Wouter (for routing)
- Lucide React (for icons)
- Node.js child_process (for git commands in server-side version)

## Files Modified

- `src/components/sidebar.tsx` - Added version display and changelog modal
- `src/lib/version-client.ts` - Client-side version manager
- `src/lib/version.ts` - Server-side version manager
- Build configuration files (webpack.config.js or vite.config.js)
