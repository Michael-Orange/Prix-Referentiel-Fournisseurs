import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount)) + ' FCFA';
}

export function formatNumber(amount: number, decimals: number = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function calculateTTC(prixHT: number, tauxTVA: number): number {
  return Math.round(prixHT * (1 + tauxTVA / 100) * 100) / 100;
}

export function calculateHT(prixTTC: number, tauxTVA: number): number {
  if (tauxTVA === 0) return prixTTC;
  return Math.round((prixTTC / (1 + tauxTVA / 100)) * 100) / 100;
}

export function generateReference(lastId: number): string {
  const nextNumber = lastId + 1;
  return `FP-${nextNumber.toString().padStart(3, '0')}`;
}

export function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
