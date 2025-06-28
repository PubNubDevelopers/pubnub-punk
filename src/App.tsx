import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app-shell";
import { ConfigProvider } from "@/contexts/config-context";
import SettingsPage from "@/pages/settings";
import PubSubPage from "@/pages/pubsub";
import PubNubPersistencePage from "@/pages/pubnub-persistence";
import ChannelGroupsPage from "@/pages/channel-groups";
import MobilePushPage from "@/pages/mobile-push";
import EventsActionsPage from "@/pages/events-actions";
import FileSharingPage from "@/pages/file-sharing";
import PresencePage from "@/pages/presence";
import FunctionsPage from "@/pages/functions";
import AppContextPage from "@/pages/app-context";
import IlluminatePage from "@/pages/illuminate";
import InsightsPage from "@/pages/insights";
import StreamGeneratorPage from "@/pages/stream-generator";
import EventWorkflowPage from "@/pages/event-workflow";
import NotFound from "@/pages/not-found";

const pageConfig: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Settings',
    subtitle: 'Configure your PubNub credentials and preferences'
  },
  '/pubsub': {
    title: 'Pub/Sub Tool',
    subtitle: 'Test real-time messaging functionality'
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
  '/events-actions': {
    title: 'Events & Actions Tool',
    subtitle: 'Configure event-driven automation'
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
  '/illuminate': {
    title: 'Illuminate Tool',
    subtitle: 'Real-time analytics dashboard'
  },
  '/insights': {
    title: 'Insights Tool',
    subtitle: 'Historical analytics and reporting'
  },
  '/stream-generator': {
    title: 'Stream Generator',
    subtitle: 'Generate test data streams'
  },
  '/event-workflow': {
    title: 'Event Workflow',
    subtitle: 'Test complex service workflows'
  },
};

function Router() {
  const [location] = useLocation();
  const config = pageConfig[location] || { title: '404', subtitle: 'Page not found' };

  return (
    <AppShell pageTitle={config.title} pageSubtitle={config.subtitle}>
      <Switch>
        <Route path="/" component={SettingsPage} />
        <Route path="/pubsub" component={PubSubPage} />
        <Route path="/pubnub-persistence" component={PubNubPersistencePage} />
        <Route path="/channel-groups" component={ChannelGroupsPage} />
        <Route path="/mobile-push" component={MobilePushPage} />
        <Route path="/events-actions" component={EventsActionsPage} />
        <Route path="/file-sharing" component={FileSharingPage} />
        <Route path="/presence" component={PresencePage} />
        <Route path="/functions" component={FunctionsPage} />
        <Route path="/app-context" component={AppContextPage} />
        <Route path="/illuminate" component={IlluminatePage} />
        <Route path="/insights" component={InsightsPage} />
        <Route path="/stream-generator" component={StreamGeneratorPage} />
        <Route path="/event-workflow" component={EventWorkflowPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <TooltipProvider>
      <ConfigProvider>
        <Toaster />
        <Router />
      </ConfigProvider>
    </TooltipProvider>
  );
}

export default App;
