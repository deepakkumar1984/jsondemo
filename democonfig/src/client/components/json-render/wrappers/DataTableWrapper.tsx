import React, { useState } from 'react';
import type { ComponentRenderProps } from '@json-render/react';
import { useData, useActions } from '@json-render/react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { SearchInput } from '../../ui/search';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../../ui/select';
import { Pagination } from '../../ui/pagination';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { resolveDataPath } from '../utils/resolveDataPath';

export function DataTableWrapper({ element, loading }: ComponentRenderProps) {
  const { data } = useData();
  const { execute } = useActions();
  const params = useParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const pageSize = 10;

  const {
    dataPath,
    columns,
    searchable,
    searchPlaceholder,
    filters: filterConfigs,
    paginated,
    rowClickAction,
    rowActions,
    emptyMessage
  } = element.props as {
    dataPath: string;
    columns?: any[];
    searchable?: boolean;
    searchPlaceholder?: string;
    filters?: any[];
    paginated?: boolean;
    rowClickAction?: { to?: string };
    rowActions?: any[];
    emptyMessage?: string;
  };

  const rawData = resolveDataPath(data, dataPath);
  const isLoading = loading && !rawData;
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
  const needsClientPagination = paginated && !isServerPaginated;
  const paginatedItems = needsClientPagination
    ? items.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : items;

  const handleRowClick = (row: any) => {
    if (rowClickAction) {
      let to = rowClickAction.to || '';
      to = to.replace(':id', row.id);
      to = to.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
        const val = row[key];
        return val != null ? String(val) : '';
      });
      if (params.id) to = to.replace(':parentId', params.id);
      navigate(to);
    }
  };

  const renderCellValue = (row: any, col: any): React.ReactNode => {
    // Handle template columns
    if (col.template) {
      return col.template.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
        const val = resolveDataPath(row, key);
        return val != null ? String(val) : '';
      }).trim() || '—';
    }

    const value = resolveDataPath(row, col.key);

    // Handle render config as object
    if (col.render && typeof col.render === 'object' && col.render.type === 'Badge') {
      const pathToUse = col.render.props?.valuePath || col.render.props?.labelPath;
      const cellValue = pathToUse ? resolveDataPath(row, pathToUse) : value;
      const colorMap = col.render.props?.colorMap || {};
      const strVal = String(cellValue || '');
      const variant = colorMap[strVal] || col.render.props?.variant || 'default';
      return <Badge variant={variant as any}>{strVal.replace(/_/g, ' ')}</Badge>;
    }

    // Handle render config as string 'badge'
    if (col.render === 'badge') {
      const colorMap: Record<string, string> = {
        active: 'default',
        on_leave: 'secondary',
        terminated: 'destructive',
        resigned: 'outline',
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

    return value != null ? String(value) : '—';
  };

  return (
    <div className="space-y-4">
      {(searchable || filterConfigs) && (
        <div className="flex items-center gap-4">
          {searchable && (
            <SearchInput
              placeholder={searchPlaceholder || 'Search...'}
              value={search}
              onChange={setSearch}
              className="max-w-sm"
            />
          )}
          {filterConfigs?.map((filter: any) => {
            let options = filter.options || [];
            if (filter.optionsPath) {
              const resolved = resolveDataPath(data, filter.optionsPath);
              if (Array.isArray(resolved)) {
                options = resolved.map((item: any) => {
                  if (item.label && item.value) return item;
                  if (item.id && item.name) return { label: item.name, value: item.id };
                  return { label: String(item), value: String(item) };
                }).filter((o: any) => String(o.value) !== '');
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
              {columns?.map((col: any) => (
                <TableHead key={col.key} className={col.className}>{col.header}</TableHead>
              ))}
              {rowActions && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns?.map((_: any, j: number) => (
                    <TableCell key={`skeleton-${i}-${j}`}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns?.length || 1} className="text-center py-8 text-muted-foreground">
                  {emptyMessage || 'No data found'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((row: any, i: number) => (
                <TableRow
                  key={row.id || i}
                  className={rowClickAction ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={() => handleRowClick(row)}
                >
                  {columns?.map((col: any) => (
                    <TableCell key={col.key}>
                      {renderCellValue(row, col)}
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {rowActions.map((action: any, idx: number) => (
                            <DropdownMenuItem
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                const resolvedAction = JSON.parse(JSON.stringify(action.action));
                                if (resolvedAction.url) {
                                  resolvedAction.url = resolvedAction.url.replace(':id', row.id);
                                }
                                if (resolvedAction.to) {
                                  resolvedAction.to = resolvedAction.to.replace(':id', row.id);
                                }
                                execute({ name: resolvedAction.type, params: resolvedAction });
                              }}
                            >
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {paginated && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
