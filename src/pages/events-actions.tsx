import { Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function EventsActionsPage() {
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-pubnub-blue rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="text-white h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-pubnub-text mb-2">Events & Actions Tool</h3>
            <p className="text-gray-600 mb-6">Configure and test event-driven automation</p>
            <div className="bg-pubnub-light rounded-lg p-6">
              <p className="text-sm text-gray-500">Tool implementation coming soon...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
