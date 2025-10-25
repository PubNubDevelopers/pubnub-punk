import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { storage } from '@/lib/storage';
import { ensurePubNubSdk } from '@/lib/sdk-loader';

const renderApp = () => {
  createRoot(document.getElementById("root")!).render(<App />);
};

(async () => {
  try {
    const settings = storage.getSettings();
    await ensurePubNubSdk(settings.sdkVersion);
  } catch (error) {
    console.error('Failed to preload PubNub SDK:', error);
  } finally {
    renderApp();
  }
})();
