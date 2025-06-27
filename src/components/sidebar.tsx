import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Settings, 
  MessageCircle, 
  Smartphone, 
  Zap, 
  Upload, 
  Users, 
  Code, 
  Database, 
  Lightbulb, 
  TrendingUp, 
  Activity, 
  GitBranch,
  Box,
  X,
  Menu,
  Archive,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
}

interface NavCategory {
  label: string;
  items: NavItem[];
}

const navigationConfig: (NavItem | NavCategory)[] = [
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/',
  },
  {
    label: 'Messaging Services',
    items: [
      { id: 'pubsub', label: 'Pub/Sub', icon: MessageCircle, path: '/pubsub' },
      { id: 'pubnub-persistence', label: 'PubNub Persistence', icon: Archive, path: '/pubnub-persistence' },
      { id: 'channel-groups', label: 'Channel Groups', icon: Layers, path: '/channel-groups' },
      { id: 'mobile-push', label: 'Mobile Push', icon: Smartphone, path: '/mobile-push' },
      { id: 'events-actions', label: 'Events & Actions', icon: Zap, path: '/events-actions' },
    ],
  },
  {
    label: 'Application Services',
    items: [
      { id: 'file-sharing', label: 'File Sharing', icon: Upload, path: '/file-sharing' },
      { id: 'presence', label: 'Presence', icon: Users, path: '/presence' },
      { id: 'functions', label: 'Functions', icon: Code, path: '/functions' },
      { id: 'app-context', label: 'App Context', icon: Database, path: '/app-context' },
    ],
  },
  {
    label: 'Analytics Services',
    items: [
      { id: 'illuminate', label: 'Illuminate', icon: Lightbulb, path: '/illuminate' },
      { id: 'insights', label: 'Insights', icon: TrendingUp, path: '/insights' },
    ],
  },
  {
    label: 'Advanced Tools',
    items: [
      { id: 'stream-generator', label: 'Stream Generator', icon: Activity, path: '/stream-generator' },
      { id: 'event-workflow', label: 'Event Workflow', icon: GitBranch, path: '/event-workflow' },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    
    return (
      <Link key={item.id} href={item.path}>
        <Button
          variant="ghost"
          className={`w-full justify-start space-x-3 px-4 py-2.5 h-auto font-medium transition-all duration-200 ${
            active ? 'shadow-sm' : 'hover:bg-white/10'
          }`}
          style={{
            backgroundColor: active ? 'hsl(351, 72%, 47%)' : 'transparent',
            color: active ? 'white' : 'rgba(255, 255, 255, 0.8)'
          }}
          onClick={() => {
            if (window.innerWidth < 768) {
              onClose();
            }
          }}
        >
          <Icon className="w-5 h-5" style={{ color: active ? 'white' : 'rgba(255, 255, 255, 0.6)' }} />
          <span>{item.label}</span>
        </Button>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-80 shadow-lg border-r
          flex flex-col transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ backgroundColor: 'hsl(228, 80%, 14%)', borderColor: 'hsl(228, 80%, 14%)' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10" style={{ backgroundColor: 'hsl(228, 80%, 14%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'hsl(351, 72%, 47%)' }}>
                <Box className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">PubNub</h1>
                <p className="text-sm text-white/80">Developer Tools</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-gray-300 hover:text-white hover:bg-transparent"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {navigationConfig.map((item, index) => {
              if ('items' in item) {
                // Category
                return (
                  <div key={index}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider px-4 mb-3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      {item.label}
                    </h3>
                    <div className="space-y-1">
                      {item.items.map(renderNavItem)}
                    </div>
                  </div>
                );
              } else {
                // Single item (Settings)
                return (
                  <div key={item.id} className={index === 0 ? 'mb-6' : ''}>
                    {renderNavItem(item)}
                  </div>
                );
              }
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10" style={{ backgroundColor: 'hsl(228, 80%, 14%)' }}>
          <div className="flex items-center justify-between text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            <span>v1.0.0</span>
            <a href="#" style={{ color: 'hsl(217, 96%, 64%)' }} className="hover:text-white transition-colors">
              Help
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
