import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, CategorizationRule, SavingsBucketConfig, HabitTip } from "../types";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper for localStorage caching to reduce Gemini API calls dramatically
function getInsightCache(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setInsightCache(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignored
  }
}

export async function extractTransactionsFromScreenshot(base64Image: string, categories: string[], mimeType: string = "image/png"): Promise<{ transactions: Partial<Transaction>[], balance?: number }> {
  // Use gemini-3.5-flash which is the standard model for structured processing and text tasks
  const model = "gemini-3.5-flash";
  
  const prompt = `
    Analyzing Snoop screenshots:
    1. Merchant: The name of the business or description of the transfer.
    2. Date: Convert relative dates (Today, Yesterday, 15 Oct) to absolute YYYY-MM-DD. Include time if visible (e.g. 2026-10-15T14:30:00).
    3. Amount: The numeric value. 
       - MUST be negative (e.g. -10.50) if it is an outflow/expense/money out.
       - MUST be positive (e.g. 10.50) if it is an inflow/income/money in/refund.
       - FOR TRANSFERS: Look closely at keywords like "To", "From", "In", "Out". "To [Account]" is usually negative. "From [Account]" is usually positive.
    4. Category: Suggest one of: ${JSON.stringify(categories)}.
    5. type: Identify the transaction nature:
       - "income": If it is a refund, salary, reward, or explicitly marked as incoming (e.g. "+£10.00" or in a "Money In" section).
       - "transfer": ONLY if it explicitly mentions "Transfer to", "Transfer from", "Internal Transfer", "To account", or moves money between known banks (Monzo, Chase, Halifax, etc.).
       - "expense": Default for outgoing spending or transactions in a "Money Out" section.
    6. tags: Suggest JSON array tags based on common spending patterns.
    7. rawText: The full line of text.

    Also try to extract the overall account balance from the page/screenshot if available. Look for "Balance", "Available", or at the top of the screenshot (specifically considering this may be a Chase Saver screenshot!).

    CRITICAL SIGN RULES:
    - Snoop often uses headers like "Money out" and "Money in". Transactions under "Money out" MUST be NEGATIVE.
    - If a transaction has a "-" sign or is an explicitly outgoing payment, it is negative.
    - If a transaction has a "+" sign, it is positive.
    - "Transfer to [Account]" -> NEGATIVE amount.
    - "Transfer from [Account]" -> POSITIVE amount.
    - INTERNAL TRANSFERS: You must determine if it is an outflow or inflow from the primary account context. "To" always implies negative. "From" always implies positive.
    - DO NOT guess the sign; use the visual cues (headers, signs, symbols). If in doubt, look for the section header.

    CRITICAL CATEGORIZATION RULES:
    - Deliveroo, Uber Eats, Just Eat -> "Food Delivery"
    - Tesco, Asda, Sainsbury's, Aldi, Lidl, Morrisons, Waitrose -> "Groceries"
    - BP, Shell, Esso, Texaco, Jet, Petrol -> "Fuel"
    - Monzo, Amer Suljic, Chase Saver -> "Transfer" (type: transfer) if it looks like an internal move.
    - Monthly recurring small amounts -> "Subscriptions"
    - If it's interest, reward, or cashback -> "Interest" (type: income) and POSITIVE.
    - If it is a generic incoming amount with a "+" sign and no other context -> "Income" (type: income) and POSITIVE.

    CRITICAL PROCESSING RULES:
    - IF AN AMOUNT HAS A "+" SIGN NEXT TO IT, YOU MUST MARK IT AS "income" type AND POSITIVE amount.
    - IF AN AMOUNT HAS A "-" SIGN NEXT TO IT, IT MUST BE NEGATIVE.
    - DO NOT include currency symbols in the 'amount' field, just the number.
    - BE PRECISE with merchant names.

    Return the result as a JSON object with properties 'transactions' (array) and 'balance' (number, optional).
  `;

  try {
    const dataPart = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: dataPart,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            balance: { type: Type.NUMBER },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  merchant: { type: Type.STRING },
                  category: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["expense", "transfer", "income"] },
                  tags: { 
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  rawText: { type: Type.STRING }
                },
                required: ["amount", "merchant", "type"]
              }
            }
          },
          required: ["transactions"]
        }
      }
    });

    const text = response.text?.trim() || "{\"transactions\": []}";
    const result = JSON.parse(text);
    console.log(`Extracted ${result.transactions.length} transactions, balance: ${result.balance} from Gemini`);
    return result;
  } catch (e) {
    console.error("Gemini API Error in extractTransactionsFromScreenshot:", e);
    throw new Error(`Failed to analyze screenshot: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Empathy fallback insights when Gemini API is rate-limited or exhausted (429)
export function getLocalFallbackInsights(transactions: Transaction[]): string {
  if (!transactions || transactions.length === 0) {
    return "Luca here! Add some transactions to see your personalized insights. I can't wait to help you uncover the stories behind your spend.";
  }

  const categories: Record<string, number> = {};
  let totalSpend = 0;
  transactions.forEach(t => {
    if (t.amount < 0) {
      const amt = Math.abs(t.amount);
      categories[t.category] = (categories[t.category] || 0) + amt;
      totalSpend += amt;
    }
  });

  const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  
  let topCategoryText = "";
  if (sortedCategories.length > 0) {
    const [topCat, amt] = sortedCategories[0];
    topCategoryText = `\n\n### Your Top Spend: **${topCat}**\nYour highest discretionary spend is currently in **${topCat}**, totaling **£${amt.toFixed(2)}**. Sometimes small, automated daily purchases add up under the radar. Could we try spacing these out to keep more in your pocket?`;
  }

  return `### **A message from your finance companion, Luca**

Luca here! Every pound tells a story, and yours is one of continuous progress. 

We had some trouble communicating with our AI engine for live custom insights just now (quota rate limit exceeded), so I've run a direct analysis of your recent ledger locally to keep you going:

*   **Consistent Activity**: You have documented **${transactions.length} transactions** this month, demonstrating incredible awareness and care. Awareness is 90% of the battle! ${topCategoryText}

*   **Empathy & Balance**: Remember, personal finance isn't about restriction; it's about making sure your money funds what actually brings you joy. Be gentle with yourself and celebrate the small wins!`;
}

export async function generateInsights(transactions: Transaction[]): Promise<string> {
  const model = "gemini-3.5-flash";
  
  // Create a unique cache key based on the ledger length and top transaction details
  const cacheKey = `ledger_insights_${transactions.length}_${transactions.map(t => t.id + '_' + t.amount).slice(0, 10).join('_')}`;
  const cached = getInsightCache(cacheKey);
  if (cached) {
    return cached;
  }

  const summary = transactions.map(t => {
    const d = new Date(t.date);
    const dayName = d.toLocaleDateString('en-GB', { weekday: 'long' });
    return `${t.date} (${dayName}): ${t.merchant} - ${t.amount} (${t.category})`;
  }).join('\n');
  
  const prompt = `
    You are Luca, a personal finance companion who believes every pound tells a story.
    Your goal is to help users understand the behaviors and routines behind their spending, reducing financial anxiety through context.
    
    Analyze these transactions and provide 3-4 human-centric insights.
    Don't just talk about categories; talk about lifestyles, habits, and routines.
    
    Example: Instead of "You spent £50 on Coffee", say "Your morning coffee routine is a significant part of your work days, costing about £12 a week. Is this a moment of calm you value, or an area where we can find balance?"
    
    Transactions:
    ${summary}
    
    Format as clear Markdown with bold headers and empathetic, insightful commentary.
  `;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    const text = result.text?.trim() || "";
    if (text) {
      setInsightCache(cacheKey, text);
      return text;
    }
    return getLocalFallbackInsights(transactions);
  } catch (e: any) {
    const errMessage = e?.message || String(e);
    if (errMessage.includes("429") || errMessage.includes("RESOURCE_EXHAUSTED") || errMessage.includes("quota")) {
      console.warn("Gemini API Quota Exceeded in generateInsights. Using local fallback gracefully.");
    } else {
      console.error("Gemini API Error in generateInsights:", e);
    }
    return getLocalFallbackInsights(transactions);
  }
}

// Client-side savings companion sentence generator (fully reliable offline backup)
export function getLocalFallbackInsight(
  bucket: SavingsBucketConfig,
  totalSaved: number,
  monthlyTarget: number,
  streak: number
): string {
  const name = bucket.name ? bucket.name.toLowerCase() : "";
  
  if (streak >= 3) {
    return `${streak} months in a row! You are an absolute savings machine.`;
  }
  
  if (totalSaved === 0) {
    return `Every journey starts with a single step. Let's make that first deposit into ${bucket.name || 'this bucket'}!`;
  }

  if (bucket.target && totalSaved >= bucket.target) {
    return `Woohoo! You've fully reached your target for ${bucket.name || 'this bucket'}! Time to celebrate.`;
  }

  if (bucket.target && totalSaved >= bucket.target * 0.5) {
    return `Over halfway there for ${bucket.name || 'this bucket'}! You are making spectacular progress.`;
  }

  if (name.includes("car") || name.includes("vehicle") || name.includes("drive")) {
    return `Keep this up and you'll be driving off in your new ride before you know it!`;
  }

  if (name.includes("holiday") || name.includes("travel") || name.includes("spain") || name.includes("trip") || name.includes("flight") || name.includes("vacation") || name.includes("iceland")) {
    return `Your exciting journey is getting closer and closer with every single deposit.`;
  }

  if (name.includes("house") || name.includes("deposit") || name.includes("home") || name.includes("flat") || name.includes("rent") || name.includes("mortgage")) {
    return `You're building an incredible foundation. Your future home is going to be so worth it!`;
  }

  if (name.includes("wedding") || name.includes("marriage") || name.includes("party") || name.includes("celebration")) {
    return `The planning is on. Keep going to make your special day absolutely magical!`;
  }

  if (name.includes("emergency") || name.includes("buffer") || name.includes("safety") || name.includes("rainy")) {
    return `Building that peace of mind. Every pound saved is more financial confidence for the future.`;
  }

  if (name.includes("gift") || name.includes("christmas") || name.includes("presents") || name.includes("birthday")) {
    return `Generous soul! You're making sure your loved ones have the absolute best celebration.`;
  }

  if (name.includes("school") || name.includes("course") || name.includes("education") || name.includes("book") || name.includes("uni")) {
    return `Investing in yourself is the best kind of saving. Clear skies are ahead!`;
  }

  return `You are doing amazing! Consistent saving into ${bucket.name || 'this bucket'} will pay off in no time.`;
}

export async function generateBucketInsight(
  bucket: SavingsBucketConfig,
  totalSaved: number, 
  monthlyTarget: number,
  streak: number
): Promise<string> {
  // Check the Cache first to strictly limit unnecessary API requests during navigation/re-renders
  const cacheKey = `bucket_insight_${bucket.id || bucket.name}_${totalSaved}_${monthlyTarget}_${streak}`;
  const cached = getInsightCache(cacheKey);
  if (cached) {
    return cached;
  }

  const model = "gemini-3.5-flash";
  const prompt = `
    You are Luca, a slightly excited, warm, and highly encouraging personal finance companion (like a supportive best friend!).
    The user has a savings pot:
    - Name: "${bucket.name}"
    - Target Amount: ${bucket.target ? `£${bucket.target}` : 'None'}
    - Current Saved: £${totalSaved}
    - Target Date: ${bucket.targetDate || 'None'}
    - Suggested Monthly Deposit: ${monthlyTarget > 0 ? `£${monthlyTarget}` : '£0'}
    - Current Deposit Streak: ${streak} consecutive months

    Provide ONE short, highly contextual, encouraging sentence to display in their UI.
    Do NOT use emojis.
    Keep it strictly under 20 words.
    
    Examples of your specific tone (celebrating wins, soft, encouraging):
    - "Woohoo, what a start! Keep this up and you'll be there in no time."
    - "Only one month until Spain! I can practically feel the sunshine already."
    - "You're doing amazing! Just an extra £20 a month and you could hit this by October."
    - "Three months in a row! You're an absolute savings machine."
    
    Be specific and creative about the name of the bucket (e.g., if the name is "New Car", act excited for their new ride; if the name is "Iceland", mention the Northern Lights). Make logical geographical/seasonal deductions if the place/date is obvious. Celebrate their current progress, no matter how small. If their streak is 3 or more months, definitely celebrate that specifically!
  `;
  try {
    const response = await ai.models.generateContent({ model, contents: prompt });
    const text = response.text?.trim() || "";
    if (text) {
      setInsightCache(cacheKey, text);
      return text;
    }
    return getLocalFallbackInsight(bucket, totalSaved, monthlyTarget, streak);
  } catch (e: any) {
    const errMessage = e?.message || String(e);
    if (errMessage.includes("429") || errMessage.includes("RESOURCE_EXHAUSTED") || errMessage.includes("quota")) {
      console.warn("Gemini API Quota Exceeded in generateBucketInsight. Using local fallback gracefully.");
    } else {
      console.error("Gemini API Error in generateBucketInsight:", e);
    }
    return getLocalFallbackInsight(bucket, totalSaved, monthlyTarget, streak);
  }
}

export async function analyzeRoutine(
  transactions: Transaction[],
  savingsBuckets: SavingsBucketConfig[],
  userDescription: string
): Promise<{
  insight: string,
  suggestedRules: Partial<CategorizationRule>[],
  suggestedTags?: { transactionIds: string[], tag: string, reason: string }[],
  suggestedCategories?: { transactionIds: string[], category: string, reason: string }[],
  habitTips?: HabitTip[],
  suggestedBudgets?: { targetType: "category"|"merchant"|"tag", targetId: string, amount: number, cycle: "daily"|"weekly"|"monthly", reason: string }[]
}> {
  const model = "gemini-3.1-pro-preview";
  
  const cacheKey = `analyze_routine_${transactions.length}_${userDescription.replace(/\s+/g, '_')}`;
  const cached = getInsightCache(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Ignored
    }
  }

  const summary = transactions.map(t => {
    const d = new Date(t.date);
    const dayName = d.toLocaleDateString('en-GB', { weekday: 'long' });
    const timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    return `ID: ${t.id} | ${t.date} (${dayName} ${timeStr}): ${t.merchant} - ${t.amount} (${t.category} / ${t.subCategory || ''}) [Tags: ${t.tags?.join(', ')}]`;
  }).join('\n');

  const savingsSummary = savingsBuckets.map(b => {
    return `Pot: ${b.name} | Target: ${b.target || 'None'} | Target Date: ${b.targetDate || 'None'}`;
  }).join('\n');
  
  const prompt = `
    You are Luca, a personal finance companion who understands the "story" behind money.
    The user wants to know about their routines/behaviors and may want your help categorizing or tagging transactions based on patterns and their savings goals.
    
    User context: ${userDescription}
    
    Savings Pots / Goals:
    ${savingsSummary || 'No savings pots defined.'}

    Transactions:
    ${summary}
    
    Task: 
    Focus your analysis specifically on the user's query: "${userDescription}".
    
    When answering their query and analyzing their overall spending:
    1. Focus heavily on what they asked for in their query.
    2. Exclude essential categories like Commute, Travel, Rent, Utilities, Housing, Bills, and Transport from your discretionary analysis (unless they specifically ask about them).
    3. Analyze spend in discretionary categories/tags (e.g., Snacks, Shopping, Eating Out).
    4. Calculate current spending paces (e.g., "current spending in snacks is x amount a week... currently you're at y").
    5. Provide commentary for each top discretionary category (e.g., "You spend a lot on X and Y in Shopping, shall we put a reminder once you hit £Z?" or "X and Y make up 60% of your Shopping spend, do you want to set a merchant budget?").
    6. Ask the user what they want to do about it, considering their savings pots.
    
    Return the response as a JSON object with six fields:
    1. "insight": A human, empathetic markdown explanation of the patterns you found regarding their query AND the discretionary spending analysis. Include specific commentary and budget prompts.
    2. "suggestedRules": An array of smart rules to suggest (pattern, type, targetCategory, daysOfWeek, startTime, endTime, minAmount, maxAmount).
    3. "suggestedTags": (Optional) An array of objects to suggest tagging specific transactions. Each object has:
       - "transactionIds": array of string (the IDs of the transactions from the list above)
       - "tag": string (the suggested tag, e.g. "holiday", "going out with friends")
       - "reason": A short string explaining why this tag makes sense.
    4. "suggestedCategories": (Optional) An array of objects to suggest recategorizing specific transactions. Each object has:
       - "transactionIds": array of string (the IDs of the transactions)
       - "category": string (the suggested category)
       - "reason": A short string explaining why this category makes sense.
    5. "habitTips": (Optional) An array of objects finding a specific recurring spend and calculating savings from cutting back to help a pot (e.g., skip one day of your weekly £4 lunch allows saving an extra £16/mo).
       HabitTip shape:
       - "description": specific insight text computing the avg meal and multiplying by frequency and month to show total amount that could be saved if skip 1 day a week, do not add emojis. "i.e. 'You tend to get coffee at Costa every Monday and Tuesday. Skipping this could save you £28 a month. Do you want to add an extra £28 a month contribution to your <INSERT POT NAME> pot?'"
       - "monthlySavings": number (the potential amount saved)
       - "relatedCategory": string (the pot name this aligns with)
       - "suggestedReminder": An object (Optional) to help cut back, eg. { title: "Lunch prep", message: "Make your lunch for tomorrow!", timeOfDay: "20:00", daysOfWeek: [0] }
    6. "suggestedBudgets": (Optional) An array of budget suggestions. Each has:
       - "targetType": "category" | "merchant" | "tag"
       - "targetId": string (the category, merchant, or tag name)
       - "amount": number (the suggested budget amount)
       - "cycle": "daily" | "weekly" | "monthly"
       - "reason": A short string explaining why this budget is suggested.
  `;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = result.text || "{}";
    const data = JSON.parse(text);
    const parsedResult = {
      insight: data.insight || "I couldn't identify any specific patterns just yet.",
      suggestedRules: data.suggestedRules || [],
      suggestedTags: data.suggestedTags || [],
      suggestedCategories: data.suggestedCategories || [],
      habitTips: data.habitTips || [],
      suggestedBudgets: data.suggestedBudgets || [],
    };
    try {
      setInsightCache(cacheKey, JSON.stringify(parsedResult));
    } catch {
      // Ignored
    }
    return parsedResult;
  } catch (e: any) {
    const errMessage = e?.message || String(e);
    if (errMessage.includes("429") || errMessage.includes("RESOURCE_EXHAUSTED") || errMessage.includes("quota")) {
      console.warn("Gemini API Quota Exceeded in analyzeRoutine. Using local fallback gracefully.");
    } else {
      console.error("Gemini API Error in analyzeRoutine:", e);
    }
    return {
      insight: `### **Luca Finance Analysis Companion (Local Mode)**\n\nLuca here! It seems there is high demand on our custom AI query service right now, so I've doing a quick offline reflection based on your ledger:\n\n*   **Active ledger analysis**: Reviewing your ${transactions.length} active transactions.\n*   **Discretionary review**: When looking at your query: "*${userDescription}*", focus on small adjustments. Check if any frequent snacks or coffees can be automated into direct contributions for savings pots like **${savingsBuckets.length > 0 ? savingsBuckets[0].name : 'your active goal'}**!\n\nWould you like to try running this query again in a bit when the AI capacity is back? We can also save money with simple categorization rules in the settings.`,
      suggestedRules: [],
      suggestedTags: [],
      suggestedCategories: [],
      habitTips: [],
      suggestedBudgets: []
    };
  }
}
