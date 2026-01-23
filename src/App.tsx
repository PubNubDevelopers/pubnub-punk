import { useEffect, useState, useCallback } from "react";
import { Switch, Route, Router } from "wouter";
export const BASE_PATH = "/docs/console";

// Custom hook for hash-based routing
const useHashLocation = (): [string, (to: string) => void] => {
  const [location, setLocation] = useState(() =>
    window.location.hash.replace(/^#/, "") || "/"
  );

  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.replace(/^#/, "") || "/";
      setLocation(hash);
    };

    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return [location, navigate];
};
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app-shell";
import { ConfigProvider } from "@/contexts/config-context";
import { PubNubProvider, usePubNubContext } from "@/contexts/pubnub-context";
import SettingsPage from "@/pages/settings";
// import PubSubPage from "@/pages/pubsub"; // Original implementation - archived
// import PubSubWireframePage from "@/pages/pubsub-wireframe"; // Wireframe - no longer needed
import { PubSubPageEnhanced } from "@/components/pubsub";
import PubNubPersistencePage from "@/pages/pubnub-persistence";
import ChannelGroupsPage from "@/pages/channel-groups";
import FileSharingPage from "@/pages/file-sharing";
import PresenceV2Page from "@/pages/presence-v2";
import FunctionsPage from "@/pages/functions";
import AccessManagerPage from "@/pages/access-manager";
import StreamGeneratorPage from "@/pages/stream-generator";
import EventWorkflowPage from "@/pages/event-workflow";
import TestConnectionPage from "@/pages/test-connection";
import NotFound from "@/pages/not-found";
import { useToast } from "@/hooks/use-toast";
import { storage } from "@/lib/storage";

const pageConfig: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Settings',
    subtitle: 'Configure your PubNub credentials and preferences'
  },
  '/pubsub': {
    title: 'Pub/Sub Tool',
    subtitle: 'Real-time messaging with advanced filtering and controls'
  },
  '/pubnub-persistence': {
    title: 'PubNub Persistence Tool',
    subtitle: 'Manage message storage and retrieval'
  },
  '/channel-groups': {
    title: 'Channel Groups Tool',
    subtitle: 'Manage and organize channel groups'
  },
  '/file-sharing': {
    title: 'File Sharing Tool',
    subtitle: 'Test file upload and sharing'
  },
  '/presence': {
    title: 'Presence Tool',
    subtitle: 'Monitor user presence and occupancy'
  },
  '/presence-v2': {
    title: 'Presence Tool',
    subtitle: 'This path now points to the refreshed Presence experience'
  },
  '/functions': {
    title: 'Functions Tool',
    subtitle: 'Test serverless functions'
  },
  '/access-manager': {
    title: 'Access Manager Tool',
    subtitle: 'Manage permissions and access control'
  },
  '/stream-generator': {
    title: 'Stream Generator',
    subtitle: 'Generate test data streams'
  },
  '/event-workflow': {
    title: 'Event Workflow',
    subtitle: 'Test complex service workflows'
  },
  '/test-connection': {
    title: 'Test PN Connection',
    subtitle: 'Test the centralized PubNub connection system'
  },
};

function AppRouter() {
  const [location, navigate] = useHashLocation();
  const { settings, updateSettings } = usePubNubContext();
  const { toast } = useToast();
  const [queryParamsProcessed, setQueryParamsProcessed] = useState(false);

  // Check for credentials in URL immediately (during render, not in useEffect)
  const [hadCredentialsInQuery] = useState(() => {
    const queryString = window.location.search;
    if (!queryString) return false;

    const params = new URLSearchParams(queryString);
    const publishKey = params.get('publishKey') || params.get('pubKey');
    const subscribeKey = params.get('subscribeKey') || params.get('subKey');

    return Boolean(publishKey && subscribeKey);
  });

  // Process query parameters on mount (before credential validation)
  useEffect(() => {
    if (queryParamsProcessed) return;

    const queryString = window.location.search;
    if (!queryString) {
      setQueryParamsProcessed(true);
      return;
    }

    const params = new URLSearchParams(queryString);
    const publishKey = params.get('publishKey') || params.get('pubKey');
    const subscribeKey = params.get('subscribeKey') || params.get('subKey');

    // Update global settings if keys provided
    if (publishKey || subscribeKey) {
      const newSettings = {
        ...settings,
        credentials: {
          ...settings.credentials,
          ...(publishKey && { publishKey }),
          ...(subscribeKey && { subscribeKey }),
        }
      };

      updateSettings(newSettings);

      // Show toast notification
      const channel = params.get('channel');
      const appliedItems: string[] = [];
      if (publishKey) appliedItems.push('Publish Key');
      if (subscribeKey) appliedItems.push('Subscribe Key');
      if (channel) appliedItems.push(`Channel: ${channel}`);

      toast({
        title: 'Settings Applied from URL',
        description: appliedItems.join(', '),
      });

      // Note: Channel handling is done in PubSubPageEnhanced
      // We only process keys here to unblock navigation
    }

    setQueryParamsProcessed(true);
  }, [queryParamsProcessed, toast]); // Added toast to dependencies

  const publishKey = settings?.credentials?.publishKey?.trim();
  const subscribeKey = settings?.credentials?.subscribeKey?.trim();
  const hasRequiredKeys = Boolean(publishKey && subscribeKey);

  // Don't redirect if keys exist, keys were in query params, or on Settings page
  const lockedToSettings = !hasRequiredKeys && !hadCredentialsInQuery && location !== '/';
  const configKey = lockedToSettings ? '/' : location;
  const config = pageConfig[configKey] || { title: '404', subtitle: 'Page not found' };

  useEffect(() => {
    if (lockedToSettings) {
      navigate('/');
      toast({
        title: 'PubNub keys required',
        description: 'Enter your publish and subscribe keys on the Settings page before using other tools.',
        variant: 'destructive',
      });
    }
  }, [lockedToSettings, navigate, toast]);

  if (lockedToSettings) {
    return (
      <AppShell pageTitle={config.title} pageSubtitle={config.subtitle}>
        <SettingsPage />
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle={config.title} pageSubtitle={config.subtitle}>
      <Switch>
        <Route path="/" component={SettingsPage} />
        <Route path="/pubsub" component={PubSubPageEnhanced} />
        {/* Test routes - deprecated after successful migration
        <Route path="/pubsub-wireframe" component={PubSubWireframePage} />
        <Route path="/pubsub-new" component={NewPubSubPage} />
        <Route path="/pubsub-enhanced" component={PubSubPageEnhanced} />
        */}
        <Route path="/pubnub-persistence" component={PubNubPersistencePage} />
        <Route path="/channel-groups" component={ChannelGroupsPage} />
        <Route path="/file-sharing" component={FileSharingPage} />
        <Route path="/presence" component={PresenceV2Page} />
        <Route path="/presence-v2" component={PresenceV2Page} />
        <Route path="/functions" component={FunctionsPage} />
        <Route path="/access-manager" component={AccessManagerPage} />
        <Route path="/stream-generator" component={StreamGeneratorPage} />
        <Route path="/event-workflow" component={EventWorkflowPage} />
        <Route path="/test-connection" component={TestConnectionPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <Router hook={useHashLocation}>
      <TooltipProvider>
        <PubNubProvider>
          <ConfigProvider>
            <Toaster />
            <AppRouter />
          </ConfigProvider>
        </PubNubProvider>
      </TooltipProvider>
    </Router>
  );
}

export default App;
