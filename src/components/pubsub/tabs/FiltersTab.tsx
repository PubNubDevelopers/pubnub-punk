import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Filter, Plus, X, ChevronDown, Copy } from 'lucide-react';
import type { FilterCondition } from '../types';
import { generateFilterExpression, copyToClipboard } from '../utils';

interface FiltersTabProps {
  filters: FilterCondition[];
  filterLogic: '&&' | '||';
  onFiltersChange: (filters: FilterCondition[]) => void;
  onFilterLogicChange: (logic: '&&' | '||') => void;
}

const filterTemplates = [
  { name: 'Alert Messages', filter: { target: 'message' as const, field: 'type', operator: '==' as const, value: 'alert' } },
  { name: 'High Priority', filter: { target: 'uuid' as const, field: 'priority', operator: '==' as const, value: 'high' } },
  { name: 'Sensor Data', filter: { target: 'message' as const, field: 'sensorId', operator: 'contains' as const, value: 'sensor-' } },
  { name: 'Recent Messages', filter: { target: 'channel' as const, field: '', operator: '>' as const, value: '{{current_timetoken-3600000}}' } },
  { name: 'Exclude System', filter: { target: 'uuid' as const, field: '', operator: '!=' as const, value: 'system' } },
];

export default function FiltersTab({
  filters,
  filterLogic,
  onFiltersChange,
  onFilterLogicChange
}: FiltersTabProps) {
  const updateFilter = (id: number, field: string, value: any) => {
    const updatedFilters = filters.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    );
    onFiltersChange(updatedFilters);
  };

  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: Date.now(),
      target: 'message',
      field: '',
      operator: '==',
      value: '',
      type: 'string'
    };
    onFiltersChange([...filters, newFilter]);
  };

  const removeFilter = (id: number) => {
    onFiltersChange(filters.filter(f => f.id !== id));
  };

  const applyFilterTemplate = (template: any) => {
    const newFilter: FilterCondition = {
      id: Date.now(),
      ...template.filter,
      type: 'string'
    };
    onFiltersChange([...filters, newFilter]);
  };

  const generateFilterSummary = () => {
    const expression = generateFilterExpression(filters, filterLogic);
    return expression || 'No filters active';
  };

  const generateHighlightedExpression = () => {
    if (filters.length === 0) return null;
    
    return filters.map((f, index) => {
      const hasField = f.field && f.field.trim() !== '';
      const hasValue = f.value && f.value.trim() !== '';
      
      return (
        <span key={f.id}>
          {index > 0 && (
            <>
              <span className="text-blue-600 font-bold mx-1">
                {filterLogic === '&&' ? '&&' : '||'}
              </span>
              {' '}
            </>
          )}
          {index > 0 && '('}
          <span className={hasField ? 'text-purple-600' : 'text-gray-400'}>
            {f.target}{hasField ? `.${f.field}` : '.?'}
          </span>
          {' '}
          <span className="text-green-600">{f.operator}</span>
          {' '}
          <span className={hasValue ? 'text-orange-600' : 'text-gray-400'}>
            {hasValue ? (f.type === 'string' ? `'${f.value}'` : f.value) : '?'}
          </span>
          {index > 0 && ')'}
        </span>
      );
    });
  };

  return (
    <TabsContent value="filters" className="mt-4 space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Message Filters (Server-side)</Label>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Filter className="h-4 w-4 mr-1" />
                  Templates
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Common Filters</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {filterTemplates.map((template) => (
                  <DropdownMenuItem
                    key={template.name}
                    onClick={() => applyFilterTemplate(template)}
                  >
                    {template.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={addFilter}>
              <Plus className="h-4 w-4 mr-1" />
              Add Filter
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 mb-2">
          <Label className="text-sm">Filter Logic:</Label>
          <Select
            value={filterLogic}
            onValueChange={(value: '&&' | '||') => onFilterLogicChange(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="&&">AND (&&)</SelectItem>
              <SelectItem value="||">OR (||)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {filters.map((filter, index) => (
          <div key={filter.id} className="p-3 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Filter {index + 1}</span>
              {filters.length > 1 && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => removeFilter(filter.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Select
                value={filter.target}
                onValueChange={(value) => updateFilter(filter.id, 'target', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Target" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">Message</SelectItem>
                  <SelectItem value="uuid">UUID/Publisher</SelectItem>
                  <SelectItem value="channel">Channel</SelectItem>
                </SelectContent>
              </Select>
              
              <Input 
                placeholder="Field (e.g., type, priority)" 
                value={filter.field}
                onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
              />
              
              <Select
                value={filter.operator}
                onValueChange={(value) => updateFilter(filter.id, 'operator', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="==">Equals (==)</SelectItem>
                  <SelectItem value="!=">Not Equals (!=)</SelectItem>
                  <SelectItem value=">">Greater Than (&gt;)</SelectItem>
                  <SelectItem value="<">Less Than (&lt;)</SelectItem>
                  <SelectItem value=">=">Greater or Equal (&gt;=)</SelectItem>
                  <SelectItem value="<=">Less or Equal (&lt;=)</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="!contains">Not Contains</SelectItem>
                  <SelectItem value="startsWith">Starts With</SelectItem>
                  <SelectItem value="endsWith">Ends With</SelectItem>
                </SelectContent>
              </Select>
              
              <Input 
                placeholder="Value" 
                value={filter.value}
                onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
              />
            </div>
          </div>
        ))}
        
        <div className={`mt-4 p-4 rounded-lg border-2 transition-all duration-300 ${
          filters.length > 0 
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-md' 
            : 'bg-gray-50 border-gray-200 border-dashed'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                filters.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
              <div className="text-sm font-semibold text-gray-700">
                Live Filter Expression
              </div>
            </div>
            {filters.length > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {filters.some(f => !f.field || !f.value) ? 'Incomplete' : 'Valid'}
                </Badge>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 px-2"
                  onClick={() => {
                    copyToClipboard(generateFilterSummary());
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          <div className={`font-mono text-sm p-3 rounded bg-white border ${
            filters.length > 0 ? 'border-blue-200' : 'border-gray-200'
          } overflow-x-auto`}>
            {filters.length === 0 ? (
              <span className="text-gray-400 italic">No filters configured yet. Add filters above to see the expression.</span>
            ) : (
              <code className="break-all">
                {generateHighlightedExpression()}
              </code>
            )}
          </div>
          
          {filters.length > 0 && (
            <div className="mt-3 text-xs text-gray-600">
              <div className="flex items-center space-x-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>This expression will be evaluated server-side to filter messages before delivery</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}