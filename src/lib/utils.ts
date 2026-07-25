import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format as formatDateFns } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTime(date: string | Date): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return formatDateFns(d, "h:mm a");
  } catch {
    return "";
  }
}

export function formatDate(date: string | Date): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return formatDateFns(d, "EEE, MMM d");
  } catch {
    return "";
  }
}
