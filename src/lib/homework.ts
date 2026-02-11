/**
 * Homework data validation and loading utilities
 * Shared between Astro server and Vue client components
 */

export type HwItem = {
  id: string | number;
  subject: string;
  homework_name: string;
  issue_date: string;
  due_date: string;
  class_group?: string;
  remarks?: string;
};

type HwData = {
  items?: unknown;
};

/**
 * Type guard for homework array validation
 * Checks that all required fields are present and valid
 */
export function isHwArray(v: unknown): v is HwItem[] {
  return (
    Array.isArray(v) &&
    v.every((it) => {
      if (it == null || typeof it !== "object") return false;
      const obj = it as Record<string, unknown>;
      return (
        typeof obj.id !== "undefined" &&
        typeof obj.subject === "string" &&
        typeof obj.homework_name === "string" &&
        typeof obj.issue_date === "string" &&
        typeof obj.due_date === "string"
      );
    })
  );
}

/**
 * Deep validation for homework data structure
 * Handles both direct array and {items: []} object formats
 */
export function parseHomeworkData(data: unknown): HwItem[] | null {
  if (Array.isArray(data) && isHwArray(data)) {
    return data;
  }

  if (data !== null && typeof data === "object") {
    const obj = data as HwData;
    if (obj.items && isHwArray(obj.items)) {
      return obj.items;
    }
  }

  return null;
}

/**
 * Load homework data from a JSON file
 * Used server-side in Astro and as fallback in Vue
 */
export async function loadHomeworkData(
  filePath: string,
): Promise<HwItem[] | null> {
  try {
    const response = await fetch(filePath, { cache: "no-store" });
    if (!response.ok) {
      console.warn(`Failed to load ${filePath}: HTTP ${response.status}`);
      return null;
    }

    const json = (await response.json()) as unknown;
    return parseHomeworkData(json);
  } catch (error) {
    console.warn(`Failed to load ${filePath}:`, error);
    return null;
  }
}

/**
 * Try loading from multiple fallback paths
 * Returns first successful load
 */
export async function loadHomeworkDataWithFallback(
  paths: string[],
): Promise<HwItem[] | null> {
  for (const path of paths) {
    const data = await loadHomeworkData(path);
    if (data) return data;
  }
  return null;
}

/**
 * Extract unique subjects from homework items
 * Used for filter dropdown
 */
export function extractSubjects(items: HwItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.subject))).sort();
}

/**
 * Get status information for a due date
 * Determines if homework is overdue, due today, or in future
 */
export function getHomeworkStatus(dueDateStr: string) {
  const due = new Date(dueDateStr);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const isOverdue = due < today;
  const isToday = due.toDateString() === today.toDateString();

  if (isOverdue) {
    return { cls: "overdue", text: "已過期", icon: "exclamation-circle" };
  }
  if (isToday) {
    return { cls: "today", text: "今天到期", icon: "clock" };
  }
  return { cls: "normal", text: "進行中", icon: "arrow-right" };
}

/**
 * Count homework issued on a specific date
 */
export function countIssuedBy(items: HwItem[], dateYmd: string): number {
  return items.filter((i) => i.issue_date === dateYmd).length;
}

/**
 * Count homework due on a specific date
 */
export function countDueBy(items: HwItem[], dateYmd: string): number {
  return items.filter((i) => i.due_date === dateYmd).length;
}

/**
 * Filter homework items by multiple criteria
 */
export function filterHomework(
  items: HwItem[],
  options: {
    issueDate?: string;
    subject?: string;
    dueStatus?: "overdue" | "today" | "future";
  },
): HwItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return items.filter((it) => {
    // Filter by issue date
    if (options.issueDate && it.issue_date !== options.issueDate) return false;

    // Filter by subject
    if (options.subject && it.subject !== options.subject) return false;

    // Filter by due date status
    if (options.dueStatus) {
      const due = new Date(it.due_date);
      due.setHours(0, 0, 0, 0);

      if (options.dueStatus === "overdue" && due >= today) return false;
      if (
        options.dueStatus === "today" &&
        due.toDateString() !== today.toDateString()
      )
        return false;
      if (options.dueStatus === "future" && due <= today) return false;
    }

    return true;
  });
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
