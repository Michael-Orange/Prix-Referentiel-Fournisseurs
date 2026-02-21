import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { LoadingState } from "./loading-state";
import { EmptyState } from "./empty-state";
import { LucideIcon } from "lucide-react";

interface Column<T> {
  key: string;
  header: React.ReactNode;
  className?: string;
  render: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  className?: string;
  onRowClick?: (item: T, e: React.MouseEvent) => void;
  rowClassName?: (item: T) => string;
  rowDataAttributes?: (item: T) => Record<string, string | undefined>;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyIcon,
  emptyTitle = "Aucune donnée",
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  className,
  onRowClick,
  rowClassName,
  rowDataAttributes,
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50">
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow 
              key={index}
              className={cn(
                onRowClick && "cursor-pointer hover:bg-muted/50",
                rowClassName?.(item)
              )}
              onClick={(e) => onRowClick?.(item, e)}
              {...(rowDataAttributes?.(item) || {})}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.render(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
