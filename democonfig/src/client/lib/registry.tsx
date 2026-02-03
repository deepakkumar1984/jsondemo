import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui/alert';
import { FormField, FormLabel } from '@/components/ui/form';
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Briefcase,
  DollarSign,
  Calendar,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  UserPlus,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Icon map - maps string icon names to Lucide components
// ---------------------------------------------------------------------------
const iconMap: Record<string, LucideIcon> = {
  plus: Plus,
  search: Search,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  minus: Minus,
  users: Users,
  briefcase: Briefcase,
  'dollar-sign': DollarSign,
  calendar: Calendar,
  building: Building2,
  'file-text': FileText,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  download: Download,
  edit: Edit,
  trash: Trash2,
  eye: Eye,
  'alert-circle': AlertCircle,
  'check-circle': CheckCircle,
  clock: Clock,
  'user-plus': UserPlus,
  settings: Settings,
};

function resolveIcon(name?: string): LucideIcon | undefined {
  if (!name) return undefined;
  return iconMap[name];
}

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

/** Provides page-level data fetched from APIs, keyed by their data path. */
export const DataContext = createContext<Record<string, unknown>>({});

/** Provides form state (values + setter) for nested form fields. */
export const FormContext = createContext<{
  values: Record<string, unknown>;
  setValue: (path: string, value: unknown) => void;
}>({
  values: {},
  setValue: () => {},
});

/** Provides the top-level action handler. */
export const ActionContext = createContext<(action: Record<string, unknown>) => void>(
  () => {},
);

// ---------------------------------------------------------------------------
// Data resolution helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a dot-separated path against the data context object.
 * E.g. "employees.list" resolves data["employees"]["list"].
 * A top-level key with dots is tried first for flat lookups.
 */
function resolvePath(data: Record<string, unknown>, path: string): unknown {
  // Try direct key first (flat map)
  if (path in data) return data[path];

  const parts = path.split('.');
  let current: unknown = data;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function useData() {
  return useContext(DataContext);
}

function useFormCtx() {
  return useContext(FormContext);
}

export function useAction() {
  return useContext(ActionContext);
}

// ---------------------------------------------------------------------------
// Value formatting helper
// ---------------------------------------------------------------------------

function formatValue(value: unknown, fmt?: string): string {
  if (value == null) return '';
  if (!fmt) return String(value);

  switch (fmt) {
    case 'date':
      try {
        return formatDate(new Date(value as string | number), 'MMM d, yyyy');
      } catch {
        return String(value);
      }
    case 'datetime':
      try {
        return formatDate(new Date(value as string | number), 'MMM d, yyyy h:mm a');
      } catch {
        return String(value);
      }
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number(value));
    case 'number':
      return new Intl.NumberFormat('en-US').format(Number(value));
    case 'percent':
      return `${Number(value).toFixed(1)}%`;
    default:
      return String(value);
  }
}

// ---------------------------------------------------------------------------
// Common prop types for registry components
// ---------------------------------------------------------------------------

interface RegistryProps {
  element: {
    component: string;
    props: Record<string, unknown>;
    children?: unknown[];
  };
  children?: React.ReactNode;
  onAction: (action: Record<string, unknown>) => void;
}

// ---------------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------------

function PageHeaderComponent({ element, onAction }: RegistryProps) {
  const { title, subtitle, actions } = element.props as {
    title: string;
    subtitle?: string;
    actions?: Array<{
      label: string;
      variant?: string;
      action: Record<string, unknown>;
      icon?: string;
    }>;
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2">
          {actions.map((act, idx) => {
            const Icon = resolveIcon(act.icon);
            return (
              <Button
                key={idx}
                variant={(act.variant as 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link') || 'default'}
                onClick={() => onAction(act.action)}
              >
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                {act.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function CardComponent({ element, children }: RegistryProps) {
  const { title, description, padding } = element.props as {
    title?: string;
    description?: string;
    padding?: boolean;
  };

  const hasPadding = padding !== false;

  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn(!hasPadding && 'p-0')}>
        {children}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCardComponent({ element }: RegistryProps) {
  const data = useData();
  const { label, value, valuePath, change, changeType, icon } = element.props as {
    label: string;
    value: string | number;
    valuePath?: string;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon?: string;
  };

  const resolvedValue = valuePath ? resolvePath(data, valuePath) : value;
  const Icon = resolveIcon(icon);

  const changeColorClass =
    changeType === 'positive'
      ? 'text-green-600'
      : changeType === 'negative'
        ? 'text-red-600'
        : 'text-muted-foreground';

  const ChangeIcon =
    changeType === 'positive'
      ? TrendingUp
      : changeType === 'negative'
        ? TrendingDown
        : null;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold">
            {resolvedValue != null ? String(resolvedValue) : '--'}
          </p>
          {change && (
            <div className={cn('mt-1 flex items-center text-xs', changeColorClass)}>
              {ChangeIcon && <ChangeIcon className="mr-1 h-3 w-3" />}
              <span>{change}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

const ROWS_PER_PAGE = 10;

function DataTableComponent({ element, onAction }: RegistryProps) {
  const data = useData();
  const {
    dataPath,
    columns,
    searchable,
    searchPlaceholder,
    filterable,
    filters,
    paginated,
    rowClickAction,
    emptyMessage,
  } = element.props as {
    dataPath: string;
    columns: Array<{
      key: string;
      header: string;
      format?: string;
      render?: string;
    }>;
    searchable?: boolean;
    searchPlaceholder?: string;
    filterable?: boolean;
    filters?: Array<{
      key: string;
      label: string;
      optionsPath?: string;
      options?: Array<{ label: string; value: string }>;
    }>;
    paginated?: boolean;
    rowClickAction?: Record<string, unknown>;
    emptyMessage?: string;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);

  const rawData = resolvePath(data, dataPath);
  const rows: Record<string, unknown>[] = Array.isArray(rawData) ? rawData : [];

  // Resolve filter options from optionsPath
  const resolvedFilters = useMemo(() => {
    if (!filters) return [];
    return filters.map((f) => {
      if (f.optionsPath) {
        const opts = resolvePath(data, f.optionsPath);
        return {
          ...f,
          options: Array.isArray(opts) ? (opts as Array<{ label: string; value: string }>) : f.options || [],
        };
      }
      return { ...f, options: f.options || [] };
    });
  }, [filters, data]);

  // Apply search
  const searched = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [rows, searchQuery, searchable, columns]);

  // Apply filters
  const filtered = useMemo(() => {
    if (!filterable) return searched;
    return searched.filter((row) =>
      Object.entries(activeFilters).every(([key, filterVal]) => {
        if (!filterVal || filterVal === '__all__') return true;
        return String(row[key]) === filterVal;
      }),
    );
  }, [searched, activeFilters, filterable]);

  // Pagination
  const totalPages = paginated ? Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE)) : 1;
  const displayed = paginated
    ? filtered.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE)
    : filtered;

  const handleRowClick = useCallback(
    (row: Record<string, unknown>) => {
      if (!rowClickAction) return;
      // Interpolate row values into action - replace {{field}} patterns
      const interpolated = JSON.parse(
        JSON.stringify(rowClickAction).replace(
          /\{\{(\w+)\}\}/g,
          (_, key) => String(row[key] ?? ''),
        ),
      );
      onAction(interpolated);
    },
    [rowClickAction, onAction],
  );

  // Render cell value with format/render support
  const renderCell = (row: Record<string, unknown>, col: { key: string; format?: string; render?: string }) => {
    const value = row[col.key];

    if (col.render === 'badge') {
      return <Badge variant="secondary">{String(value ?? '')}</Badge>;
    }

    return formatValue(value, col.format);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters Bar */}
      {(searchable || (filterable && resolvedFilters.length > 0)) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={searchPlaceholder || 'Search...'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
              />
            </div>
          )}
          {filterable &&
            resolvedFilters.map((filter) => (
              <Select
                key={filter.key}
                value={activeFilters[filter.key] || '__all__'}
                onValueChange={(val) => {
                  setActiveFilters((prev) => ({ ...prev, [filter.key]: val }));
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All {filter.label}</SelectItem>
                  {filter.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {emptyMessage || 'No data found.'}
                </TableCell>
              </TableRow>
            ) : (
              displayed.map((row, rowIdx) => (
                <TableRow
                  key={rowIdx}
                  className={cn(rowClickAction && 'cursor-pointer')}
                  onClick={() => rowClickAction && handleRowClick(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key}>{renderCell(row, col)}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * ROWS_PER_PAGE + 1}-
            {Math.min((page + 1) * ROWS_PER_PAGE, filtered.length)} of{' '}
            {filtered.length} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function FormComponent({ element, children, onAction }: RegistryProps) {
  const { action, layout } = element.props as {
    action: Record<string, unknown>;
    layout?: string;
  };

  const [values, setValues] = useState<Record<string, unknown>>({});

  const setValue = useCallback((path: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [path]: value }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      // Merge form values into the action's body
      const finalAction = {
        ...action,
        body: { ...(action.body as Record<string, unknown> | undefined), ...values },
      };
      onAction(finalAction);
    },
    [action, values, onAction],
  );

  const layoutClass = layout === 'horizontal' ? 'flex flex-wrap gap-4 items-end' : 'space-y-4';

  return (
    <FormContext.Provider value={{ values, setValue }}>
      <form onSubmit={handleSubmit} className={layoutClass}>
        {children}
      </form>
    </FormContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// TextField
// ---------------------------------------------------------------------------

function TextFieldComponent({ element }: RegistryProps) {
  const { values, setValue } = useFormCtx();
  const { label, bindPath, placeholder, required, type, disabled } = element.props as {
    label: string;
    bindPath: string;
    placeholder?: string;
    required?: boolean;
    type?: string;
    disabled?: boolean;
  };

  return (
    <FormField>
      <FormLabel>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </FormLabel>
      <Input
        type={type || 'text'}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        value={(values[bindPath] as string) ?? ''}
        onChange={(e) => setValue(bindPath, e.target.value)}
      />
    </FormField>
  );
}

// ---------------------------------------------------------------------------
// TextArea
// ---------------------------------------------------------------------------

function TextAreaComponent({ element }: RegistryProps) {
  const { values, setValue } = useFormCtx();
  const { label, bindPath, placeholder, rows, required } = element.props as {
    label: string;
    bindPath: string;
    placeholder?: string;
    rows?: number;
    required?: boolean;
  };

  return (
    <FormField>
      <FormLabel>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </FormLabel>
      <Textarea
        placeholder={placeholder}
        rows={rows || 3}
        required={required}
        value={(values[bindPath] as string) ?? ''}
        onChange={(e) => setValue(bindPath, e.target.value)}
      />
    </FormField>
  );
}

// ---------------------------------------------------------------------------
// SelectField
// ---------------------------------------------------------------------------

function SelectFieldComponent({ element }: RegistryProps) {
  const { values, setValue } = useFormCtx();
  const data = useData();
  const { label, bindPath, placeholder, required, options, optionsPath } = element.props as {
    label: string;
    bindPath: string;
    placeholder?: string;
    required?: boolean;
    options?: Array<{ label: string; value: string }>;
    optionsPath?: string;
  };

  const resolvedOptions = useMemo(() => {
    if (optionsPath) {
      const fetched = resolvePath(data, optionsPath);
      if (Array.isArray(fetched)) return fetched as Array<{ label: string; value: string }>;
    }
    return options || [];
  }, [options, optionsPath, data]);

  return (
    <FormField>
      <FormLabel>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </FormLabel>
      <Select
        value={(values[bindPath] as string) ?? ''}
        onValueChange={(val) => setValue(bindPath, val)}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}...`} />
        </SelectTrigger>
        <SelectContent>
          {resolvedOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

// ---------------------------------------------------------------------------
// DateField
// ---------------------------------------------------------------------------

function DateFieldComponent({ element }: RegistryProps) {
  const { values, setValue } = useFormCtx();
  const { label, bindPath, placeholder, required } = element.props as {
    label: string;
    bindPath: string;
    placeholder?: string;
    required?: boolean;
  };

  return (
    <FormField>
      <FormLabel>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </FormLabel>
      <Input
        type="date"
        placeholder={placeholder}
        required={required}
        value={(values[bindPath] as string) ?? ''}
        onChange={(e) => setValue(bindPath, e.target.value)}
      />
    </FormField>
  );
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

function GridComponent({ element, children }: RegistryProps) {
  const { columns, gap } = element.props as {
    columns?: number | string;
    gap?: string;
  };

  const colsClass =
    typeof columns === 'number'
      ? `grid-cols-${columns}`
      : columns || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

  return (
    <div
      className={cn('grid', colsClass)}
      style={{ gap: gap || '1rem' }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stack
// ---------------------------------------------------------------------------

function StackComponent({ element, children }: RegistryProps) {
  const { direction, gap, align, justify } = element.props as {
    direction?: 'horizontal' | 'vertical';
    gap?: string;
    align?: string;
    justify?: string;
  };

  const isHorizontal = direction === 'horizontal';

  const alignMap: Record<string, string> = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyMap: Record<string, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  };

  return (
    <div
      className={cn(
        'flex',
        isHorizontal ? 'flex-row' : 'flex-col',
        align ? alignMap[align] : undefined,
        justify ? justifyMap[justify] : undefined,
      )}
      style={{ gap: gap || '1rem' }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

function ButtonComponent({ element, onAction }: RegistryProps) {
  const { label, variant, action, icon, disabled } = element.props as {
    label: string;
    variant?: string;
    action: Record<string, unknown>;
    icon?: string;
    disabled?: boolean;
  };

  const Icon = resolveIcon(icon);

  return (
    <Button
      variant={(variant as 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link') || 'default'}
      disabled={disabled}
      onClick={() => onAction(action)}
      type={action?.type === 'submit_form' ? 'submit' : 'button'}
    >
      {Icon && <Icon className="mr-2 h-4 w-4" />}
      {label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

function BadgeComponent({ element }: RegistryProps) {
  const data = useData();
  const { label, valuePath, variant, colorMap } = element.props as {
    label?: string;
    valuePath?: string;
    variant?: string;
    colorMap?: Record<string, string>;
  };

  const resolvedLabel = valuePath ? String(resolvePath(data, valuePath) ?? '') : label || '';

  // Map value to a badge variant via colorMap
  let resolvedVariant = variant || 'default';
  if (colorMap && resolvedLabel) {
    const mapped = colorMap[resolvedLabel];
    if (mapped) resolvedVariant = mapped;
  }

  return (
    <Badge
      variant={resolvedVariant as 'default' | 'secondary' | 'destructive' | 'outline'}
    >
      {resolvedLabel}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------

function AlertComponent({ element }: RegistryProps) {
  const { title, message, variant } = element.props as {
    title?: string;
    message: string;
    variant?: 'default' | 'destructive';
  };

  return (
    <Alert variant={variant || 'default'}>
      {variant === 'destructive' && <AlertCircle className="h-4 w-4" />}
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function TabsComponent({ element, children }: RegistryProps) {
  const { defaultValue, tabs } = element.props as {
    defaultValue?: string;
    tabs: Array<{ label: string; value: string }>;
  };

  return (
    <Tabs defaultValue={defaultValue || tabs[0]?.value}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// TabPanel
// ---------------------------------------------------------------------------

function TabPanelComponent({ element, children }: RegistryProps) {
  const { value } = element.props as { value: string };

  return <TabsContent value={value}>{children}</TabsContent>;
}

// ---------------------------------------------------------------------------
// Heading
// ---------------------------------------------------------------------------

function HeadingComponent({ element }: RegistryProps) {
  const data = useData();
  const { text, textPath, level } = element.props as {
    text?: string;
    textPath?: string;
    level?: number;
  };

  const resolvedText = textPath ? String(resolvePath(data, textPath) ?? '') : text || '';

  const sizeClass =
    level === 1
      ? 'text-3xl font-bold'
      : level === 3
        ? 'text-lg font-semibold'
        : level === 4
          ? 'text-base font-semibold'
          : 'text-xl font-semibold';

  const className = cn(sizeClass, 'tracking-tight');

  switch (level) {
    case 1:
      return <h1 className={className}>{resolvedText}</h1>;
    case 3:
      return <h3 className={className}>{resolvedText}</h3>;
    case 4:
      return <h4 className={className}>{resolvedText}</h4>;
    case 5:
      return <h5 className={className}>{resolvedText}</h5>;
    case 6:
      return <h6 className={className}>{resolvedText}</h6>;
    default:
      return <h2 className={className}>{resolvedText}</h2>;
  }
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

function TextComponent({ element }: RegistryProps) {
  const data = useData();
  const { content, contentPath, variant } = element.props as {
    content?: string;
    contentPath?: string;
    variant?: 'default' | 'muted' | 'small';
  };

  const resolvedContent = contentPath
    ? String(resolvePath(data, contentPath) ?? '')
    : content || '';

  const variantClass =
    variant === 'muted'
      ? 'text-muted-foreground'
      : variant === 'small'
        ? 'text-sm text-muted-foreground'
        : '';

  return <p className={variantClass}>{resolvedContent}</p>;
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

function DividerComponent() {
  return <hr className="my-4 border-t border-border" />;
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

function AvatarComponent({ element }: RegistryProps) {
  const data = useData();
  const { src, srcPath, name, namePath, size } = element.props as {
    src?: string;
    srcPath?: string;
    name?: string;
    namePath?: string;
    size?: 'sm' | 'md' | 'lg';
  };

  const resolvedSrc = srcPath ? (resolvePath(data, srcPath) as string) : src;
  const resolvedName = namePath ? String(resolvePath(data, namePath) ?? '') : name || '';

  const initials = resolvedName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClass =
    size === 'sm'
      ? 'h-8 w-8'
      : size === 'lg'
        ? 'h-16 w-16'
        : 'h-10 w-10';

  return (
    <Avatar className={sizeClass}>
      {resolvedSrc && <AvatarImage src={resolvedSrc} alt={resolvedName} />}
      <AvatarFallback className={size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-xs' : 'text-sm'}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

// ---------------------------------------------------------------------------
// DetailRow
// ---------------------------------------------------------------------------

function DetailRowComponent({ element }: RegistryProps) {
  const data = useData();
  const { label, valuePath, value, format } = element.props as {
    label: string;
    valuePath?: string;
    value?: string;
    format?: string;
  };

  const resolvedValue = valuePath ? resolvePath(data, valuePath) : value;
  const displayValue = formatValue(resolvedValue, format);

  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{displayValue || '--'}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailSection
// ---------------------------------------------------------------------------

function DetailSectionComponent({ element, children }: RegistryProps) {
  const { title } = element.props as { title: string };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <dl className="divide-y divide-border">{children}</dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registry export
// ---------------------------------------------------------------------------

const registry: Record<string, React.ComponentType<RegistryProps>> = {
  PageHeader: PageHeaderComponent,
  Card: CardComponent,
  StatCard: StatCardComponent,
  DataTable: DataTableComponent,
  Form: FormComponent,
  TextField: TextFieldComponent,
  TextArea: TextAreaComponent,
  SelectField: SelectFieldComponent,
  DateField: DateFieldComponent,
  Grid: GridComponent,
  Stack: StackComponent,
  Button: ButtonComponent,
  Badge: BadgeComponent,
  Alert: AlertComponent,
  Tabs: TabsComponent,
  TabPanel: TabPanelComponent,
  Heading: HeadingComponent,
  Text: TextComponent,
  Divider: DividerComponent,
  Avatar: AvatarComponent,
  DetailRow: DetailRowComponent,
  DetailSection: DetailSectionComponent,
};

export default registry;
