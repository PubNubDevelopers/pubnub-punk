import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app-shell";
import { ConfigProvider } from "@/contexts/config-context";
import { PubNubProvider } from "@/contexts/pubnub-context";
import SettingsPage from "@/pages/settings";
// import PubSubPage from "@/pages/pubsub"; // Original implementation - archived
// import PubSubWireframePage from "@/pages/pubsub-wireframe"; // Wireframe - no longer needed
import { PubSubPageEnhanced } from "@/components/pubsub";
import PubNubPersistencePage from "@/pages/pubnub-persistence";
import ChannelGroupsPage from "@/pages/channel-groups";
import MobilePushPage from "@/pages/mobile-push";
import FileSharingPage from "@/pages/file-sharing";
import PresencePage from "@/pages/presence";
import FunctionsPage from "@/pages/functions";
import AppContextPage from "@/pages/app-context";
import AccessManagerPage from "@/pages/access-manager";
import StreamGeneratorPage from "@/pages/stream-generator";
import EventWorkflowPage from "@/pages/event-workflow";
import TestConnectionPage from "@/pages/test-connection";
import NotFound from "@/pages/not-found";

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
  '/mobile-push': {
    title: 'Mobile Push Tool',
    subtitle: 'Test and debug push notifications'
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
  '/app-context': {
    title: 'App Context Tool',
    subtitle: 'Manage users, channels, and metadata'
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
  const [location] = useLocation();
  const config = pageConfig[location] || { title: '404', subtitle: 'Page not found' };

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
        <Route path="/mobile-push" component={MobilePushPage} />
        <Route path="/file-sharing" component={FileSharingPage} />
        <Route path="/presence" component={PresencePage} />
        <Route path="/functions" component={FunctionsPage} />
        <Route path="/app-context" component={AppContextPage} />
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
