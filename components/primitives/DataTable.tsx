'use client';
import React, { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  activeRowFn?: (row: T) => boolean;
}

export function DataTable<T>({ columns, rows, onRowClick, activeRowFn }: DataTableProps<T>) {
  return (
    <div className="w-full bg-pane">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th 
                key={col.key} 
                style={{ padding: "7px 14px" }}
                className={`sticky top-0 bg-pane text-[10px] font-normal tracking-[0.06em] text-fg3 uppercase border-b border-line whitespace-nowrap z-10 ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isActive = activeRowFn ? activeRowFn(row) : false;
            return (
              <tr 
                key={i} 
                onClick={() => onRowClick && onRowClick(row)}
                className={`border-b border-line cursor-pointer bg-pane hover:bg-pane2 transition-colors ${
                  isActive ? 'bg-memebg hover:bg-memebg' : ''
                }`}
              >
                {columns.map((col) => (
                  <td 
                    key={col.key} 
                    style={{ padding: "8px 14px" }}
                    className={`text-[12px] whitespace-nowrap ${
                      col.align === 'right' ? 'text-right font-mono' : ''
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
