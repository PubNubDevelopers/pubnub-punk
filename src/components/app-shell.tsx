import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/sidebar';
import { ConnectionStatus } from '@/components/connection-status';

interface AppShellProps {
  children: React.ReactNode;
  pageTitle: string;
  pageSubtitle: string;
}

export function AppShell({ children, pageTitle, pageSubtitle }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-pubnub-light">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2 hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-pubnub-text">{pageTitle}</h2>
              <p className="text-sm text-gray-600">{pageSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <ConnectionStatus />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
