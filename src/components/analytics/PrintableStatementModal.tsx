import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenseStore } from '../../store/useExpenseStore';
import { generateStatementData, triggerPrintStatement } from '../../lib/pdfReportGenerator';
import { formatCurrency } from '../../lib/formatCurrency';
import { format, parseISO, subMonths } from 'date-fns';
import { Printer, X, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { vibrate } from '../../lib/utils';
import { playTapSound } from '../../lib/sound';

interface PrintableStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonth?: Date;
}

export function PrintableStatementModal({
  isOpen,
  onClose,
  initialMonth = new Date(),
}: PrintableStatementModalProps) {
  const { expenses, settings, accounts = [] } = useExpenseStore();
  const [selectedMonth, setSelectedMonth] = useState<Date>(initialMonth);

  // Available months options (last 6 months)
  const monthOptions = useMemo(() => {
    const list: Date[] = [];
    for (let i = 0; i < 6; i++) {
      list.push(subMonths(new Date(), i));
    }
    return list;
  }, []);

  const statement = useMemo(() => {
    return generateStatementData(expenses, settings, accounts, selectedMonth);
  }, [expenses, settings, accounts, selectedMonth]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 print:p-0 print:static print:z-auto">
        {/* Backdrop (hidden in print) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md print:hidden"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border shadow-2xl rounded-3xl flex flex-col z-10 overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:rounded-none print:bg-white print:text-black"
        >
          {/* Top Bar (hidden in print) */}
          <div className="p-4 px-6 border-b border-border/60 flex items-center justify-between shrink-0 bg-secondary/30 backdrop-blur-md print:hidden">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Printable Statement</h3>
                <p className="text-[11px] text-muted-foreground">
                  Branded report for {statement.periodLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Month Selector */}
              <select
                value={format(selectedMonth, 'yyyy-MM')}
                onChange={(e) => {
                  vibrate(8);
                  playTapSound();
                  const [year, month] = e.target.value.split('-').map(Number);
                  setSelectedMonth(new Date(year, month - 1, 1));
                }}
                className="text-xs rounded-xl bg-secondary border border-border/50 p-2 text-foreground focus:outline-none"
              >
                {monthOptions.map((m) => (
                  <option key={format(m, 'yyyy-MM')} value={format(m, 'yyyy-MM')}>
                    {format(m, 'MMMM yyyy')}
                  </option>
                ))}
              </select>

              <Button
                size="sm"
                onClick={() => {
                  vibrate(12);
                  triggerPrintStatement();
                }}
                className="rounded-xl text-xs gap-1.5 font-semibold"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Printable Statement Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 print:p-0 print:overflow-visible print:text-black">
            {/* Document Header */}
            <div className="flex items-start justify-between border-b pb-6 border-border/60 print:border-black/20">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-foreground print:text-black">
                    EXPENSE TRACKER
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 print:border-black/20 print:text-black">
                    Official Statement
                  </span>
                </div>
                <p className="text-xs text-muted-foreground print:text-gray-600 mt-1">
                  Prepared for: <span className="font-semibold text-foreground print:text-black">{statement.userName}</span>
                </p>
                <p className="text-[11px] text-muted-foreground print:text-gray-600">
                  Statement Period: <span className="font-semibold text-foreground print:text-black">{statement.periodLabel}</span>
                </p>
              </div>

              <div className="text-right text-[11px] text-muted-foreground print:text-gray-600">
                <p>Generated on: {format(new Date(), 'PPp')}</p>
                <p>Status: Reconciled & Audited</p>
              </div>
            </div>

            {/* Executive KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 print:border-black/20 print:bg-gray-50">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground print:text-gray-600">
                  Total Inflow
                </p>
                <p className="text-base font-bold text-emerald-600 print:text-emerald-700 mt-1">
                  {formatCurrency(statement.totalIncome, statement.currency)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 print:border-black/20 print:bg-gray-50">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground print:text-gray-600">
                  Total Outflow
                </p>
                <p className="text-base font-bold text-rose-600 print:text-rose-700 mt-1">
                  {formatCurrency(statement.totalExpenses, statement.currency)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 print:border-black/20 print:bg-gray-50">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground print:text-gray-600">
                  Net Savings
                </p>
                <p className="text-base font-bold text-foreground print:text-black mt-1">
                  {formatCurrency(statement.netSavings, statement.currency)}
                </p>
                <span className="text-[10px] text-muted-foreground print:text-gray-600">
                  ({statement.savingsRate.toFixed(1)}% rate)
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 print:border-black/20 print:bg-gray-50">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground print:text-gray-600">
                  Liquid Net Worth
                </p>
                <p className="text-base font-bold text-primary print:text-black mt-1">
                  {formatCurrency(statement.liquidNetWorth, statement.currency)}
                </p>
                <span className="text-[10px] text-muted-foreground print:text-gray-600">
                  Across {accounts.length} accounts
                </span>
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-gray-800 mb-2">
                Category Spending Distribution
              </h4>
              <div className="rounded-2xl border border-border/60 overflow-hidden print:border-black/20">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-secondary/60 text-muted-foreground print:bg-gray-100 print:text-black border-b border-border/60 print:border-black/20">
                    <tr>
                      <th className="p-2.5 px-3 font-semibold">Category</th>
                      <th className="p-2.5 px-3 font-semibold text-center">Transactions</th>
                      <th className="p-2.5 px-3 font-semibold text-right">Amount</th>
                      <th className="p-2.5 px-3 font-semibold text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 print:divide-black/10 text-foreground print:text-black">
                    {statement.categoryBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-muted-foreground">
                          No expenses recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      statement.categoryBreakdown.map((row) => (
                        <tr key={row.category}>
                          <td className="p-2.5 px-3 font-medium">{row.category}</td>
                          <td className="p-2.5 px-3 text-center text-muted-foreground print:text-gray-600">
                            {row.count}
                          </td>
                          <td className="p-2.5 px-3 text-right font-semibold">
                            {formatCurrency(row.amount, statement.currency)}
                          </td>
                          <td className="p-2.5 px-3 text-right text-muted-foreground print:text-gray-600">
                            {row.percentage}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Itemized Transaction Ledger */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-gray-800 mb-2">
                Itemized Transaction Ledger ({statement.transactions.length})
              </h4>
              <div className="rounded-2xl border border-border/60 overflow-hidden print:border-black/20">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-secondary/60 text-muted-foreground print:bg-gray-100 print:text-black border-b border-border/60 print:border-black/20">
                    <tr>
                      <th className="p-2.5 px-3 font-semibold">Date</th>
                      <th className="p-2.5 px-3 font-semibold">Description</th>
                      <th className="p-2.5 px-3 font-semibold">Category</th>
                      <th className="p-2.5 px-3 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 print:divide-black/10 text-foreground print:text-black">
                    {statement.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-muted-foreground">
                          No transactions found for this period.
                        </td>
                      </tr>
                    ) : (
                      statement.transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="p-2.5 px-3 text-muted-foreground print:text-gray-600 whitespace-nowrap">
                            {format(parseISO(tx.date), 'dd MMM yyyy')}
                          </td>
                          <td className="p-2.5 px-3 font-medium">
                            {tx.description}
                            {tx.notes ? (
                              <span className="block text-[10px] text-muted-foreground print:text-gray-500 truncate max-w-[200px]">
                                {tx.notes}
                              </span>
                            ) : null}
                          </td>
                          <td className="p-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-secondary/80 print:bg-gray-200 text-[10px] font-medium">
                              {tx.category}
                            </span>
                          </td>
                          <td
                            className={`p-2.5 px-3 text-right font-semibold whitespace-nowrap ${
                              tx.category === 'Income'
                                ? 'text-emerald-600 print:text-emerald-700'
                                : 'text-foreground print:text-black'
                            }`}
                          >
                            {tx.category === 'Income' ? '+' : '-'}
                            {formatCurrency(tx.amount, statement.currency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-4 text-center text-[10px] text-muted-foreground print:text-gray-500 border-border/40 print:border-black/20">
              <p>Generated by Expense Tracker PWA • Designed for Financial Transparency</p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
