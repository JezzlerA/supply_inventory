/**
 * Print Utilities Module
 * Provides reusable functions for print filtering and state management
 */

import { PrintFilterState } from "@/components/PrintFilterModal";

/**
 * Parse a date string in various formats to YYYY-MM-DD
 */
export const parseDate = (dateInput: string | Date): string => {
  if (!dateInput) return "";
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  
  return date.toISOString().split("T")[0];
};

/**
 * Format a date for display
 */
export const formatDateDisplay = (dateInput: string | Date): string => {
  if (!dateInput) return "";
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Check if a date falls within the specified range
 */
export const isDateInRange = (
  dateStr: string,
  startDate: string,
  endDate: string
): boolean => {
  if (!dateStr || !startDate || !endDate) return true; // Show all if no dates specified
  
  const date = parseDate(dateStr);
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  return date >= start && date <= end;
};

/**
 * Filter items by date range
 * @param items Array of items to filter
 * @param filterState The filter configuration
 * @param dateField The field name containing the date in each item
 * @returns Filtered array of items
 */
export const filterItemsByDate = <T extends Record<string, any>>(
  items: T[],
  filterState: PrintFilterState,
  dateField: string = "date"
): T[] => {
  if (!filterState.startDate || !filterState.endDate) {
    return items;
  }
  
  return items.filter((item) => {
    const itemDate = item[dateField];
    return isDateInRange(itemDate, filterState.startDate, filterState.endDate);
  });
};

/**
 * State management for print filtering
 * Stores original visibility state and restores after printing
 */
export class PrintStateManager {
  private originalStates: Map<string, string> = new Map();
  private selector: string;

  constructor(selector: string = ".report-row") {
    this.selector = selector;
  }

  /**
   * Store the current visibility state of all rows
   */
  storeOriginalState(): void {
    this.originalStates.clear();
    const rows = document.querySelectorAll(this.selector);
    rows.forEach((row, index) => {
      const key = `row-${index}`;
      this.originalStates.set(key, row.getAttribute("style") || "");
      // Also store data attributes if present
      const dataDate = row.getAttribute("data-date");
      if (dataDate) {
        this.originalStates.set(`${key}-data-date`, dataDate);
      }
    });
  }

  /**
   * Hide rows that don't match the date filter
   */
  applyFilter(startDate: string, endDate: string, dateAttribute: string = "data-date"): void {
    const rows = document.querySelectorAll(this.selector);
    rows.forEach((row) => {
      const rowDate = row.getAttribute(dateAttribute);
      if (!rowDate) {
        // If no date attribute, show the row
        (row as HTMLElement).style.display = "";
        return;
      }
      
      if (isDateInRange(rowDate, startDate, endDate)) {
        (row as HTMLElement).style.display = "";
      } else {
        (row as HTMLElement).style.display = "none";
      }
    });
  }

  /**
   * Restore original visibility state
   */
  restoreOriginalState(): void {
    const rows = document.querySelectorAll(this.selector);
    rows.forEach((row, index) => {
      const key = `row-${index}`;
      const originalStyle = this.originalStates.get(key);
      if (originalStyle !== undefined) {
        row.setAttribute("style", originalStyle);
      } else {
        (row as HTMLElement).style.display = "";
      }
    });
    this.originalStates.clear();
  }

  /**
   * Execute print with automatic state management
   */
  async printWithFilter(
    startDate: string,
    endDate: string,
    dateAttribute: string = "data-date"
  ): Promise<void> {
    try {
      // Store original state
      this.storeOriginalState();
      
      // Apply filter
      this.applyFilter(startDate, endDate, dateAttribute);
      
      // Trigger print
      window.print();
    } finally {
      // Restore original state after printing
      // Use setTimeout to ensure print dialog has time to open/close
      setTimeout(() => {
        this.restoreOriginalState();
      }, 100);
    }
  }
}

/**
 * Create a date string in YYYY-MM-DD format from a Date object or string
 */
export const toISODateString = (dateInput: string | Date): string => {
  if (!dateInput) return "";
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  
  return date.toISOString().split("T")[0];
};

/**
 * Get the current week range
 */
export const getCurrentWeekRange = (): { start: Date; end: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay();
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  return { start: startOfWeek, end: endOfWeek };
};

/**
 * Get the current month range
 */
export const getCurrentMonthRange = (): { start: Date; end: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  return { start: startOfMonth, end: endOfMonth };
};

/**
 * Add data-date attribute to table rows
 * This function adds the necessary data attribute to rows for filtering
 */
export const addDateAttributesToRows = (
  containerSelector: string,
  dateField: string,
  items: any[]
): void => {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  
  const rows = container.querySelectorAll("tr");
  rows.forEach((row, index) => {
    if (items[index]) {
      const dateValue = items[index][dateField];
      if (dateValue) {
        row.setAttribute("data-date", parseDate(dateValue));
      }
    }
  });
};

// Default export for convenience
export default {
  parseDate,
  formatDateDisplay,
  isDateInRange,
  filterItemsByDate,
  PrintStateManager,
  toISODateString,
  getCurrentWeekRange,
  getCurrentMonthRange,
  addDateAttributesToRows,
};
