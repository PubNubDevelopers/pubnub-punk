import { useState } from 'react';
import { ChevronDown, ChevronUp, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { configService } from '@/lib/config-service';
import { storage } from '@/lib/storage';
import { useConfig } from '@/contexts/config-context';
import { SaveConfigDialog } from './config-panel/SaveConfigDialog';
import { ConfigHistoryList } from './config-panel/ConfigHistoryList';

interface ConfigPanelProps {
  className?: string;
  onConfigSaved?: () => void;
}

export function ConfigPanel({ 
  className = '', 
  onConfigSaved
}: ConfigPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { toast } = useToast();
  const { pageSettings, configType } = useConfig();

  // Placeholder config data
  const configName = 'Default';
  const configDate = new Date().toLocaleDateString();

  // Check if save functionality is available
  const canSave = pageSettings && configType;

  const handleSaveCurrentSettings = () => {
    if (!canSave) {
      toast({
        title: "Save not available",
        description: "Page settings or configuration type not provided.",
        variant: "destructive",
      });
      return;
    }

    // Get current app settings to check if auto-save is enabled
    const appSettings = storage.getSettings();
    
    // Check if auto-save to PubNub and version history are enabled
    if (!appSettings.storage.autoSaveToPubNub || !appSettings.storage.saveVersionHistory) {
      toast({
        title: "PubNub auto-save disabled",
        description: "Enable 'Auto-save Configurations in PubNub' and 'Enable Version History' in Settings to use this feature.",
        variant: "destructive",
      });
      return;
    }

    // Open the save dialog
    setShowSaveDialog(true);
  };

  const handleConfirmSave = async (configName: string) => {
    setIsSaving(true);
    setShowSaveDialog(false);
    
    try {
      // Create description for the saved version
      const description = `Page settings saved from ${configType} page at ${new Date().toLocaleString()}`;
      
      // Save using the config service with versioning and custom name
      const result = await configService.saveVersionedConfig(
        configType,
        pageSettings,
        description,
        [], // tags
        configName // custom name
      );
      
      if (result.success) {
        toast({
          title: "Settings saved with versioning",
          description: `Configuration "${configName}" saved as version ${result.version?.version} in PubNub.`,
        });
        
        // Call the optional callback
        if (onConfigSaved) {
          onConfigSaved();
        }
      } else {
        toast({
          title: "Save failed",
          description: result.error || "Failed to save configuration to PubNub.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Save error",
        description: "An unexpected error occurred while saving. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSave = () => {
    setShowSaveDialog(false);
  };

  return (
    <div className={`flex flex-col items-end space-y-2 ${className}`}>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>Current Config: {configName} {configDate}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {isExpanded && (
          <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Configuration History</h3>
              <div className="max-h-80 overflow-y-auto">
                <ConfigHistoryList 
                  configType={configType}
                  onConfigRestore={(config) => {
                    // Handle config restoration if needed
                    console.log('Config restored:', config);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      <Button 
        variant="outline"
        size="sm"
        className="text-xs text-gray-600 hover:text-gray-800 border-gray-300 hover:border-gray-400"
        onClick={handleSaveCurrentSettings}
        disabled={!canSave || isSaving}
      >
        <Save className="mr-1 h-3 w-3" />
        {isSaving ? 'Saving...' : 'Save Current Settings'}
      </Button>

      <SaveConfigDialog
        isOpen={showSaveDialog}
        onConfirm={handleConfirmSave}
        onCancel={handleCancelSave}
        isLoading={isSaving}
      />
    </div>
  );
}