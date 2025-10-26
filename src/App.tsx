import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
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
import PresencePage from "@/pages/presence";
import FunctionsPage from "@/pages/functions";
import AccessManagerPage from "@/pages/access-manager";
import StreamGeneratorPage from "@/pages/stream-generator";
import EventWorkflowPage from "@/pages/event-workflow";
import TestConnectionPage from "@/pages/test-connection";
import NotFound from "@/pages/not-found";
import { useToast } from "@/hooks/use-toast";

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

function Router() {
  const [location, navigate] = useLocation();
  const { settings } = usePubNubContext();
  const { toast } = useToast();

  const publishKey = settings?.credentials?.publishKey?.trim();
  const subscribeKey = settings?.credentials?.subscribeKey?.trim();
  const hasRequiredKeys = Boolean(publishKey && subscribeKey);
  const lockedToSettings = !hasRequiredKeys && location !== '/';
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
        <Route path="/presence" component={PresencePage} />
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
    <TooltipProvider>
      <PubNubProvider>
        <ConfigProvider>
          <Toaster />
          <Router />
        </ConfigProvider>
      </PubNubProvider>
    </TooltipProvider>
  );
}

export default App;
