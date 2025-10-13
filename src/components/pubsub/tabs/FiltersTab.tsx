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
import { Filter, Plus, X, ChevronDown, Copy, HelpCircle, ChevronUp, Zap, AlertTriangle, CheckCircle, Wand2, Code2 } from 'lucide-react';
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

const ARITHMETIC_OPERATORS = [
  { label: 'None', value: 'none', symbol: '' },
  { label: '% (modulo)', value: '%', symbol: '%', help: 'Remainder after division - useful for sampling (e.g., eventId % 100)' },
  { label: '+ (add)', value: '+', symbol: '+', help: 'Addition - useful for thresholds (e.g., base + bonus)' },
  { label: '- (subtract)', value: '-', symbol: '-', help: 'Subtraction - useful for capacity (e.g., total - used)' },
  { label: '* (multiply)', value: '*', symbol: '*', help: 'Multiplication - useful for percentages (e.g., limit * 0.8)' },
  { label: '/ (divide)', value: '/', symbol: '/', help: 'Division - useful for averages (e.g., total / count)' },
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
  const [builderMode, setBuilderMode] = React.useState<Record<number, 'simple' | 'visual'>>({});

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

  const toggleBuilderMode = (id: number) => {
    setBuilderMode(prev => ({
      ...prev,
      [id]: prev[id] === 'visual' ? 'simple' : 'visual'
    }));
  };

  const parseArithmeticExpression = (expression: string): { baseField: string; operator: string; operand: string } => {
    const trimmed = expression.trim();

    // Try to find arithmetic operators
    const operators = ['%', '+', '-', '*', '/'];
    for (const op of operators) {
      const parts = trimmed.split(op).map(p => p.trim());
      if (parts.length === 2 && parts[0] && parts[1]) {
        return { baseField: parts[0], operator: op, operand: parts[1] };
      }
    }

    return { baseField: trimmed, operator: 'none', operand: '' };
  };

  const buildArithmeticExpression = (baseField: string, operator: string, operand: string): string => {
    if (!operator || operator === 'none' || !operand) {
      return baseField;
    }
    return `${baseField} ${operator} ${operand}`;
  };

  const getOperatorInfo = (operator: FilterCondition['operator']) => {
    return OPERATOR_OPTIONS.find(op => op.value === operator);
  };

  const getTypeInfo = (type: FilterCondition['type']) => {
    return TYPE_OPTIONS.find(t => t.value === type);
  };

  const analyzeFilterPerformance = () => {
    if (filters.length === 0) return null;

    const activeFilters = filters.filter(f => f.field.trim() && (f.type === 'boolean' || f.value.trim()));
    if (activeFilters.length === 0) return null;

    const fastOperators = ['==', '!=', '>', '<', '>=', '<='];
    const moderateOperators = ['LIKE', 'CONTAINS', 'NOT_CONTAINS'];

    const fastFilters = activeFilters.filter(f => fastOperators.includes(f.operator) && f.type !== 'expression');
    const moderateFilters = activeFilters.filter(f => moderateOperators.includes(f.operator));
    const complexFilters = activeFilters.filter(f =>
      f.type === 'expression' && (
        f.field.includes('+') || f.field.includes('-') || f.field.includes('*') ||
        f.field.includes('/') || f.field.includes('%') ||
        f.value.includes('+') || f.value.includes('-') || f.value.includes('*') ||
        f.value.includes('/') || f.value.includes('%')
      )
    );

    const hasOrLogic = filterLogic === '||';
    const manyFilters = activeFilters.length > 5;

    return {
      fastFilters,
      moderateFilters,
      complexFilters,
      hasOrLogic,
      manyFilters,
      overallRating: complexFilters.length > 2 || manyFilters ? 'caution' :
                     complexFilters.length > 0 || moderateFilters.length > 3 ? 'moderate' : 'fast'
    };
  };

  const performanceAnalysis = analyzeFilterPerformance();

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
          const isVisualMode = builderMode[filter.id] === 'visual';
          const parsedField = parseArithmeticExpression(filter.field);
          const parsedValue = parseArithmeticExpression(filter.value);

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
                <div className="flex items-center gap-1">
                  {!isCollapsed && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={isVisualMode ? 'default' : 'outline'}
                          className="h-7 px-2"
                          onClick={() => toggleBuilderMode(filter.id)}
                        >
                          {isVisualMode ? (
                            <><Wand2 className="h-3 w-3 mr-1" /> Visual</>
                          ) : (
                            <><Code2 className="h-3 w-3 mr-1" /> Simple</>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isVisualMode ? 'Switch to simple text input mode' : 'Switch to visual expression builder'}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => removeFilter(filter.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {!isCollapsed && (
                <>
                {isVisualMode ? (
                  /* Visual Expression Builder Mode */
                  <div className="space-y-3 bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Wand2 className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-semibold text-purple-900">Visual Expression Builder</span>
                    </div>

                    {/* Target Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-700">Target</Label>
                      <Select
                        value={filter.target}
                        onValueChange={(value) => updateFilter(filter.id, 'target', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TARGET_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Left Side Expression Builder */}
                    <div className="space-y-2 bg-white p-3 rounded border">
                      <Label className="text-xs font-semibold text-gray-700">Left Side (Field Expression)</Label>
                      <div className="grid gap-2 md:grid-cols-[1fr,140px,100px]">
                        <div>
                          <Label className="text-xs text-gray-600">Base Field</Label>
                          <Input
                            placeholder="e.g. eventId, usage, score"
                            value={parsedField.baseField}
                            onChange={(e) => {
                              const newExpr = buildArithmeticExpression(e.target.value, parsedField.operator, parsedField.operand);
                              updateFilter(filter.id, 'field', newExpr);
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Arithmetic</Label>
                          <Select
                            value={parsedField.operator || 'none'}
                            onValueChange={(value) => {
                              const newExpr = buildArithmeticExpression(parsedField.baseField, value, parsedField.operand);
                              updateFilter(filter.id, 'field', newExpr);
                              if (value !== 'none') {
                                updateFilter(filter.id, 'type', 'expression');
                              }
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ARITHMETIC_OPERATORS.map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {parsedField.operator && parsedField.operator !== 'none' && (
                          <div>
                            <Label className="text-xs text-gray-600">Operand</Label>
                            <Input
                              placeholder="e.g. 100"
                              value={parsedField.operand}
                              onChange={(e) => {
                                const newExpr = buildArithmeticExpression(parsedField.baseField, parsedField.operator, e.target.value);
                                updateFilter(filter.id, 'field', newExpr);
                              }}
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                      <div className="mt-2 p-2 bg-purple-50 rounded text-xs font-mono text-purple-900">
                        {filter.target}.{filter.field || '?'}
                      </div>
                    </div>

                    {/* Comparison Operator */}
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-700">Comparison Operator</Label>
                      <div className="flex items-center gap-1">
                        <Select
                          value={filter.operator}
                          onValueChange={(value) => updateFilter(filter.id, 'operator', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
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
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>

                    {/* Right Side Expression Builder */}
                    <div className="space-y-2 bg-white p-3 rounded border">
                      <Label className="text-xs font-semibold text-gray-700">Right Side (Value/Expression)</Label>
                      <div className="grid gap-2 md:grid-cols-[1fr,140px,100px]">
                        <div>
                          <Label className="text-xs text-gray-600">Value/Base</Label>
                          {filter.type === 'boolean' ? (
                            <Select
                              value={parsedValue.baseField || 'true'}
                              onValueChange={(value) => updateFilter(filter.id, 'value', value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">true</SelectItem>
                                <SelectItem value="false">false</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type={filter.type === 'number' ? 'number' : 'text'}
                              placeholder={filter.type === 'string' ? 'e.g. high, active' : 'e.g. 0, 100, limit'}
                              value={parsedValue.baseField}
                              onChange={(e) => {
                                const newExpr = buildArithmeticExpression(e.target.value, parsedValue.operator, parsedValue.operand);
                                updateFilter(filter.id, 'value', newExpr);
                              }}
                              className="mt-1"
                            />
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Type</Label>
                          <Select
                            value={filter.type}
                            onValueChange={(value) => updateFilter(filter.id, 'type', value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TYPE_OPTIONS.filter(t => t.value !== 'expression').map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {filter.type === 'number' && parsedValue.operator !== 'none' && (
                          <div>
                            <Label className="text-xs text-gray-600">Operand</Label>
                            <Input
                              placeholder="e.g. 0.8"
                              value={parsedValue.operand}
                              onChange={(e) => {
                                const newExpr = buildArithmeticExpression(parsedValue.baseField, parsedValue.operator, e.target.value);
                                updateFilter(filter.id, 'value', newExpr);
                              }}
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="text-xs font-semibold text-blue-900 mb-1">Complete Expression:</div>
                      <div className="font-mono text-sm text-blue-900">
                        {buildFieldPath(filter)} {operatorLabel(filter.operator)} {formatValueForDisplay(filter)}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Simple Mode - Original Form */
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

        {/* Performance Hints Panel */}
        {performanceAnalysis && (
          <div className={`rounded-lg border-2 p-4 ${
            performanceAnalysis.overallRating === 'fast' ? 'border-green-300 bg-green-50' :
            performanceAnalysis.overallRating === 'moderate' ? 'border-yellow-300 bg-yellow-50' :
            'border-orange-300 bg-orange-50'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {performanceAnalysis.overallRating === 'fast' ? (
                <Zap className="h-5 w-5 text-green-600" />
              ) : performanceAnalysis.overallRating === 'moderate' ? (
                <CheckCircle className="h-5 w-5 text-yellow-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              )}
              <h3 className="text-sm font-semibold text-gray-700">
                Performance Impact:{' '}
                {performanceAnalysis.overallRating === 'fast' ? 'Excellent' :
                 performanceAnalysis.overallRating === 'moderate' ? 'Good' : 'Consider Optimizing'}
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              {performanceAnalysis.fastFilters.length > 0 && (
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    <strong>{performanceAnalysis.fastFilters.length} fast filter{performanceAnalysis.fastFilters.length > 1 ? 's' : ''}</strong>
                    {' '}using efficient operators (==, !=, &gt;, &lt;, &gt;=, &lt;=)
                  </span>
                </div>
              )}

              {performanceAnalysis.moderateFilters.length > 0 && (
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    <strong>{performanceAnalysis.moderateFilters.length} pattern-matching filter{performanceAnalysis.moderateFilters.length > 1 ? 's' : ''}</strong>
                    {' '}using LIKE/CONTAINS (moderately efficient)
                  </span>
                </div>
              )}

              {performanceAnalysis.complexFilters.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    <strong>{performanceAnalysis.complexFilters.length} arithmetic filter{performanceAnalysis.complexFilters.length > 1 ? 's' : ''}</strong>
                    {' '}with calculations - consider pre-computing values in metadata when publishing
                  </span>
                </div>
              )}

              {performanceAnalysis.hasOrLogic && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    Using <strong>OR (||) logic</strong> - may be less selective than AND. Ensure this matches your use case.
                  </span>
                </div>
              )}

              {performanceAnalysis.manyFilters && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    <strong>Many filters ({filters.length})</strong> - consider combining related conditions or using metadata flags
                  </span>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-gray-600 italic">
                  💡 Tip: Put most selective filters first, use numeric comparisons when possible, and pre-compute complex values in publisher metadata.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </TabsContent>
    </TooltipProvider>
  );
}
