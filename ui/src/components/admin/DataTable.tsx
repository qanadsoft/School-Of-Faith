import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { adminShell } from '@/lib/admin-tokens';
import { cn } from '@/lib/utils';
import { AdminEmptyState, AdminLoadingState } from './AdminStates';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => ReactNode;
}

export function SearchFilterBar({
  value,
  onChange,
  placeholder = 'Search...',
  filters,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  filters?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-sm"
      />
      {filters}
    </div>
  );
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  emptyLabel,
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  onRowClick,
  pageSize = 10,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyLabel: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;
    return [...data].sort((a, b) => {
      const av = String(col.render(a) ?? '');
      const bv = String(col.render(b) ?? '');
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [columns, data, sortDir, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (loading) return <AdminLoadingState label={emptyLabel} />;
  if (data.length === 0) return <AdminEmptyState label={emptyLabel} />;

  return (
    <div>
      {onSearchChange && (
        <SearchFilterBar
          value={search ?? ''}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          filters={filters}
        />
      )}
      <div className="w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] sm:min-w-full border-collapse text-sm">
            <thead className={cn('text-left border-b border-border/70', adminShell.tableHeader)}>
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={col.key}
                    className={cn(
                      'py-3 px-3 sm:py-3.5 sm:px-4 font-semibold text-xs tracking-wider text-muted-foreground select-none',
                      idx === 0 && 'pl-4 sm:pl-6',
                      idx === columns.length - 1 && 'pr-4 sm:pr-6',
                      col.className
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 hover:text-foreground font-semibold transition-colors min-h-[36px]"
                        onClick={() => toggleSort(col.key)}
                      >
                        {col.header}
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-[#C69A50]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#C69A50]" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-35" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {pageData.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'transition-colors',
                    adminShell.rowHover,
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col, idx) => (
                    <td
                      key={col.key}
                      className={cn(
                        'py-3 px-3 sm:py-3.5 sm:px-4 text-foreground/90 font-light',
                        idx === 0 && 'pl-4 sm:pl-6',
                        idx === columns.length - 1 && 'pr-4 sm:pr-6',
                        col.className
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages} ({data.length} items)
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)} className="min-h-[36px] px-3">
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)} className="min-h-[36px] px-3">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
