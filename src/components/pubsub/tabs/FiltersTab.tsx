import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, Plus, X, ChevronDown, Copy } from 'lucide-react';
import type { FilterCondition } from '../types';
import { generateFilterExpression, copyToClipboard } from '../utils';

interface FiltersTabProps {
  filters: FilterCondition[];
  filterLogic: '&&' | '||';
  onFiltersChange: (filters: FilterCondition[]) => void;
  onFilterLogicChange: (logic: '&&' | '||') => void;
}

const TARGET_OPTIONS: Array<{ label: string; value: FilterCondition['target'] }> = [
  { label: 'data (message payload)', value: 'data' },
  { label: 'meta (publish metadata)', value: 'meta' },
];

const OPERATOR_OPTIONS: Array<{ label: string; value: FilterCondition['operator'] }> = [
  { label: 'Equals (==)', value: '==' },
  { label: 'Not Equals (!=)', value: '!=' },
  { label: 'Greater Than (>)', value: '>' },
  { label: 'Less Than (<)', value: '<' },
  { label: 'Greater or Equal (>=)', value: '>=' },
  { label: 'Less or Equal (<=)', value: '<=' },
  { label: 'Pattern Match (LIKE)', value: 'LIKE' },
  { label: 'Contains', value: 'CONTAINS' },
  { label: 'Not Contains', value: 'NOT_CONTAINS' },
];

const TYPE_OPTIONS: Array<{ label: string; value: FilterCondition['type'] }> = [
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Expression', value: 'expression' },
];

const filterTemplates: Array<{ name: string; filter: Omit<FilterCondition, 'id'> }> = [
  {
    name: 'High Priority Messages',
    filter: {
      target: 'meta',
      field: 'priority',
      operator: '==',
      value: 'high',
      type: 'string',
    },
  },
  {
    name: 'Announcements',
    filter: {
      target: 'data',
      field: 'type',
      operator: '==',
      value: 'announcement',
      type: 'string',
    },
  },
  {
    name: 'Sensor Alerts',
    filter: {
      target: 'meta',
      field: 'device["type"]',
      operator: 'LIKE',
      value: 'sensor*',
      type: 'string',
    },
  },
  {
    name: 'Exclude Test Region',
    filter: {
      target: 'meta',
      field: 'region',
      operator: '!=',
      value: 'test',
      type: 'string',
    },
  },
  {
    name: 'Critical Battery',
    filter: {
      target: 'data',
      field: 'battery',
      operator: '<',
      value: '20',
      type: 'number',
    },
  },
];

const createEmptyFilter = (): FilterCondition => ({
  id: Date.now(),
  target: 'data',
  field: '',
  operator: '==',
  value: '',
  type: 'string',
});

const buildFieldPath = (filter: FilterCondition): string => {
  const trimmed = filter.field.trim();
  if (!trimmed) {
    return filter.target;
  }

  if (
    trimmed.startsWith('data.') ||
    trimmed.startsWith('meta.') ||
    trimmed.startsWith(`${filter.target}.`)
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('[')) {
    return `${filter.target}${trimmed}`;
  }

  return `${filter.target}.${trimmed}`;
};

const operatorLabel = (operator: FilterCondition['operator']): string => {
  return operator === 'NOT_CONTAINS' ? 'NOT CONTAINS' : operator;
};

const formatValueForDisplay = (filter: FilterCondition): string => {
  if (filter.type === 'boolean') {
    return filter.value === 'false' ? 'false' : 'true';
  }
  if (filter.type === 'number') {
    return filter.value || '0';
  }
  if (filter.type === 'expression') {
    return filter.value || '';
  }
  return filter.value ? `'${filter.value}'` : '?';
};

export default function FiltersTab({
  filters,
  filterLogic,
  onFiltersChange,
  onFilterLogicChange,
}: FiltersTabProps) {
  const updateFilter = (id: number, field: keyof FilterCondition, value: string) => {
    const updated = filters.map((filter) => {
      if (filter.id !== id) return filter;

      if (field === 'type') {
        let nextValue = filter.value;
        if (value === 'boolean') {
          nextValue = filter.value === 'false' ? 'false' : 'true';
        } else if (value === 'number') {
          nextValue = filter.value && !Number.isNaN(Number(filter.value)) ? filter.value : '';
        } else if (value === 'expression') {
          nextValue = '';
        } else {
          nextValue = '';
        }
        return { ...filter, type: value as FilterCondition['type'], value: nextValue };
      }

      return { ...filter, [field]: value } as FilterCondition;
    });

    onFiltersChange(updated);
  };

  const addFilter = () => {
    onFiltersChange([...filters, createEmptyFilter()]);
  };

  const removeFilter = (id: number) => {
    onFiltersChange(filters.filter((filter) => filter.id !== id));
  };

  const applyFilterTemplate = (template: { name: string; filter: Omit<FilterCondition, 'id'> }) => {
    onFiltersChange([...filters, { id: Date.now(), ...template.filter }]);
  };

  const filterExpression = generateFilterExpression(filters, filterLogic);
  const expressionBadges = filters.length > 0;
  const filtersIncomplete = filters.some((filter) => {
    if (!filter.field.trim()) {
      return true;
    }
    if (filter.type === 'boolean') {
      return false;
    }
    return !filter.value.trim();
  });

  const highlightedExpression = () => {
    if (filters.length === 0) return null;

    return filters.map((filter, index) => {
      const fieldPath = buildFieldPath(filter);
      const valueDisplay = formatValueForDisplay(filter);
      const hasValue = !(filter.type !== 'boolean' && valueDisplay === '?');
      return (
        <span key={filter.id}>
          {index > 0 && (
            <>
              <span className="mx-1 font-bold text-blue-600">{filterLogic === '&&' ? '&&' : '||'}</span>{' '}
            </>
          )}
          {index > 0 && '('}
          <span className="text-purple-600">{fieldPath}</span>{' '}
          <span className="text-green-600">{operatorLabel(filter.operator)}</span>{' '}
          <span className={hasValue ? 'text-orange-600' : 'text-gray-400'}>{hasValue ? valueDisplay : '?'}</span>
          {index > 0 && ')'}
        </span>
      );
    });
  };

  return (
    <TabsContent value="filters" className="mt-4 space-y-4">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Label>Subscribe filters (server-side)</Label>
            <p className="mt-1 text-xs text-gray-500">
              Use <code className="font-mono text-xs">data.&lt;field&gt;</code> for message payload and <code className="font-mono text-xs">meta.&lt;field&gt;</code> for metadata. Nested objects use bracket notation (e.g. <code className="font-mono text-xs">user['role']</code>) and arrays use indexes (e.g. <code className="font-mono text-xs">tags[0]</code>).
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Filter className="mr-1 h-4 w-4" />
                  Templates
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Quick start examples</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {filterTemplates.map((template) => (
                  <DropdownMenuItem key={template.name} onClick={() => applyFilterTemplate(template)}>
                    {template.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={addFilter}>
              <Plus className="mr-1 h-4 w-4" />
              Add filter
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Label className="text-sm">Filter logic:</Label>
          <Select value={filterLogic} onValueChange={(value: '&&' | '||') => onFilterLogicChange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="&&">AND (&&)</SelectItem>
              <SelectItem value="||">OR (||)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filters.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
            No filters configured. Add the first filter to start building your subscribe filter expression.
          </div>
        )}

        {filters.map((filter, index) => (
          <div key={filter.id} className="rounded-lg border bg-gray-50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">Filter {index + 1}</span>
              <Button size="sm" variant="ghost" onClick={() => removeFilter(filter.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-[180px,1fr,160px,1fr,150px]">
              <Select
                value={filter.target}
                onValueChange={(value) => updateFilter(filter.id, 'target', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Target" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Field (e.g. user['role'] or tags[0])"
                value={filter.field}
                onChange={(event) => updateFilter(filter.id, 'field', event.target.value)}
              />

              <Select
                value={filter.operator}
                onValueChange={(value) => updateFilter(filter.id, 'operator', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {filter.type === 'boolean' ? (
                <Select
                  value={filter.value || 'true'}
                  onValueChange={(value) => updateFilter(filter.id, 'value', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              ) : filter.type === 'number' ? (
                <Input
                  type="number"
                  placeholder="Value"
                  value={filter.value}
                  onChange={(event) => updateFilter(filter.id, 'value', event.target.value)}
                />
              ) : (
                <Input
                  placeholder={filter.type === 'expression' ? 'Expression' : 'Value'}
                  value={filter.value}
                  onChange={(event) => updateFilter(filter.id, 'value', event.target.value)}
                />
              )}

              <Select value={filter.type} onValueChange={(value) => updateFilter(filter.id, 'type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}

        <div
          className={`rounded-lg border-2 p-4 transition-all duration-300 ${
            expressionBadges
              ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 shadow'
              : 'border-gray-200 border-dashed bg-gray-50'
          }`}
        >
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${expressionBadges ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <div className="text-sm font-semibold text-gray-700">Live filter expression</div>
            </div>
            {expressionBadges && (
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {filtersIncomplete ? 'Incomplete' : 'Valid'}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={() => copyToClipboard(filterExpression || '')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded border bg-white p-3 font-mono text-sm">
            {filters.length === 0 ? (
              <span className="italic text-gray-400">No filters configured yet.</span>
            ) : (
              <code className="break-all">{highlightedExpression()}</code>
            )}
          </div>

          {expressionBadges && (
            <p className="mt-3 text-xs text-gray-600">
              Subscribe filters execute on PubNub servers before delivery. Use them to reduce bandwidth and only receive relevant events.
            </p>
          )}
        </div>
      </div>
    </TabsContent>
  );
}
