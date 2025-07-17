import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

interface SearchCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface SearchParams {
  conditions: SearchCondition[];
  logic: 'AND' | 'OR';
  sort?: { field: string; order: 'asc' | 'desc' };
  limit: number;
}

interface AppContextSearchPanelProps {
  type: 'users' | 'channels';
  onSearch: (params: SearchParams) => void;
  onClear: () => void;
  loading?: boolean;
  totalCount?: number;
  cachedParams?: {
    conditions: SearchCondition[];
    logic: 'AND' | 'OR';
    sort: { field: string; order: 'asc' | 'desc' };
    limit: number;
    rawFilter: string;
    useRawFilter: boolean;
  };
}

const USER_FIELDS = [
  { value: 'id', label: 'ID' },
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'externalId', label: 'External ID' },
  { value: 'profileUrl', label: 'Profile URL' },
  { value: 'status', label: 'Status' },
  { value: 'type', label: 'Type' },
  { value: 'updated', label: 'Updated' },
];

const CHANNEL_FIELDS = [
  { value: 'id', label: 'ID' },
  { value: 'name', label: 'Name' },
  { value: 'description', label: 'Description' },
  { value: 'status', label: 'Status' },
  { value: 'type', label: 'Type' },
  { value: 'updated', label: 'Updated' },
];

const OPERATORS = [
  { value: '==', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: 'LIKE', label: 'contains (*pattern*)' },
  { value: '>', label: 'greater than' },
  { value: '<', label: 'less than' },
  { value: '>=', label: 'greater than or equal' },
  { value: '<=', label: 'less than or equal' },
];

const SORT_FIELDS = [
  { value: 'id', label: 'ID' },
  { value: 'name', label: 'Name' },
  { value: 'updated', label: 'Updated' },
];

export function AppContextSearchPanel({ 
  type, 
  onSearch, 
  onClear, 
  loading = false, 
  totalCount,
  cachedParams
}: AppContextSearchPanelProps) {
  const [conditions, setConditions] = useState<SearchCondition[]>(cachedParams?.conditions || []);
  const [logic, setLogic] = useState<'AND' | 'OR'>(cachedParams?.logic || 'AND');
  const [sortField, setSortField] = useState<string>(cachedParams?.sort?.field || 'updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(cachedParams?.sort?.order || 'desc');
  const [limit, setLimit] = useState<number>(cachedParams?.limit || 100);
  const [rawFilter, setRawFilter] = useState<string>(cachedParams?.rawFilter || '');
  const [useRawFilter, setUseRawFilter] = useState<boolean>(cachedParams?.useRawFilter || false);

  const fields = type === 'users' ? USER_FIELDS : CHANNEL_FIELDS;

  // Update state when cached parameters change (e.g., when switching tabs)
  useEffect(() => {
    if (cachedParams) {
      setConditions(cachedParams.conditions || []);
      setLogic(cachedParams.logic || 'AND');
      setSortField(cachedParams.sort?.field || 'updated');
      setSortOrder(cachedParams.sort?.order || 'desc');
      setLimit(cachedParams.limit || 100);
      setRawFilter(cachedParams.rawFilter || '');
      setUseRawFilter(cachedParams.useRawFilter || false);
    }
  }, [cachedParams, type]);

  const addCondition = () => {
    const newCondition: SearchCondition = {
      id: Date.now().toString(),
      field: fields[0].value,
      operator: '==',
      value: ''
    };
    setConditions([...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<SearchCondition>) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const buildFilterString = () => {
    if (useRawFilter) {
      return rawFilter.trim();
    }

    if (conditions.length === 0) {
      return '';
    }

    const conditionStrings = conditions
      .filter(c => c.field && c.operator && c.value)
      .map(c => {
        let value = c.value;
        
        // Handle string values (needs quotes)
        if (c.operator === 'LIKE' || ['id', 'name', 'email', 'externalId', 'profileUrl', 'status', 'type', 'description'].includes(c.field)) {
          value = `"${value}"`;
        }
        
        return `${c.field} ${c.operator} ${value}`;
      });

    if (conditionStrings.length === 0) {
      return '';
    }

    return conditionStrings.join(` ${logic} `);
  };

  const handleSearch = () => {
    const filter = buildFilterString();
    
    const searchParams: SearchParams & { rawFilter?: string; useRawFilter?: boolean } = {
      conditions,
      logic,
      sort: { field: sortField, order: sortOrder },
      limit,
      rawFilter: useRawFilter ? rawFilter : undefined,
      useRawFilter
    };

    onSearch(searchParams);
  };

  const handleClear = () => {
    setConditions([]);
    setRawFilter('');
    setUseRawFilter(false);
    onClear();
  };

  const hasValidConditions = () => {
    if (useRawFilter) {
      return rawFilter.trim().length > 0;
    }
    return conditions.some(c => c.field && c.operator && c.value);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Search {type === 'users' ? 'Users' : 'Channels'}
          {totalCount && (
            <Badge variant="outline">
              {totalCount.toLocaleString()} total objects
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          More than {totalCount?.toLocaleString()} objects detected, so will not load all locally. 
          Use search to query specific objects from App Context.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Method Toggle */}
        <div className="flex items-center gap-4">
          <Label className="text-sm font-medium">Search Method:</Label>
          <Button
            variant={!useRawFilter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUseRawFilter(false)}
          >
            Guided Search
          </Button>
          <Button
            variant={useRawFilter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUseRawFilter(true)}
          >
            Raw Filter
          </Button>
        </div>

        <Separator />

        {useRawFilter ? (
          /* Raw Filter Input */
          <div className="space-y-2">
            <Label htmlFor="raw-filter">Raw Filter Expression</Label>
            <Textarea
              id="raw-filter"
              placeholder={`Example: name LIKE "*admin*" && updated >= "2023-01-01T00:00:00Z"`}
              value={rawFilter}
              onChange={(e) => setRawFilter(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="text-sm text-gray-500">
              <p>Use PubNub filter syntax. Examples:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><code>id == &quot;user-123&quot;</code> - Exact match</li>
                <li><code>name LIKE &quot;*admin*&quot;</code> - Pattern match</li>
                <li><code>updated &gt;= &quot;2023-01-01T00:00:00Z&quot;</code> - Date comparison</li>
                <li><code>status == &quot;active&quot; &amp;&amp; type == &quot;admin&quot;</code> - Multiple conditions</li>
              </ul>
            </div>
          </div>
        ) : (
          /* Guided Search */
          <div className="space-y-4">
            {/* Search Conditions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Search Conditions</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCondition}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Condition
                </Button>
              </div>

              {conditions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No search conditions. Click "Add Condition" to start building your search.
                </div>
              )}

              {conditions.map((condition, index) => (
                <div key={condition.id} className="flex items-center gap-2 p-3 border rounded-lg">
                  {index > 0 && (
                    <Select value={logic} onValueChange={(value: 'AND' | 'OR') => setLogic(value)}>
                      <SelectTrigger className="w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  
                  <Select 
                    value={condition.field} 
                    onValueChange={(value) => updateCondition(condition.id, { field: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map(field => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={condition.operator} 
                    onValueChange={(value) => updateCondition(condition.id, { operator: value })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Value"
                    value={condition.value}
                    onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                    className="flex-1"
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeCondition(condition.id)}
                    className="p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Sort Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sort-field">Sort By</Label>
            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_FIELDS.map(field => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort-order">Order</Label>
            <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit">Limit Results</Label>
            <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1000</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSearch}
            disabled={!hasValidConditions() || loading}
            className="flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search
          </Button>
          
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </Button>

          {loading && (
            <div className="text-sm text-gray-500 ml-2">
              Searching...
            </div>
          )}
        </div>

        {/* Preview */}
        {hasValidConditions() && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <Label className="text-sm font-medium">Filter Preview:</Label>
            <code className="block mt-1 text-sm text-gray-700 break-all">
              {buildFilterString()}
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}