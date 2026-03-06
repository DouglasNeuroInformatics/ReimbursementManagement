import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { StatusBadge } from '../ui/Badge'
import type { Request } from '../../types'
import { fmtDate } from '../../utils/dates'
import { fmtCurrency, getRequestTotal } from '../../utils/currency'

const col = createColumnHelper<Request>()

interface Props {
  data: Request[]
  linkTo: (r: Request) => string
  showUser?: boolean
  showAccount?: boolean
}

export function RequestsTable({ data, linkTo, showUser = false, showAccount = false }: Props) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = [
    ...(showUser ? [col.accessor((r) => `${r.user.firstName} ${r.user.lastName}`, { id: 'user', header: 'User' })] : []),
    col.accessor('title', {
      header: 'Title',
      cell: (info) => (
        <Link
          to={linkTo(info.row.original) as never}
          className="text-blue-600 hover:underline font-medium"
        >
          {info.getValue()}
        </Link>
      ),
    }),
    col.accessor('type', {
      header: 'Type',
      cell: (info) => info.getValue().replace(/_/g, ' '),
    }),
    col.accessor('status', {
      header: 'Status',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    ...(showAccount ? [col.accessor(
      (r) => r.approvals?.find((a) => a.stage === 'SUPERVISOR' && a.action === 'APPROVE')?.account?.accountNumber ?? '—',
      { id: 'account', header: 'Account' },
    )] : []),
    col.accessor((r) => getRequestTotal(r), {
      id: 'amount',
      header: 'Amount',
      cell: (info) => {
        const v = info.getValue()
        return v !== null ? <span className="font-medium">{fmtCurrency(v)}</span> : '—'
      },
    }),
    col.accessor('submittedAt', {
      header: 'Submitted',
      cell: (info) => fmtDate(info.getValue()),
    }),
  ]

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (!data.length) {
    return <div className="text-center py-12 text-gray-500 text-sm">No requests found.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  className="text-left px-4 py-3 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700"
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {h.column.getIsSorted() === 'asc' ? ' ↑' : h.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-50">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
