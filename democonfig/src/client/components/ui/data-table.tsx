import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search";

export interface DataTableColumn<T = any> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchable = false,
  searchPlaceholder = "Search...",
  onSearch,
  loading = false,
  emptyMessage = "No results found.",
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  // If no external onSearch, filter client-side
  const filteredData = React.useMemo(() => {
    if (onSearch || !searchQuery) {
      return data;
    }

    const lowerQuery = searchQuery.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const value = row[col.key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(lowerQuery);
      })
    );
  }, [data, searchQuery, onSearch, columns]);

  return (
    <div className={cn("space-y-4", className)}>
      {searchable && (
        <SearchInput
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={handleSearch}
          className="max-w-sm"
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-muted-foreground">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <span className="text-muted-foreground">{emptyMessage}</span>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  onClick={() => onRowClick?.(row)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key] != null
                          ? String(row[column.key])
                          : ""}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
DataTable.displayName = "DataTable";

export { DataTable };
