import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  getDoc,
  setDoc,
  serverTimestamp, 
  deleteDoc, 
  doc, 
  updateDoc,
  orderBy,
  limit,
  deleteField,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Transaction, CategorizationRule, Screenshot, SavingsAccount, MerchantMetadata, UserProfile } from '../types';
import { startOfMonth, addMonths, setDate, isAfter, isBefore, subMonths } from 'date-fns';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function removeUndefined(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

// Rule Engine
export function matchesAnyCustomRule(transaction: Partial<Transaction>, rules: CategorizationRule[]): boolean {
  for (const rule of rules) {
    let merchantMatch = false;
    let tagMatch = true;

    merchantMatch = (rule.type === 'exact' || rule.type === 'tag')
      ? transaction.merchant?.toLowerCase() === rule.pattern?.toLowerCase()
      : transaction.merchant?.toLowerCase().includes(rule.pattern?.toLowerCase());

    if (rule.type === 'tag' && rule.tagPattern) {
      tagMatch = transaction.tags?.some(tag => tag.toLowerCase() === rule.tagPattern?.toLowerCase()) || false;
    }

    if (rule.type === 'tag' && !rule.tagPattern) {
      tagMatch = true;
      merchantMatch = transaction.tags?.some(tag => tag.toLowerCase() === rule.pattern?.toLowerCase()) || false;
    }

    const exactAmountMatch = rule.amount == null || transaction.amount === rule.amount;
    const minAmountMatch = rule.minAmount == null || (transaction.amount != null && transaction.amount >= rule.minAmount);
    const maxAmountMatch = rule.maxAmount == null || (transaction.amount != null && transaction.amount <= rule.maxAmount);

    let datetimeMatch = true;
    if (transaction.date) {
      // If it's a date-only string like "YYYY-MM-DD", append T12:00:00 to prevent local timezone from shifting it to the previous day
      const dateToParse = (transaction.date.length === 10) ? `${transaction.date}T12:00:00` : transaction.date;
      const d = new Date(dateToParse);
      
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const daysArray = Array.isArray(rule.daysOfWeek) ? rule.daysOfWeek : [rule.daysOfWeek];
        const dayStr = d.toLocaleDateString('en-GB', { weekday: 'long' });
        if (!daysArray.includes(dayStr)) {
          datetimeMatch = false;
        }
      }
      if (datetimeMatch && (rule.startTime || rule.endTime)) {
        if (transaction.date.includes('T') || transaction.date.includes(':')) {
           const timePartMatch = transaction.date.match(/T(\d{2}:\d{2})/);
           let timeStr = "";
           if (timePartMatch && timePartMatch[1]) {
             timeStr = timePartMatch[1];
           } else {
             const hours = d.getHours().toString().padStart(2, '0');
             const mins = d.getMinutes().toString().padStart(2, '0');
             timeStr = `${hours}:${mins}`;
           }

           if (rule.startTime && rule.endTime && rule.startTime > rule.endTime) {
             if (timeStr < rule.startTime && timeStr > rule.endTime) datetimeMatch = false;
           } else {
             if (rule.startTime && timeStr < rule.startTime) datetimeMatch = false;
             if (rule.endTime && timeStr > rule.endTime) datetimeMatch = false;
           }
        } else {
           datetimeMatch = false;
        }
      }
    }

    if (merchantMatch && tagMatch && exactAmountMatch && minAmountMatch && maxAmountMatch && datetimeMatch) {
      return true;
    }
  }
  return false;
}

export function applyRules(transaction: Partial<Transaction>, rules: CategorizationRule[]): string {
  // 0. Handle types directly
  if (transaction.type === 'transfer') return 'Transfer';
  if (transaction.type === 'income') return 'Income';

  // 1. Check custom user rules
  // Sort rules to prioritize those with specific amount constraints over those without them,
  // and prioritize 'exact' matching over 'keyword' matching
  const sortedRules = [...rules].sort((a, b) => {
    const aHasAmountConstraint = a.amount !== undefined || a.minAmount !== undefined || a.maxAmount !== undefined;
    const bHasAmountConstraint = b.amount !== undefined || b.minAmount !== undefined || b.maxAmount !== undefined;
    if (aHasAmountConstraint && !bHasAmountConstraint) return -1;
    if (!aHasAmountConstraint && bHasAmountConstraint) return 1;
    
    // If both have or neither have amount constraints, check the matching type
    if (a.type === 'exact' && b.type !== 'exact') return -1;
    if (a.type !== 'exact' && b.type === 'exact') return 1;

    return 0; // maintain original order otherwise
  });

  for (const rule of sortedRules) {
    let merchantMatch = false;
    let tagMatch = true;

    // Both 'exact' and 'tag' mode can have a merchant pattern
    // In tag mode, it might use 'exact' style or 'keyword' style for the merchant... 
    // we'll default to exact for merchant if it's not a generic keyword or we'll just check includes.
    // Let's assume pattern is merchant.
    merchantMatch = (rule.type === 'exact' || rule.type === 'tag')
      ? transaction.merchant?.toLowerCase() === rule.pattern?.toLowerCase()
      : transaction.merchant?.toLowerCase().includes(rule.pattern?.toLowerCase());

    // If it's tag type, also check the tag
    if (rule.type === 'tag' && rule.tagPattern) {
      tagMatch = transaction.tags?.some(tag => tag.toLowerCase() === rule.tagPattern?.toLowerCase()) || false;
    }

    // If tag mode was selected but NO tagPattern was provided, we assume pattern was actually the tag
    // to preserve backward compatibility with previous rule states.
    if (rule.type === 'tag' && !rule.tagPattern) {
      tagMatch = true; // we don't have a tag pattern to match
      merchantMatch = transaction.tags?.some(tag => tag.toLowerCase() === rule.pattern?.toLowerCase()) || false;
    }

    const exactAmountMatch = rule.amount == null || transaction.amount === rule.amount;
    const minAmountMatch = rule.minAmount == null || (transaction.amount != null && transaction.amount >= rule.minAmount);
    const maxAmountMatch = rule.maxAmount == null || (transaction.amount != null && transaction.amount <= rule.maxAmount);

    let datetimeMatch = true;
    if (transaction.date) {
      // If it's a date-only string like "YYYY-MM-DD", append T12:00:00 to prevent local timezone from shifting it to the previous day
      const dateToParse = (transaction.date.length === 10) ? `${transaction.date}T12:00:00` : transaction.date;
      const d = new Date(dateToParse);

      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const daysArray = Array.isArray(rule.daysOfWeek) ? rule.daysOfWeek : [rule.daysOfWeek];
        const dayStr = d.toLocaleDateString('en-GB', { weekday: 'long' });
        if (!daysArray.includes(dayStr)) {
          datetimeMatch = false;
        }
      }
      if (datetimeMatch && (rule.startTime || rule.endTime)) {
        if (transaction.date.includes('T') || transaction.date.includes(':')) {
           const timePartMatch = transaction.date.match(/T(\d{2}:\d{2})/);
           let timeStr = "";
           if (timePartMatch && timePartMatch[1]) {
             timeStr = timePartMatch[1];
           } else {
             const hours = d.getHours().toString().padStart(2, '0');
             const mins = d.getMinutes().toString().padStart(2, '0');
             timeStr = `${hours}:${mins}`;
           }

           if (rule.startTime && rule.endTime && rule.startTime > rule.endTime) {
             if (timeStr < rule.startTime && timeStr > rule.endTime) datetimeMatch = false;
           } else {
             if (rule.startTime && timeStr < rule.startTime) datetimeMatch = false;
             if (rule.endTime && timeStr > rule.endTime) datetimeMatch = false;
           }
        } else {
           datetimeMatch = false;
        }
      }
    }

    if (merchantMatch && tagMatch && exactAmountMatch && minAmountMatch && maxAmountMatch && datetimeMatch) {
      return rule.targetCategory;
    }
  }

  // 2. Default hardcoded "SnoopInsight" specific logic
  const merchant = transaction.merchant?.toLowerCase() || '';
  
  // Specific User Requests: Monzo and Amer Suljic
  if (merchant.includes('monzo') || merchant.includes('amer suljic')) {
    return 'Transfer';
  }

  // Detect transfers by name if type was missed or mixed
  if (merchant.includes('transfer to') || merchant.includes('move money') || merchant.includes('internal transfer') || merchant.includes('from your bank')) {
    return 'Transfer';
  }

  // High priority specific matches
  if (merchant.includes('tesco') && (merchant.includes('petrol') || merchant.includes('pfs'))) return 'Fuel';
  if (merchant.includes('tesco') && transaction.amount === 10) return 'Cigarettes';
  
  // General merchant mapping
  if (merchant.includes('pret a manger') || merchant.includes('pret')) return 'Eating Out';
  if (merchant.includes('starbucks') || merchant.includes('costa') || merchant.includes('caffe nero')) return 'Coffee';
  if (merchant.includes('mcdonald') || merchant.includes('burger king') || merchant.includes('kfc')) return 'Fast Food';

  // Specific User Requests: Fuel vs Groceries
  if (merchant.includes('petrol') || merchant.includes('pfs') || merchant.includes('service station') || merchant.includes('bp ') || merchant.includes('shell') || merchant.includes('esso') || merchant.includes('texaco')) {
    return 'Fuel';
  }

  if (merchant.includes('deliveroo') || merchant.includes('uber eats') || merchant.includes('just eat')) return 'Food Delivery';
  
  if (merchant.includes('tesco') || merchant.includes('sainsbury') || merchant.includes('asda') || merchant.includes('waitrose') || merchant.includes('morrison') || merchant.includes('aldi') || merchant.includes('lidl') || merchant.includes('marks & spencer') || merchant.includes('m&s food')) return 'Groceries';
  
  if (merchant.includes('netflix') || merchant.includes('spotify') || merchant.includes('disney+') || merchant.includes('amazon prime')) return 'Subscriptions';
  
  if (merchant.includes('o2') || merchant.includes('ee ') || merchant.includes('vodafone') || merchant.includes('three mobile') || merchant.includes('giffgaff') || merchant.includes('sky ') || merchant.includes('virgin media') || merchant.includes('bt broadband') || merchant.includes('british gas') || merchant.includes('edf energy') || merchant.includes('e.on') || merchant.includes('octopus energy') || merchant.includes('water') || merchant.includes('council tax')) {
    return 'Bills';
  }
  
  if (merchant.includes('amazon') && !merchant.includes('prime')) return 'Shopping';
  
  return transaction.category || 'General';
}

export function suggestTagsForMerchant(merchant: string): string[] {
  const m = merchant.toLowerCase();
  const suggestedTags: string[] = [];
  
  if (m.includes('netflix') || m.includes('spotify') || m.includes('prime') || m.includes('gym')) suggestedTags.push('Subscription');
  if (m.includes('tesco') || m.includes('asda') || m.includes('aldi') || m.includes('sainsbury')) suggestedTags.push('Groceries');
  if (m.includes('deliveroo') || m.includes('uber eats') || m.includes('just eat')) suggestedTags.push('Takeaway');
  if (m.includes('uber') && !m.includes('eats') || m.includes('bolt') || m.includes('train')) suggestedTags.push('Transport');
  if (m.includes('costa') || m.includes('starbucks') || m.includes('nero')) suggestedTags.push('Coffee');
  if (m.includes('amazon') && !m.includes('prime')) suggestedTags.push('Shopping');
  if (m.includes('pub') || m.includes('wetherspoon') || m.includes('bar ')) suggestedTags.push('Drinks');

  return suggestedTags;
}

export async function saveTransaction(transaction: Partial<Transaction>) {
  if (!auth.currentUser) return;
  const path = 'transactions';
  try {
    const docRef = await addDoc(collection(db, path), removeUndefined({
      ...transaction,
      userId: auth.currentUser.uid,
      createdAt: new Date().toISOString(),
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getAllTransactions() {
  if (!auth.currentUser) return [];
  const path = 'transactions';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', auth.currentUser.uid),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as Transaction));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

export async function getTransactions(startDate: Date, endDate: Date) {
  if (!auth.currentUser) return [];
  const path = 'transactions';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', auth.currentUser.uid),
      // Note: We can filter by date if we have indices, for now sorting
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    const all = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Transaction));
    
    // Filter locally to avoid index requirement for new collections during dev
    return all.filter(t => {
      const d = new Date(t.date);
      return d >= startDate && d <= endDate;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveRule(rule: Partial<CategorizationRule>) {
  if (!auth.currentUser) return;
  const path = 'rules';
  try {
    await addDoc(collection(db, path), removeUndefined({
      ...rule,
      userId: auth.currentUser.uid,
      createdAt: new Date().toISOString(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getRules() {
  if (!auth.currentUser) return [];
  const path = 'rules';
  try {
    const q = query(collection(db, path), where('userId', '==', auth.currentUser.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CategorizationRule));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function deleteRule(ruleId: string) {
  if (!auth.currentUser) return;
  const path = 'rules';
  try {
    await deleteDoc(doc(db, path, ruleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateRule(id: string, updates: Partial<CategorizationRule>) {
  if (!auth.currentUser) return;
  const path = 'rules';
  try {
    const { id: _, ...data } = updates as any;
    
    // Replace nulls with deleteField()
    const finalData = { ...data };
    Object.keys(finalData).forEach(key => {
      if (finalData[key] === null) {
        finalData[key] = deleteField();
      }
    });

    await updateDoc(doc(db, path, id), finalData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getCategories(): Promise<string[]> {
  if (!auth.currentUser) return COMMON_CATEGORIES;
  const path = 'users';
  try {
    const d = await getDoc(doc(db, path, auth.currentUser.uid));
    if (d.exists()) {
      const data = d.data();
      if (data.customCategories && Array.isArray(data.customCategories)) {
        return [...new Set([...COMMON_CATEGORIES, ...data.customCategories])];
      }
    }
    return COMMON_CATEGORIES;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return COMMON_CATEGORIES;
  }
}

export async function addCategory(category: string) {
  if (!auth.currentUser) return;
  const path = 'users';
  try {
    const userDoc = doc(db, path, auth.currentUser.uid);
    const d = await getDoc(userDoc);
    let customCategories: string[] = [];
    if (d.exists()) {
      const data = d.data();
      customCategories = data.customCategories || [];
    }
    
    if (!customCategories.includes(category) && !COMMON_CATEGORIES.includes(category)) {
      customCategories.push(category);
      await setDoc(userDoc, { customCategories, uid: auth.currentUser.uid, email: auth.currentUser.email }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeCategory(category: string) {
  if (!auth.currentUser) return;
  const path = 'users';
  try {
    const userDoc = doc(db, path, auth.currentUser.uid);
    const d = await getDoc(userDoc);
    if (d.exists()) {
      const data = d.data();
      const customCategories = data.customCategories || [];
      const updated = customCategories.filter((c: string) => c !== category);
      if (updated.length !== customCategories.length) {
        await setDoc(userDoc, { customCategories: updated, uid: auth.currentUser.uid, email: auth.currentUser.email }, { merge: true });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export const COMMON_CATEGORIES = [
  'General',
  'Groceries',
  'Fuel',
  'Food Delivery',
  'Eating Out',
  'Coffee',
  'Fast Food',
  'Subscriptions',
  'Shopping',
  'Entertainment',
  'Bills',
  'Transport',
  'Interest',
  'Income',
  'Transfer',
  'Cigarettes',
  'Savings',
  'Investments',
  'Work Expenses'
];

export const COMMON_TAGS = [
  'Girlfriend',
  'Work Transport',
  'Work Dining',
  'Holiday',
  'Friends',
  'Subscription',
  'Essentials',
  'Luxury',
  'Business',
  'Work Expense'
];

export async function deleteTransaction(id: string) {
  if (!auth.currentUser) return;
  const path = 'transactions';
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateTransaction(id: string, updates: Partial<Transaction>) {
  if (!auth.currentUser) return;
  const path = 'transactions';
  try {
    const { id: _, ...data } = updates as any; // Remove id from data
    await updateDoc(doc(db, path, id), removeUndefined({
      ...data,
      updatedAt: new Date().toISOString()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function reapplyRules(startDate: Date, endDate: Date, rules: CategorizationRule[]) {
  if (!auth.currentUser) return;
  // Get all transactions for the user across all dates so we can truly re-apply
  // The signature has startDate and endDate but the user wants ALL transactions affected by the rule to revert.
  // Wait, the signature requires startDate, endDate.
  const txs = await getTransactions(new Date(0), new Date(8640000000000000)); // get all to be safe?
  
  for (const tx of txs) {
    if (!tx.id) continue;
    // Pass transaction without its current category so we get the pure rule-based / default category
    const pureTx = { ...tx, category: undefined };
    const newCategory = applyRules(pureTx, rules);
    if (newCategory !== tx.category) {
      await updateTransaction(tx.id, {
        category: newCategory
      });
    }
  }
}

export async function clearTransactionsForPeriod(startDate: Date, endDate: Date) {
  if (!auth.currentUser) return;
  const path = 'transactions';
  try {
    const q = query(collection(db, path), where('userId', '==', auth.currentUser.uid));
    const snapshot = await getDocs(q);
    
    let batch = writeBatch(db);
    let count = 0;
    
    for (const d of snapshot.docs) {
      const data = d.data();
      const date = new Date(data.date);
      if (date >= startDate && date <= endDate) {
        batch.delete(doc(db, path, d.id));
        count++;
        
        if (count === 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error("Error clearing transactions for period", error);
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllTransactionsOnly() {
  if (!auth.currentUser) return;
  const path = 'transactions';
  try {
    const q = query(collection(db, path), where('userId', '==', auth.currentUser.uid));
    const snapshot = await getDocs(q);
    
    // Use batch deletion to safely manage larger data sets
    const docs = snapshot.docs;
    let batch = writeBatch(db);
    let count = 0;
    
    for (const dataDoc of docs) {
      batch.delete(doc(db, path, dataDoc.id));
      count++;
      
      if (count === 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error("Error clearing all transactions", error);
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function clearAllData() {
  if (!auth.currentUser) return;
  const collectionsToClear = ['transactions', 'rules', 'screenshots', 'savings_accounts', 'merchants'];
  
  try {
    for (const path of collectionsToClear) {
      try {
        const q = query(collection(db, path), where('userId', '==', auth.currentUser.uid));
        const snapshot = await getDocs(q);
        
        // Use batch deletion to safely manage larger data sets
        const docs = snapshot.docs;
        let batch = writeBatch(db);
        let count = 0;
        
        for (const dataDoc of docs) {
          batch.delete(doc(db, path, dataDoc.id));
          count++;
          
          if (count === 400) { // Limit is 500, using 400 to be safe
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        
        if (count > 0) {
          await batch.commit();
        }
      } catch (err) {
        console.error("Error clearing collection", path, err);
      }
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { customCategories: [] });
    } catch (err) {
      console.error("Error resetting user categories", err);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'multiple');
  }
}

export async function saveScreenshot(screenshot: Partial<Screenshot>) {
  if (!auth.currentUser) return;
  const path = 'screenshots';
  try {
    const docRef = await addDoc(collection(db, path), removeUndefined({
      ...screenshot,
      userId: auth.currentUser.uid,
      createdAt: new Date().toISOString(),
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getScreenshots() {
  if (!auth.currentUser) return [];
  const path = 'screenshots';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Screenshot));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function deleteScreenshot(id: string) {
  if (!auth.currentUser) return;
  const path = 'screenshots';
  try {
    await deleteDoc(doc(db, path, id));
    // Also clear screenshotId from transactions using it
    const txQ = query(collection(db, 'transactions'), 
      where('screenshotId', '==', id),
      where('userId', '==', auth.currentUser.uid)
    );
    const txSnap = await getDocs(txQ);
    await Promise.all(txSnap.docs.map(d => updateDoc(doc(db, 'transactions', d.id), { screenshotId: null })));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Budget Period Helper (Starts on 15th)
export function getBudgetPeriod(date: Date, billingDay: number = 15) {
  let periodStart = setDate(startOfMonth(date), billingDay);
  
  if (isBefore(date, periodStart)) {
    periodStart = subMonths(periodStart, 1);
  }
  
  const periodEnd = subMonths(addMonths(periodStart, 1), 0); 
  // End should be day before next start effectively
  const nextStart = addMonths(periodStart, 1);
  const end = new Date(nextStart.getTime() - 1);

  return { start: periodStart, end: end };
}

export async function getSavingsAccounts(): Promise<SavingsAccount[]> {
  if (!auth.currentUser) return [];
  const path = 'savings_accounts';
  try {
    const q = query(collection(db, path), where('userId', '==', auth.currentUser.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as SavingsAccount));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveSavingsAccount(account: Partial<SavingsAccount>) {
  if (!auth.currentUser) return;
  const path = 'savings_accounts';
  try {
    if (account.id) {
      const { id, ...data } = account;
      await updateDoc(doc(db, path, id), {
        ...data,
        lastUpdated: new Date().toISOString()
      });
      return id;
    } else {
      const docRef = await addDoc(collection(db, path), removeUndefined({
        ...account,
        userId: auth.currentUser.uid,
        lastUpdated: new Date().toISOString(),
      }));
      return docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSavingsAccount(id: string) {
  if (!auth.currentUser) return;
  const path = 'savings_accounts';
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getMerchantMetadata(): Promise<MerchantMetadata[]> {
  if (!auth.currentUser) return [];
  const path = 'merchants';
  try {
    const q = query(collection(db, path), where('userId', '==', auth.currentUser.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MerchantMetadata));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveMerchantMetadata(metadata: Partial<MerchantMetadata>) {
  if (!auth.currentUser) return;
  const path = 'merchants';
  try {
    const q = query(collection(db, path), 
      where('userId', '==', auth.currentUser.uid),
      where('merchantName', '==', metadata.merchantName)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const existingId = snapshot.docs[0].id;
      const { id: _, ...data } = metadata as any;
      await updateDoc(doc(db, path, existingId), data);
      return existingId;
    } else {
      const docRef = await addDoc(collection(db, path), removeUndefined({
        ...metadata,
        userId: auth.currentUser.uid
      }));
      return docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  if (!auth.currentUser) return null;
  const path = 'users';
  try {
    const d = await getDoc(doc(db, path, auth.currentUser.uid));
    if (d.exists()) {
      return { ...d.data(), uid: d.id } as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function updateUserProfile(updates: Partial<UserProfile>) {
  if (!auth.currentUser) return;
  const path = 'users';
  try {
    const { uid: _, ...data } = updates as any;
    const cleanData = removeUndefined(data);
    await updateDoc(doc(db, path, auth.currentUser.uid), cleanData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
