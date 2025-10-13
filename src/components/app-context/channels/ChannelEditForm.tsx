import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, AlertCircle } from 'lucide-react';
import { ChannelMetadata, CustomField } from '@/types/app-context';
import { validateCustomFields, parseCustomFieldsFromObject } from '@/utils/app-context';

interface ChannelEditFormProps {
  channel: ChannelMetadata | null;
  onSave: (channelData: Partial<ChannelMetadata>) => Promise<void>;
  onCancel: () => void;
}

export function ChannelEditForm({ channel, onSave, onCancel }: ChannelEditFormProps) {
  const [formData, setFormData] = useState(() => {
    if (channel) {
      return {
        id: channel.id,
        name: channel.name || '',
        description: channel.description || '',
        status: channel.status || '',
        type: channel.type || '',
        custom: channel.custom || {}
      };
    }
    return {
      id: '',
      name: '',
      description: '',
      status: '',
      type: '',
      custom: {}
    };
  });

  const [loading, setLoading] = useState(false);
  const [customFields, setCustomFields] = useState<Array<CustomField & { error?: string }>>(() => {
    return parseCustomFieldsFromObject(formData.custom).map(field => ({ ...field }));
  });

  const addCustomField = () => {
    setCustomFields(prev => [...prev, { key: '', value: '', type: 'string' as const }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  const validateFieldValue = (value: string, type: 'string' | 'number' | 'boolean'): string | undefined => {
    if (!value.trim()) return undefined;
    
    switch (type) {
      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) {
          return 'Must be a valid number';
        }
        return undefined;
      case 'boolean':
        const lowerValue = value.toLowerCase().trim();
        if (lowerValue !== 'true' && lowerValue !== 'false') {
          return 'Must be "true" or "false"';
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const updateCustomField = (index: number, field: 'key' | 'value' | 'type', newValue: string) => {
    setCustomFields(prev => prev.map((item, i) => {
      if (i !== index) return item;
      
      const updatedItem = { ...item, [field]: newValue };
      
      if (field === 'value' || field === 'type') {
        const error = validateFieldValue(
          field === 'value' ? newValue : item.value,
          field === 'type' ? newValue as 'string' | 'number' | 'boolean' : item.type
        );
        updatedItem.error = error;
      }
      
      return updatedItem;
    }));
  };

  const hasValidationErrors = customFields.some(field => field.error);
  const hasDuplicateKeys = customFields.some((field, index) => 
    field.key.trim() && customFields.findIndex(f => f.key.trim() === field.key.trim()) !== index
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasValidationErrors || hasDuplicateKeys) {
      return;
    }

    setLoading(true);
    try {
      const customData = validateCustomFields(customFields);
      
      const updateData: Partial<ChannelMetadata> = {
        ...formData,
        custom: Object.keys(customData).length > 0 ? customData : undefined
      };

      // Remove empty fields to avoid overwriting with empty strings
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof ChannelMetadata] === '' && key !== 'id') {
          delete updateData[key as keyof ChannelMetadata];
        }
      });

      await onSave(updateData);
    } catch (error) {
      console.error('Error saving channel:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* ID Field (Read-only for edit, editable for create) */}
        <div className="col-span-2">
          <Label htmlFor="id">Channel ID</Label>
          <Input
            id="id"
            value={formData.id}
            onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
            disabled={!!channel}
            className={channel ? "bg-gray-50 text-gray-600" : ""}
            placeholder={channel ? "" : "Enter unique channel ID"}
          />
          {channel && (
            <p className="text-xs text-gray-500 mt-1">Channel ID cannot be changed</p>
          )}
        </div>

        {/* Name Field */}
        <div className="col-span-1">
          <Label htmlFor="name">Channel Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter channel name"
          />
        </div>

        {/* Status Field */}
        <div className="col-span-1">
          <Label htmlFor="status">Status</Label>
          <Input
            id="status"
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            placeholder="Enter status (e.g., active, inactive)"
          />
        </div>

        {/* Type Field */}
        <div className="col-span-2">
          <Label htmlFor="type">Type</Label>
          <Input
            id="type"
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
            placeholder="Enter channel type (e.g., public, private, group)"
          />
        </div>

        {/* Description Field */}
        <div className="col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter channel description"
            rows={3}
          />
        </div>
      </div>

      {/* Custom Fields */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Custom Fields</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustomField}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
        </div>

        {customFields.map((field, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-start">
            <div className="col-span-4">
              <Input
                value={field.key}
                onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                placeholder="Field key"
                className={hasDuplicateKeys && customFields.findIndex(f => f.key.trim() === field.key.trim()) !== index ? 'border-red-500' : ''}
              />
            </div>
            <div className="col-span-4">
              <Input
                value={field.value}
                onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                placeholder="Field value"
                className={field.error ? 'border-red-500' : ''}
              />
              {field.error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {field.error}
                </p>
              )}
            </div>
            <div className="col-span-3">
              <Select
                value={field.type}
                onValueChange={(value) => updateCustomField(index, 'type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCustomField(index)}
                className="h-10 w-10 p-0 text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {hasDuplicateKeys && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Duplicate field keys are not allowed
          </p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading || hasValidationErrors || hasDuplicateKeys || (!channel && !formData.id.trim())}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Saving...' : channel ? 'Update Channel' : 'Create Channel'}
        </Button>
      </div>
    </form>
  );
}
