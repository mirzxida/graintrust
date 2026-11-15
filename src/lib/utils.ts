import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKzt(amount: number): string {
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount)} KZT`;
}

export function formatCompactKzt(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)}B KZT`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M KZT`;
  }
  return formatKzt(amount);
}

export function formatTons(tons: number): string {
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(tons)} t`;
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
}

export function isDeadlineExpired(deadlineIso: string, referenceDateIso = '2026-11-12'): boolean {
  return deadlineIso < referenceDateIso;
}
