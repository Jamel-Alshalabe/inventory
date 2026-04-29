"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, Search, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Loader } from "@/components/shared/loader"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  className?: string
  emptyMessage?: string
  isLoading?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey = "",
  searchPlaceholder = "بحث...",
  className,
  emptyMessage = "لا توجد بيانات",
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className={cn("space-y-6 p-4", className)}>
      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-8">
        <div className="flex items-center space-x-2 space-x-reverse w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="pl-10 pr-10 w-full sm:w-64"
            />
          </div>
        </div>
        
        {/* Column Visibility Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto text-sm">
              <span className="hidden sm:inline">الأعمدة</span>
              <span className="sm:hidden">أعمدة</span>
              <ChevronDown className="mr-1 sm:mr-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>إظهار/إخفاء الأعمدة</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border bg-card overflow-x-auto sidebar-scrollbar">
        <Table className="min-w-[750px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const metaClassName = (header.column.columnDef.meta as any)?.className || "";
                  return (
                    <TableHead key={header.id} className={`text-right bg-[#111127] font-bold text-gray-400 border-b border-gray-800 ${metaClassName}`}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <Loader />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-white/[0.02] border-b border-gray-800/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => {
                    const metaClassName = (cell.column.columnDef.meta as any)?.className || "";
                    return (
                      <TableCell key={cell.id} className={`text-right bg-[#111127] py-4 text-gray-300 ${metaClassName}`}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4">
        <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
          {table.getFilteredSelectedRowModel().rows.length} من{" "}
          {table.getFilteredRowModel().rows.length} صف
          <span className="hidden sm:inline"> مختار</span>
        </div>
        <div className="flex items-center gap-2 order-1 sm:order-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="text-sm"
          >
            السابق
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="text-sm"
          >
            التالي
          </Button>
        </div>
      </div>
    </div>
  )
}
