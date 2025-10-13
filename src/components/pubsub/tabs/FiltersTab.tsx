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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Filter, Plus, X, ChevronDown, Copy, HelpCircle, ChevronUp } from 'lucide-react';
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

const OPERATOR_OPTIONS: Array<{
  label: string;
  value: FilterCondition['operator'];
  help: string;
  examples: string[];
}> = [
  {
    label: 'Equals (==)',
    value: '==',
    help: 'Exact match - field must exactly equal the value',
    examples: ['data.status == "active"', 'meta.priority == "high"']
  },
  {
    label: 'Not Equals (!=)',
    value: '!=',
    help: 'Exclusion - field must not equal the value',
    examples: ['data.type != "test"', 'meta.region != "staging"']
  },
  {
    label: 'Greater Than (>)',
    value: '>',
    help: 'Numeric comparison - field must be greater than value',
    examples: ['data.score > 100', 'meta.temperature > 75']
  },
  {
    label: 'Less Than (<)',
    value: '<',
    help: 'Numeric comparison - field must be less than value',
    examples: ['data.battery < 20', 'meta.attempts < 3']
  },
  {
    label: 'Greater or Equal (>=)',
    value: '>=',
    help: 'Numeric comparison - field must be greater than or equal to value',
    examples: ['data.level >= 5', 'meta.age >= 18']
  },
  {
    label: 'Less or Equal (<=)',
    value: '<=',
    help: 'Numeric comparison - field must be less than or equal to value',
    examples: ['data.priority <= 3', 'meta.count <= 10']
  },
  {
    label: 'Pattern Match (LIKE)',
    value: 'LIKE',
    help: 'Wildcard pattern matching - use * for wildcard. Examples: "sensor*" (starts with), "*-prod" (ends with), "*urgent*" (contains)',
    examples: ['data.name LIKE "sensor*"', 'meta.id LIKE "*-prod"', 'data.tag LIKE "*urgent*"']
  },
  {
    label: 'Contains',
    value: 'CONTAINS',
    help: 'Substring or array element search - checks if field contains the value',
    examples: ['data.tags CONTAINS "urgent"', 'meta.recipients CONTAINS "alice"']
  },
  {
    label: 'Not Contains',
    value: 'NOT_CONTAINS',
    help: 'Inverse substring or array search - checks if field does not contain the value',
    examples: ['data.tags NOT_CONTAINS "test"', 'meta.flags NOT_CONTAINS "disabled"']
  },
];

const TYPE_OPTIONS: Array<{
  label: string;
  value: FilterCondition['type'];
  help: string;
  placeholder: string;
}> = [
  {
    label: 'String',
    value: 'string',
    help: 'Text value - will be wrapped in quotes in the expression',
    placeholder: 'e.g. "high", "announcement", "sensor-A"'
  },
  {
    label: 'Number',
    value: 'number',
    help: 'Numeric value - for scores, counts, thresholds',
    placeholder: 'e.g. 100, 20, 3.14'
  },
  {
    label: 'Boolean',
    value: 'boolean',
    help: 'True or false value - for flags and states',
    placeholder: ''
  },
  {
    label: 'Expression',
    value: 'expression',
    help: 'Arithmetic expressions - supports +, -, *, /, % (modulo). Use for sampling, calculations, and thresholds.',
    placeholder: 'e.g. eventId % 100, total - used, limit * 0.8'
  },
];

const filterTemplateCategories: Array<{
  category: string;
  icon: string;
  templates: Array<{ name: string; filter: Omit<FilterCondition, 'id'> }>;
}> = [
  {
    category: 'Chat & Messaging',
    icon: '💬',
    templates: [
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
        name: 'Direct Messages to User',
        filter: {
          target: 'meta',
          field: 'recipient',
          operator: '==',
          value: 'user123',
          type: 'string',
        },
      },
      {
        name: 'Messages from Moderators',
        filter: {
          target: 'meta',
          field: 'user["role"]',
          operator: '==',
          value: 'moderator',
          type: 'string',
        },
      },
    ],
  },
  {
    category: 'Notifications & Alerts',
    icon: '🔔',
    templates: [
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
        name: 'Critical Alerts Only',
        filter: {
          target: 'meta',
          field: 'level',
          operator: '==',
          value: 'critical',
          type: 'string',
        },
      },
      {
        name: 'Exclude Test Notifications',
        filter: {
          target: 'meta',
          field: 'environment',
          operator: '!=',
          value: 'test',
          type: 'string',
        },
      },
    ],
  },
  {
    category: 'IoT & Sensors',
    icon: '🌡️',
    templates: [
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
        name: 'Critical Battery Level',
        filter: {
          target: 'data',
          field: 'battery',
          operator: '<',
          value: '20',
          type: 'number',
        },
      },
      {
        name: 'Temperature Out of Range',
        filter: {
          target: 'data',
          field: 'temperature',
          operator: '>',
          value: '75',
          type: 'number',
        },
      },
    ],
  },
  {
    category: 'Analytics & Events',
    icon: '📊',
    templates: [
      {
        name: 'Conversion Events',
        filter: {
          target: 'data',
          field: 'eventType',
          operator: '==',
          value: 'conversion',
          type: 'string',
        },
      },
      {
        name: 'High Value Transactions',
        filter: {
          target: 'data',
          field: 'amount',
          operator: '>',
          value: '1000',
          type: 'number',
        },
      },
      {
        name: 'Exclude Test/Staging Data',
        filter: {
          target: 'meta',
          field: 'region',
          operator: '!=',
          value: 'test',
          type: 'string',
        },
      },
    ],
  },
  {
    category: 'Advanced (Arithmetic)',
    icon: '🔢',
    templates: [
      {
        name: '1% Sampling (Modulo)',
        filter: {
          target: 'meta',
          field: 'eventId % 100',
          operator: '==',
          value: '0',
          type: 'expression',
        },
      },
      {
        name: 'Odd Messages Only',
        filter: {
          target: 'data',
          field: 'messageId % 2',
          operator: '!=',
          value: '0',
          type: 'expression',
        },
      },
      {
        name: '80% Threshold Warning',
        filter: {
          target: 'data',
          field: 'usage',
          operator: '>',
          value: 'limit * 0.8',
          type: 'expression',
        },
      },
      {
        name: 'Remaining Capacity Low',
        filter: {
          target: 'data',
          field: 'total - used',
          operator: '<',
          value: '10',
          type: 'expression',
        },
      },
    ],
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
  const [collapsedFilters, setCollapsedFilters] = React.useState<Set<number>>(new Set());

  const toggleFilterCollapse = (id: number) => {
    setCollapsedFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getOperatorInfo = (operator: FilterCondition['operator']) => {
    return OPERATOR_OPTIONS.find(op => op.value === operator);
  };

  const getTypeInfo = (type: FilterCondition['type']) => {
    return TYPE_OPTIONS.find(t => t.value === type);
  };

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
    <TooltipProvider>
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
              <DropdownMenuContent align="end" className="w-72 max-h-96 overflow-y-auto">
                <DropdownMenuLabel>Filter Templates by Use Case</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {filterTemplateCategories.map((category) => (
                  <div key={category.category}>
                    <DropdownMenuLabel className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <span>{category.icon}</span>
                      <span>{category.category}</span>
                    </DropdownMenuLabel>
                    {category.templates.map((template) => (
                      <DropdownMenuItem
                        key={template.name}
                        onClick={() => applyFilterTemplate(template)}
                        className="pl-8"
                      >
                        {template.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </div>
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

        {filters.map((filter, index) => {
          const operatorInfo = getOperatorInfo(filter.operator);
          const typeInfo = getTypeInfo(filter.type);
          const isCollapsed = collapsedFilters.has(filter.id);
          const filterSummary = `${buildFieldPath(filter)} ${operatorLabel(filter.operator)} ${formatValueForDisplay(filter)}`;

          return (
            <div key={filter.id} className="rounded-lg border bg-gray-50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => toggleFilterCollapse(filter.id)}
                  >
                    {isCollapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                  <span className="text-sm font-medium">Filter {index + 1}</span>
                  {isCollapsed && (
                    <code className="text-xs text-gray-600 font-mono ml-2">{filterSummary}</code>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeFilter(filter.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {!isCollapsed && (
                <>
              <div className="grid gap-3 md:grid-cols-[180px,1fr,180px]">
                {/* Target Selection */}
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

                {/* Field Input with better placeholder */}
                <Input
                  placeholder={`e.g. ${filter.target === 'data' ? 'user.name, tags[0], status' : 'priority, region, device["type"]'}`}
                  value={filter.field}
                  onChange={(event) => updateFilter(filter.id, 'field', event.target.value)}
                  className={!filter.field.trim() ? 'border-orange-300' : ''}
                />

                {/* Operator Selection with Tooltip */}
                <div className="flex items-center gap-1">
                  <Select
                    value={filter.operator}
                    onValueChange={(value) => updateFilter(filter.id, 'operator', value)}
                  >
                    <SelectTrigger className="flex-1">
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
                  {operatorInfo && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="font-semibold mb-1">{operatorInfo.label}</p>
                        <p className="text-xs mb-2">{operatorInfo.help}</p>
                        <p className="text-xs font-mono text-gray-600">
                          {operatorInfo.examples.map((ex, i) => (
                            <span key={i} className="block">{ex}</span>
                          ))}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Type-First Value Input Section */}
              <div className="mt-3 grid gap-3 md:grid-cols-[150px,1fr]">
                {/* Type Selection */}
                <div className="flex items-center gap-1">
                  <Select value={filter.type} onValueChange={(value) => updateFilter(filter.id, 'type', value)}>
                    <SelectTrigger className="flex-1">
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
                  {typeInfo && typeInfo.help && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="text-xs">{typeInfo.help}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Value Input based on Type */}
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
                    placeholder={typeInfo?.placeholder || 'Enter numeric value'}
                    value={filter.value}
                    onChange={(event) => updateFilter(filter.id, 'value', event.target.value)}
                    className={!filter.value.trim() ? 'border-orange-300' : ''}
                  />
                ) : (
                  <Input
                    placeholder={typeInfo?.placeholder || 'Enter value'}
                    value={filter.value}
                    onChange={(event) => updateFilter(filter.id, 'value', event.target.value)}
                    className={!filter.value.trim() ? 'border-orange-300' : ''}
                  />
                )}
              </div>

              {/* Validation Message */}
              {(!filter.field.trim() || (filter.type !== 'boolean' && !filter.value.trim())) && (
                <p className="mt-2 text-xs text-orange-600">
                  {!filter.field.trim() && !filter.value.trim()
                    ? 'Field and value are required'
                    : !filter.field.trim()
                    ? 'Field is required'
                    : 'Value is required'}
                </p>
              )}
                </>
              )}
            </div>
          );
        })}

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
    </TooltipProvider>
  );
}
