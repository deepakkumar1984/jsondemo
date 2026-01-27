import React, { useEffect, useState, useCallback, createContext, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

// --- Contexts ---

interface DataContextType {
  data: Record<string, any>;
  loading: boolean;
  refresh: () => void;
}

export const DataContext = createContext<DataContextType>({ data: {}, loading: true, refresh: () => {} });

interface FormContextType {
  values: Record<string, any>;
  setValue: (path: string, value: any) => void;
  getValues: () => Record<string, any>;
}

export const FormContext = createContext<FormContextType>({
  values: {},
  setValue: () => {},
  getValues: () => ({}),
});

// --- Helpers ---

/** Strip /api prefix from config URLs since the API client already adds it */
function stripApiPrefix(url: string): string {
  return url.startsWith('/api/') ? url.slice(4) : url;
}

// --- Action Handler ---

function useActionHandler(refreshData: () => void) {
  const navigate = useNavigate();
  const params = useParams();

  return useCallback(async (action: any, formValues?: Record<string, any>) => {
    if (!action) return;

    switch (action.type) {
      case 'navigate': {
        let to = action.to as string;
        // Replace :id with actual param
        if (params.id) {
          to = to.replace(':id', params.id);
        }
        navigate(to);
        break;
      }
      case 'api_call': {
        let url = stripApiPrefix(action.url as string);
        if (params.id) url = url.replace(':id', params.id);
        try {
          await api.request(url, { method: action.method || 'GET', body: action.body });
          if (action.onSuccess?.type === 'refresh_data') refreshData();
          if (action.onSuccess?.type === 'navigate') navigate(action.onSuccess.to);
        } catch (err: any) {
          alert(err.message || 'API call failed');
        }
        break;
      }
      case 'submit_form': {
        let url = stripApiPrefix(action.url as string);
        if (params.id) url = url.replace(':id', params.id);
        try {
          await api.request(url, { method: action.method || 'POST', body: formValues });
          let redirectTo = action.redirectTo as string;
          if (redirectTo) {
            if (params.id) redirectTo = redirectTo.replace(':id', params.id);
            navigate(redirectTo);
          }
        } catch (err: any) {
          alert(err.message || 'Form submission failed');
        }
        break;
      }
      case 'delete_confirm': {
        const msg = action.message || 'Are you sure you want to delete this item?';
        if (!window.confirm(msg)) return;
        let url = stripApiPrefix(action.url as string);
        if (params.id) url = url.replace(':id', params.id);
        try {
          await api.request(url, { method: 'DELETE' });
          if (action.redirectTo) navigate(action.redirectTo);
          else refreshData();
        } catch (err: any) {
          alert(err.message || 'Delete failed');
        }
        break;
      }
      case 'refresh_data':
        refreshData();
        break;
    }
  }, [navigate, params, refreshData]);
}

// --- Data Resolver ---

function resolveDataPath(data: Record<string, any>, path: string): any {
  if (!path) return undefined;
  const parts = path.split('.');
  let current: any = data;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

// Template helpers are handled inline where needed

// --- Component Registry (inline for tight integration) ---

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import { SearchInput } from '../components/ui/search';
import { StatCard } from '../components/ui/stat-card';
import { Pagination } from '../components/ui/pagination';
import { Plus, Edit, Trash2, ArrowLeft, Download } from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  plus: <Plus className="h-4 w-4" />,
  edit: <Edit className="h-4 w-4" />,
  trash: <Trash2 className="h-4 w-4" />,
  back: <ArrowLeft className="h-4 w-4" />,
  download: <Download className="h-4 w-4" />,
};

// --- Component Renderers ---

function RenderComponent({ node, onAction }: { node: any; onAction: (action: any, formValues?: any) => void }) {
  const { data } = useContext(DataContext);
  const formCtx = useContext(FormContext);
  const params = useParams();

  if (!node || !node.type) return null;

  const children = node.children?.map((child: any, i: number) => (
    <RenderComponent key={i} node={child} onAction={onAction} />
  ));

  switch (node.type) {
    case 'PageHeader': {
      let title = node.props.textPath ? resolveDataPath(data, node.props.textPath) : node.props.title;
      // Support titleParts: [{textPath: "..."}, {text: " "}, ...]
      if (node.props.titleParts && Array.isArray(node.props.titleParts)) {
        title = node.props.titleParts
          .map((part: any) => {
            if (part.textPath) return resolveDataPath(data, part.textPath) ?? '';
            return part.text ?? '';
          })
          .join('');
      }
      return (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title || node.props.title || 'Page'}</h1>
            {node.props.subtitle && <p className="text-muted-foreground mt-1">{node.props.subtitle}</p>}
          </div>
          {node.props.actions && (
            <div className="flex gap-2">
              {node.props.actions.map((act: any, i: number) => (
                <Button
                  key={i}
                  variant={act.variant === 'danger' ? 'destructive' : act.variant === 'primary' ? 'default' : act.variant || 'default'}
                  onClick={() => onAction(act.action)}
                >
                  {act.icon && ICON_MAP[act.icon]}
                  {act.icon && <span className="ml-1">{act.label}</span>}
                  {!act.icon && act.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'Card': {
      return (
        <Card>
          {(node.props.title || node.props.description) && (
            <CardHeader>
              {node.props.title && <CardTitle>{node.props.title}</CardTitle>}
              {node.props.description && <CardDescription>{node.props.description}</CardDescription>}
            </CardHeader>
          )}
          <CardContent className={node.props.padding === false ? 'p-0' : ''}>
            {children}
          </CardContent>
        </Card>
      );
    }

    case 'StatCard': {
      const value = node.props.valuePath ? resolveDataPath(data, node.props.valuePath) : node.props.value;
      return (
        <StatCard
          label={node.props.label}
          value={value ?? '—'}
          change={node.props.change}
          changeType={node.props.changeType}
        />
      );
    }

    case 'DataTable': {
      return <DataTableRenderer node={node} onAction={onAction} />;
    }

    case 'Form': {
      return <FormRenderer node={node} onAction={onAction}>{children}</FormRenderer>;
    }

    case 'TextField': {
      const val = formCtx.values[node.props.bindPath] ?? '';
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{node.props.label}{node.props.required && <span className="text-destructive ml-1">*</span>}</label>
          <Input
            type={node.props.type || 'text'}
            placeholder={node.props.placeholder}
            value={val}
            onChange={e => formCtx.setValue(node.props.bindPath, e.target.value)}
            required={node.props.required}
            disabled={node.props.disabled}
          />
        </div>
      );
    }

    case 'TextArea': {
      const val = formCtx.values[node.props.bindPath] ?? '';
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{node.props.label}{node.props.required && <span className="text-destructive ml-1">*</span>}</label>
          <Textarea
            placeholder={node.props.placeholder}
            rows={node.props.rows || 3}
            value={val}
            onChange={e => formCtx.setValue(node.props.bindPath, e.target.value)}
            required={node.props.required}
          />
        </div>
      );
    }

    case 'SelectField': {
      const val = formCtx.values[node.props.bindPath] ?? '';
      let options = node.props.options || [];
      if (node.props.optionsPath) {
        const resolved = resolveDataPath(data, node.props.optionsPath);
        if (Array.isArray(resolved)) {
          options = resolved.map((item: any) => {
            if (item.label && item.value) return item;
            if (item.id && item.name) return { label: item.name, value: item.id };
            if (item.id && item.title) return { label: item.title, value: item.id };
            if (item.id && item.firstName) return { label: `${item.firstName} ${item.lastName || ''}`.trim(), value: item.id };
            return { label: String(item), value: String(item) };
          });
        }
      }
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{node.props.label}{node.props.required && <span className="text-destructive ml-1">*</span>}</label>
          <Select value={val} onValueChange={v => formCtx.setValue(node.props.bindPath, v)}>
            <SelectTrigger>
              <SelectValue placeholder={node.props.placeholder || `Select ${node.props.label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: any) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    case 'DateField': {
      const val = formCtx.values[node.props.bindPath] ?? '';
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{node.props.label}{node.props.required && <span className="text-destructive ml-1">*</span>}</label>
          <Input
            type="date"
            value={val}
            onChange={e => formCtx.setValue(node.props.bindPath, e.target.value)}
            required={node.props.required}
          />
        </div>
      );
    }

    case 'Grid': {
      const cols = node.props.columns || 2;
      const gap = node.props.gap || '6';
      return (
        <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-${gap}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {children}
        </div>
      );
    }

    case 'Stack': {
      const dir = node.props.direction === 'horizontal' ? 'flex-row' : 'flex-col';
      const gap = node.props.gap || '4';
      return (
        <div className={`flex ${dir} gap-${gap}`} style={{ gap: `${parseInt(gap) * 0.25}rem` }}>
          {children}
        </div>
      );
    }

    case 'Button': {
      return (
        <Button
          variant={(node.props.variant as any) || 'default'}
          onClick={() => onAction(node.props.action)}
          disabled={node.props.disabled}
        >
          {node.props.icon && ICON_MAP[node.props.icon]}
          {node.props.icon && <span className="ml-1">{node.props.label}</span>}
          {!node.props.icon && node.props.label}
        </Button>
      );
    }

    case 'Badge': {
      const value = node.props.valuePath ? resolveDataPath(data, node.props.valuePath) : node.props.label;
      let variant: any = node.props.variant || 'default';
      if (node.props.colorMap && value) {
        variant = node.props.colorMap[value] || variant;
      }
      return <Badge variant={variant}>{value}</Badge>;
    }

    case 'Alert': {
      return (
        <Alert variant={node.props.variant || 'default'} className="mb-4">
          {node.props.title && <AlertTitle>{node.props.title}</AlertTitle>}
          <AlertDescription>{node.props.message}</AlertDescription>
        </Alert>
      );
    }

    case 'Tabs': {
      // Build tab triggers from props.tabs or from children TabPanels
      const tabDefs = node.props.tabs || (node.children || [])
        .filter((child: any) => child.type === 'TabPanel')
        .map((child: any) => ({
          value: child.props.value || child.props.id,
          label: child.props.label || child.props.value || child.props.id,
        }));
      const defaultVal = node.props.defaultValue || node.props.defaultTab || tabDefs[0]?.value;
      return (
        <Tabs defaultValue={defaultVal} className="w-full">
          <TabsList>
            {tabDefs.map((tab: any) => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
          {children}
        </Tabs>
      );
    }

    case 'TabPanel': {
      const value = node.props.value || node.props.id;
      return (
        <TabsContent value={value}>
          {children}
        </TabsContent>
      );
    }

    case 'Heading': {
      const text = node.props.textPath ? resolveDataPath(data, node.props.textPath) : node.props.text;
      const level = node.props.level || 2;
      const sizeClasses: Record<number, string> = {
        1: 'text-3xl font-bold',
        2: 'text-2xl font-semibold',
        3: 'text-xl font-semibold',
        4: 'text-lg font-medium',
        5: 'text-base font-medium',
        6: 'text-sm font-medium',
      };
      return React.createElement(`h${level}`, { className: sizeClasses[level] }, text);
    }

    case 'Text': {
      const content = node.props.contentPath ? resolveDataPath(data, node.props.contentPath) : node.props.content;
      const variantClasses: Record<string, string> = {
        default: '',
        muted: 'text-muted-foreground',
        small: 'text-sm text-muted-foreground',
      };
      return <p className={variantClasses[node.props.variant || 'default']}>{content}</p>;
    }

    case 'Divider': {
      return <hr className="my-4 border-border" />;
    }

    case 'Avatar': {
      const name = node.props.namePath ? resolveDataPath(data, node.props.namePath) : node.props.name;
      const initials = name ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?';
      const sizeMap: Record<string, string> = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' };
      const sizeClass = sizeMap[node.props.size || 'md'] || sizeMap.md;
      return (
        <div className={`${sizeClass} rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium`}>
          {initials}
        </div>
      );
    }

    case 'DetailRow': {
      let value = node.props.valuePath ? resolveDataPath(data, node.props.valuePath) : node.props.value;

      // Handle template (e.g., "{{employee.firstName}} {{employee.lastName}}")
      if (node.props.template) {
        value = node.props.template.replace(/\{\{(\S+?)\}\}/g, (_: string, path: string) => {
          const resolved = resolveDataPath(data, path);
          return resolved != null ? String(resolved) : '';
        }).trim();
      }

      let displayNode: React.ReactNode = value ?? '—';
      if (node.props.format === 'date' && value) {
        displayNode = new Date(value).toLocaleDateString();
      }
      if (node.props.format === 'currency' && value) {
        displayNode = `$${Number(value).toLocaleString()}`;
      }

      // Handle render prop (e.g., Badge rendering)
      if (node.props.render && typeof node.props.render === 'object' && node.props.render.type === 'Badge') {
        const badgeValue = node.props.render.props?.valuePath ? resolveDataPath(data, node.props.render.props.valuePath) : value;
        const strVal = String(badgeValue || '');
        const colorMap = node.props.render.props?.colorMap || {};
        const DEFAULT_BADGE_COLORS: Record<string, string> = {
          active: 'default', on_leave: 'secondary', terminated: 'destructive', resigned: 'outline',
          draft: 'secondary', open: 'default', closed: 'outline', completed: 'default',
          pending: 'secondary', approved: 'default', rejected: 'destructive',
        };
        const variant = colorMap[strVal] || DEFAULT_BADGE_COLORS[strVal.toLowerCase()] || 'default';
        displayNode = <Badge variant={variant as any}>{strVal.replace(/_/g, ' ')}</Badge>;
      }

      return (
        <div className="flex py-2 border-b border-border last:border-0">
          <span className="text-sm text-muted-foreground w-40 flex-shrink-0">{node.props.label}</span>
          <span className="text-sm font-medium">{typeof displayNode === 'string' ? displayNode : displayNode}</span>
        </div>
      );
    }

    case 'DetailSection': {
      return (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 pb-2 border-b">{node.props.title}</h3>
          {children}
        </div>
      );
    }

    default:
      return <div className="text-red-500 text-sm">Unknown component: {node.type}</div>;
  }
}

// --- DataTable Renderer ---

function DataTableRenderer({ node }: { node: any; onAction?: (action: any, formValues?: any) => void }) {
  const { data } = useContext(DataContext);
  const params = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const pageSize = 10;

  const rawData = resolveDataPath(data, node.props.dataPath);
  const isServerPaginated = rawData && !Array.isArray(rawData) && rawData.meta;
  let items = Array.isArray(rawData) ? rawData : (rawData?.data || []);
  const totalFromApi = rawData?.meta?.total;

  // Client-side search
  if (search && items.length > 0) {
    const q = search.toLowerCase();
    items = items.filter((row: any) =>
      Object.values(row).some((val: any) =>
        String(val).toLowerCase().includes(q)
      )
    );
  }

  // Client-side filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== '__all__') {
      items = items.filter((row: any) => String(row[key]) === value);
    }
  });

  const total = totalFromApi || items.length;
  const totalPages = Math.ceil(total / pageSize);
  // Don't re-slice if server already paginated (unless we filtered/searched client-side)
  const needsClientPagination = node.props.paginated && !isServerPaginated;
  const paginatedItems = needsClientPagination
    ? items.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : items;

  const handleRowClick = (row: any) => {
    if (node.props.rowClickAction) {
      let to = node.props.rowClickAction.to || '';
      to = to.replace(':id', row.id);
      if (params.id) to = to.replace(':parentId', params.id);
      navigate(to);
    }
  };

  return (
    <div className="space-y-4">
      {(node.props.searchable || node.props.filters) && (
        <div className="flex items-center gap-4">
          {node.props.searchable && (
            <SearchInput
              placeholder={node.props.searchPlaceholder || 'Search...'}
              value={search}
              onChange={setSearch}
              className="max-w-sm"
            />
          )}
          {node.props.filters?.map((filter: any) => {
            let options = filter.options || [];
            if (filter.optionsPath) {
              const resolved = resolveDataPath(data, filter.optionsPath);
              if (Array.isArray(resolved)) {
                options = resolved.map((item: any) => {
                  if (item.label && item.value) return item;
                  if (item.id && item.name) return { label: item.name, value: item.id };
                  return { label: String(item), value: String(item) };
                });
              }
            }
            return (
              <Select
                key={filter.key}
                value={filters[filter.key] || '__all__'}
                onValueChange={v => {
                  setFilters(prev => ({ ...prev, [filter.key]: v }));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All {filter.label}</SelectItem>
                  {options.map((opt: any) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {node.props.columns?.map((col: any) => (
                <TableHead key={col.key} className={col.className}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={node.props.columns?.length || 1} className="text-center py-8 text-muted-foreground">
                  {node.props.emptyMessage || 'No data found'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((row: any, i: number) => (
                <TableRow
                  key={row.id || i}
                  className={node.props.rowClickAction ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={() => handleRowClick(row)}
                >
                  {node.props.columns?.map((col: any) => (
                    <TableCell key={col.key}>
                      {renderCellValue(row, col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {node.props.paginated && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

function renderCellValue(row: any, col: any): React.ReactNode {
  // Handle template columns (e.g., "{{firstName}} {{lastName}}")
  if (col.template) {
    return col.template.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
      const val = resolveDataPath(row, key);
      return val != null ? String(val) : '';
    }).trim() || '—';
  }

  const value = resolveDataPath(row, col.key);

  // Handle render config as object (e.g., { type: "Badge", props: { colorMap: {...} } })
  if (col.render && typeof col.render === 'object' && col.render.type === 'Badge') {
    const cellValue = col.render.props?.valuePath ? resolveDataPath(row, col.render.props.valuePath) : value;
    const colorMap = col.render.props?.colorMap || {};
    const DEFAULT_BADGE_COLORS: Record<string, string> = {
      active: 'default',
      on_leave: 'secondary',
      terminated: 'destructive',
      resigned: 'outline',
      draft: 'secondary',
      open: 'default',
      closed: 'outline',
      completed: 'default',
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      present: 'default',
      absent: 'destructive',
      half_day: 'secondary',
    };
    const strVal = String(cellValue || '');
    const variant = colorMap[strVal] || DEFAULT_BADGE_COLORS[strVal.toLowerCase()] || 'default';
    return <Badge variant={variant as any}>{strVal.replace(/_/g, ' ')}</Badge>;
  }

  // Handle render config as string 'badge'
  if (col.render === 'badge') {
    const colorMap: Record<string, string> = {
      active: 'default',
      on_leave: 'secondary',
      terminated: 'destructive',
      resigned: 'outline',
      draft: 'secondary',
      open: 'default',
      closed: 'outline',
      completed: 'default',
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      present: 'default',
      absent: 'destructive',
      half_day: 'secondary',
    };
    const variant = colorMap[String(value).toLowerCase()] || 'default';
    return <Badge variant={variant as any}>{String(value).replace(/_/g, ' ')}</Badge>;
  }

  if (col.format === 'date' && value) {
    return new Date(value).toLocaleDateString();
  }

  if (col.format === 'currency' && value != null) {
    return `$${Number(value).toLocaleString()}`;
  }

  if (col.format === 'name' && row) {
    return `${row.firstName || ''} ${row.lastName || ''}`.trim();
  }

  if (col.format === 'salary_range' && row) {
    const min = row.minSalary ? `$${Number(row.minSalary).toLocaleString()}` : '—';
    const max = row.maxSalary ? `$${Number(row.maxSalary).toLocaleString()}` : '—';
    return `${min} - ${max}`;
  }

  return value != null ? String(value) : '—';
}

// --- Form Renderer ---

function FormRenderer({ node, children, onAction }: { node: any; children: React.ReactNode; onAction: (action: any, formValues?: any) => void }) {
  const { data } = useContext(DataContext);
  const [values, setValues] = useState<Record<string, any>>({});
  const [initialized, setInitialized] = useState(false);

  // Pre-populate form from data sources (for edit forms)
  useEffect(() => {
    if (!initialized && data) {
      const newValues: Record<string, any> = {};
      // Try to find the main entity data to pre-populate
      for (const [, val] of Object.entries(data)) {
        if (val && typeof val === 'object' && !Array.isArray(val) && val.data) {
          // This is likely the main entity
          const entity = val.data;
          if (typeof entity === 'object') {
            Object.entries(entity).forEach(([k, v]) => {
              if (v != null) newValues[k] = v;
            });
          }
        }
      }
      if (Object.keys(newValues).length > 0) {
        setValues(newValues);
        setInitialized(true);
      }
    }
  }, [data, initialized]);

  const setValue = useCallback((path: string, value: any) => {
    setValues(prev => ({ ...prev, [path]: value }));
  }, []);

  const getValues = useCallback(() => values, [values]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAction(node.props.action, values);
  };

  return (
    <FormContext.Provider value={{ values, setValue, getValues }}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {children}
        <div className="flex gap-3 pt-4">
          <Button type="submit">Save</Button>
          <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
        </div>
      </form>
    </FormContext.Provider>
  );
}

// --- Page Renderer ---

interface PageConfig {
  dataSources?: Record<string, { url: string }>;
  children: any[];
}

export function PageRenderer({ config }: { config: PageConfig }) {
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const params = useParams();

  const fetchData = useCallback(async () => {
    if (!config.dataSources) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const results: Record<string, any> = {};

    await Promise.all(
      Object.entries(config.dataSources).map(async ([key, source]) => {
        try {
          let url = stripApiPrefix(source.url);
          // Replace route params
          if (params.id) url = url.replace(':id', params.id);
          const res = await api.get<any>(url);
          results[key] = res;
        } catch (err) {
          console.error(`Failed to fetch ${key}:`, err);
          results[key] = null;
        }
      })
    );

    setData(results);
    setLoading(false);
  }, [config.dataSources, params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onAction = useActionHandler(fetchData);

  // Resolve data: flatten success responses, but preserve meta for paginated data
  const resolvedData = useMemo(() => {
    const resolved: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val && val.success && val.data !== undefined) {
        // If there's pagination meta, keep it alongside the data
        if (val.meta) {
          resolved[key] = { data: val.data, meta: val.meta };
        } else {
          resolved[key] = val.data;
        }
      } else if (val && val.data !== undefined) {
        resolved[key] = val.data;
      } else {
        resolved[key] = val;
      }
    }
    return resolved;
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DataContext.Provider value={{ data: resolvedData, loading, refresh: fetchData }}>
      <div className="space-y-6">
        {config.children?.map((node, i) => (
          <RenderComponent key={i} node={node} onAction={onAction} />
        ))}
      </div>
    </DataContext.Provider>
  );
}
