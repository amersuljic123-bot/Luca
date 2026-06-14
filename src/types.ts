export interface SavingsBucketConfig {
  id: string;
  name: string;
  target?: number;
  targetDate?: string; // ISO date string for when the goal should be reached
  color?: string;
}

export interface SmartReminder {
  id: string;
  title: string;
  message: string;
  timeOfDay: string; // HH:mm
  daysOfWeek?: number[]; // 0 for Sunday
  isActive: boolean;
}

export interface BudgetConfig {
  id: string;
  targetId: string; // Component, category name, or merchant name
  targetType: "category" | "merchant" | "tag";
  amount: number;
  cycle: "daily" | "weekly" | "monthly";
  alertThresholdPercent?: number; // e.g. 80 for 80%
  isActive: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  billingDay: number;
  savingsBuckets?: string[];
  savingsBucketsConfig?: SavingsBucketConfig[];
  categoryIcons?: Record<string, string>;
  categoryColors?: Record<string, string>;
  reminders?: SmartReminder[];
  budgets?: BudgetConfig[];
  createdAt: string;
  hasPromptedName?: boolean;
}

export interface HabitTip {
  description: string;
  monthlySavings: number;
  relatedCategory: string;
  suggestedReminder?: {
    title: string;
    message: string;
    timeOfDay: string;
    daysOfWeek?: number[];
  }
}


export interface Transaction {
  id?: string;
  userId: string;
  date: string;
  amount: number;
  merchant: string;
  category: string;
  subCategory?: string;
  tags?: string[];
  type?: 'expense' | 'transfer' | 'income' | 'refund';
  rawText: string;
  createdAt: string;
  screenshotId?: string;
  receiptBase64?: string;
}

export interface Screenshot {
  id?: string;
  userId: string;
  base64: string;
  createdAt: string;
  name: string;
  balance?: number;
}

export type RuleType = 'exact' | 'keyword' | 'tag';

export interface CategorizationRule {
  id?: string;
  userId: string;
  pattern: string;
  type: RuleType;
  tagPattern?: string;
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
  daysOfWeek?: string[];
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  targetCategory: string;
  createdAt: string;
}

export interface BudgetStats {
  spent: number;
  remaining: number;
  periodStart: string;
  periodEnd: string;
}

export interface SavingsBucket {
  id: string;
  name: string;
  amount: number;
  target?: number;
  color?: string;
}

export interface SavingsAccount {
  id?: string;
  userId: string;
  name: string;
  totalBalance: number;
  buckets: SavingsBucket[];
  lastUpdated: string;
}

export interface MerchantMetadata {
  id?: string;
  userId: string;
  merchantName: string;
  customLogo?: string;
  customColor?: string;
}
