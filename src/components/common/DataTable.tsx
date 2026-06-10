import { ArrowDownUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data?: T[];
  getRowKey: (row: T) => string;
  empty?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({ columns, data = [], getRowKey, empty, className }: DataTableProps<T>) {
  return (
    <div className={cn('overflow-hidden rounded-lg border bg-card', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted/60 text-xs uppercase tracking-normal text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cn('px-4 py-3 font-semibold', column.className)}>
                  <span className="inline-flex items-center gap-1">
                    {column.header}
                    <ArrowDownUp className="h-3 w-3 opacity-40" />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length ? (
              data.map((row) => (
                <tr key={getRowKey(row)} className="border-b last:border-b-0 hover:bg-muted/35">
                  {columns.map((column) => (
                    <td key={column.key} className={cn('px-4 py-3 align-top', column.className)}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-10 text-center" colSpan={columns.length}>
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
