import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseAmount(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/[^-0-9.]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function formatCurrency(amount: number): string {
  if (isNaN(amount)) amount = 0;
  const hasPennies = amount % 1 !== 0; // Check if there are fractions
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: hasPennies ? 2 : 0,
    maximumFractionDigits: hasPennies ? 2 : 0,
  }).format(amount);
}
