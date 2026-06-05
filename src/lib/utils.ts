import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getScoreColor(score: number): string {
  if (score <= 25) return '#4ade80';
  if (score <= 50) return '#facc15';
  if (score <= 75) return '#fb923c';
  return '#f87171';
}

export function getScoreLabel(score: number): string {
  if (score <= 25) return 'Low AI Pattern Usage';
  if (score <= 50) return 'Moderate AI Patterns';
  if (score <= 75) return 'High AI Pattern Usage';
  return 'Very High AI Pattern Usage';
}
