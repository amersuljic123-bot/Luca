import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
  User,
} from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  UserProfile,
  Transaction,
  CategorizationRule,
  Screenshot,
  SavingsAccount,
  SavingsBucket,
  MerchantMetadata,
  SavingsBucketConfig,
  HabitTip,
  SmartReminder,
} from "./types";
import {
  getBudgetPeriod,
  getTransactions,
  getRules,
  saveRule,
  deleteRule,
  reapplyRules,
  clearAllData,
  clearAllTransactionsOnly,
  clearTransactionsForPeriod,
  deleteTransaction,
  updateTransaction,
  saveTransaction,
  updateRule,
  removeCategory,
  matchesAnyCustomRule,
  COMMON_CATEGORIES,
  COMMON_TAGS,
  applyRules,
  suggestTagsForMerchant,
  saveScreenshot,
  getScreenshots,
  deleteScreenshot,
  getCategories,
  addCategory,
  getSavingsAccounts,
  saveSavingsAccount,
  deleteSavingsAccount,
  getMerchantMetadata,
  saveMerchantMetadata,
  getUserProfile,
  updateUserProfile,
  getAllTransactions,
} from "./services/transactionService";
import {
  extractTransactionsFromScreenshot,
  generateInsights,
  analyzeRoutine,
  generateBucketInsight,
} from "./services/geminiService";
import { cn, formatCurrency, parseAmount } from "./lib/utils";
import {
  Wallet,
  Plus,
  Upload,
  LogOut,
  Settings,
  ChevronRight,
  ChevronLeft,
  Loader2,
  PieChart,
  Home,
  BarChart3,
  History,
  Filter,
  Tag,
  Trash2,
  Edit2,
  Edit3,
  X,
  Target,
  ShoppingBasket,
  Fuel,
  Utensils,
  Coffee,
  Pizza,
  CreditCard,
  ShoppingBag,
  Tv,
  FileText,
  Train,
  Banknote,
  RefreshCw,
  Flame,
  Sparkles,
  Image as ImageIcon,
  PlusCircle,
  ChevronDown,
  Truck,
  ArrowRight,
  AlertCircle,
  ArrowRightLeft,
  Download,
  Clock,
  ChevronUp,
  Search,
  Check,
  Car,
  Plane,
  Laptop,
  Smartphone,
  GraduationCap,
  Baby,
  Gift,
  Dumbbell,
  Bell,
  Heart,
  Music,
  Map,
  Camera,
  Book,
  Gamepad,
  Bus,
  Palmtree,
  Tent,
  Scissors,
  Percent,
  TrendingUp,
  Landmark,
  Repeat,
  Croissant,
  Cookie,
  Wine,
  Beer,
  PartyPopper,
  Shirt,
  Palette,
  Ticket,
  Mic,
  Activity,
  Wrench,
  Hammer,
  PlayCircle,
  Pill,
  Stethoscope,
  Dog,
  Cat,
  Briefcase,
  Watch,
  Armchair,
  Paintbrush,
  Lightbulb,
  Wifi,
  Cloud,
  Plug,
  Bike,
  Smile,
  Star,
  Glasses,
  Umbrella
} from "lucide-react";
import JSZip from "jszip";
import { format, addMonths, subMonths } from "date-fns";
import { useDropzone } from "react-dropzone";
import { 
  DndContext, 
  DragOverlay, 
  useDraggable, 
  useDroppable,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

export const ICON_LIBRARY: Record<string, any> = {
  ShoppingBasket, Fuel, Utensils, Coffee, Pizza, CreditCard, ShoppingBag, Tv, FileText, 
  Train, Truck, Car, Plane, Laptop, Smartphone, GraduationCap, Baby, Gift, Dumbbell, 
  Bell, Heart, Music, Map, Camera, Book, Gamepad, Bus, Palmtree, Tent, Scissors, Tag, Target,
  Percent, TrendingUp, Landmark, Repeat, Croissant, Cookie, Wine, Beer, PartyPopper, Shirt,
  Palette, Ticket, Mic, Activity, Wrench, Hammer, PlayCircle, ArrowRightLeft,
  Pill, Stethoscope, Dog, Cat, Briefcase, Watch, Armchair, Home, Paintbrush, Lightbulb,
  Wifi, Cloud, Plug, Bike, Smile, Star, Glasses, Umbrella
};

const CATEGORY_ICONS: Record<string, any> = {
  Groceries: ShoppingBasket,
  Fuel: Fuel,
  "Eating Out": Utensils,
  Coffee: Coffee,
  "Fast Food": Pizza,
  "Food Delivery": Truck,
  Subscriptions: CreditCard,
  Shopping: ShoppingBag,
  Entertainment: Tv,
  Bills: FileText,
  Transport: Train,
  "Excluded": AlertCircle,
  Income: Banknote,
  "Internal Transfers": ArrowRightLeft,
  "Transfers": ArrowRightLeft,
  "Interest": Percent,
  "Snacks": Cookie,
  "Drinks": Beer,
  "Wine": Wine,
  "Party": PartyPopper,
  "Clothes": Shirt,
  "Clothes Shopping": Shirt,
  "Hobby Spend": Palette,
  "Hobbies": Palette,
  "Concert Tickets": Ticket,
  "Tickets": Ticket,
  "Gym": Dumbbell,
  "Maintenance": Wrench,
  "Make up": Sparkles,
  "Beauty": Scissors,
  "Pharmacy": Pill,
  "Health": Stethoscope,
  "Pets": Dog,
  "Pet Care": Dog,
  "Business": Briefcase,
  "House": Home,
  "Tech": Laptop,
  "Gaming": Gamepad,
  "Music": Music,
  "Books": Book,
  "Holiday": Palmtree,
  "Travel": Plane
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; iconBg: string }> = {
  "Groceries": { bg: "bg-red-50", text: "text-red-600", iconBg: "bg-red-100" },
  "Eating Out": { bg: "bg-orange-50", text: "text-orange-600", iconBg: "bg-orange-100" },
  "Fast Food": { bg: "bg-amber-50", text: "text-amber-600", iconBg: "bg-amber-100" },
  "Coffee": { bg: "bg-amber-50", text: "text-amber-700", iconBg: "bg-amber-100" },
  "Transport": { bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-100" },
  "Shopping": { bg: "bg-purple-50", text: "text-purple-600", iconBg: "bg-purple-100" },
  "Entertainment": { bg: "bg-pink-50", text: "text-pink-600", iconBg: "bg-pink-100" },
  "Bills": { bg: "bg-indigo-50", text: "text-indigo-600", iconBg: "bg-indigo-100" },
  "Housing": { bg: "bg-slate-100", text: "text-slate-600", iconBg: "bg-slate-200" },
  "House": { bg: "bg-slate-100", text: "text-slate-600", iconBg: "bg-slate-200" },
  "Health": { bg: "bg-emerald-50", text: "text-emerald-600", iconBg: "bg-emerald-100" },
  "Pharmacy": { bg: "bg-emerald-50", text: "text-emerald-600", iconBg: "bg-emerald-100" },
  "Subscriptions": { bg: "bg-indigo-50", text: "text-indigo-600", iconBg: "bg-indigo-100" },
  "Income": { bg: "bg-green-50", text: "text-green-600", iconBg: "bg-green-100" },
  "Savings & Investments": { bg: "bg-emerald-50", text: "text-emerald-600", iconBg: "bg-emerald-100" },
  "Clothes": { bg: "bg-pink-50", text: "text-pink-600", iconBg: "bg-pink-100" },
  "Clothes Shopping": { bg: "bg-pink-50", text: "text-pink-600", iconBg: "bg-pink-100" },
  "Tech": { bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-100" },
  "Pets": { bg: "bg-amber-50", text: "text-amber-600", iconBg: "bg-amber-100" },
  "Pet Care": { bg: "bg-amber-50", text: "text-amber-600", iconBg: "bg-amber-100" },
  "Travel": { bg: "bg-cyan-50", text: "text-cyan-600", iconBg: "bg-cyan-100" },
  "Holiday": { bg: "bg-cyan-50", text: "text-cyan-600", iconBg: "bg-cyan-100" },
  "Maintenance": { bg: "bg-slate-50", text: "text-slate-600", iconBg: "bg-slate-200" },
  "Uncategorised": { bg: "bg-slate-50", text: "text-slate-400", iconBg: "bg-slate-100" },
};

export const AVAILABLE_COLOR_PALETTES: Record<string, { bg: string; text: string; iconBg: string }> = {
  red: { bg: "bg-red-50", text: "text-red-600", iconBg: "bg-red-100" },
  orange: { bg: "bg-orange-50", text: "text-orange-600", iconBg: "bg-orange-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", iconBg: "bg-amber-100" },
  yellow: { bg: "bg-yellow-50", text: "text-yellow-700", iconBg: "bg-yellow-105" },
  lime: { bg: "bg-lime-50", text: "text-lime-700", iconBg: "bg-lime-100" },
  green: { bg: "bg-green-50", text: "text-green-600", iconBg: "bg-green-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", iconBg: "bg-emerald-100" },
  teal: { bg: "bg-teal-50", text: "text-teal-600", iconBg: "bg-teal-100" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-600", iconBg: "bg-cyan-100" },
  sky: { bg: "bg-sky-50", text: "text-sky-600", iconBg: "bg-sky-100" },
  blue: { bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-100" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", iconBg: "bg-indigo-100" },
  violet: { bg: "bg-violet-50", text: "text-violet-600", iconBg: "bg-violet-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", iconBg: "bg-purple-100" },
  fuchsia: { bg: "bg-fuchsia-50", text: "text-fuchsia-600", iconBg: "bg-fuchsia-100" },
  pink: { bg: "bg-pink-50", text: "text-pink-600", iconBg: "bg-pink-100" },
  rose: { bg: "bg-rose-50", text: "text-rose-600", iconBg: "bg-rose-100" },
  slate: { bg: "bg-slate-50", text: "text-slate-600", iconBg: "bg-slate-200" },
  stone: { bg: "bg-stone-50", text: "text-stone-600", iconBg: "bg-stone-200" },
};

export const getCategoryColorComponent = (cat: string | undefined, profile?: UserProfile | null) => {
  if (!cat) return CATEGORY_COLORS["Uncategorised"];
  if (profile?.categoryColors?.[cat] && AVAILABLE_COLOR_PALETTES[profile.categoryColors[cat]]) {
    return AVAILABLE_COLOR_PALETTES[profile.categoryColors[cat]];
  }
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS["Uncategorised"];
};

export const getCategoryIconComponent = (cat: string | undefined, profile?: UserProfile | null) => {
  if (!cat) return Tag;
  if (profile?.categoryIcons?.[cat] && ICON_LIBRARY[profile.categoryIcons[cat]]) {
    return ICON_LIBRARY[profile.categoryIcons[cat]];
  }
  return CATEGORY_ICONS[cat] || Tag;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const currentAmount = data.amount;
    const prevAmount = data.prevAmount;
    const isCompareValid = prevAmount !== undefined && prevAmount !== null;
    const diff = currentAmount !== null && currentAmount !== undefined ? currentAmount - prevAmount : null;
    const isSaving = diff !== null && diff <= 0;

    return (
      <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-100/80 shadow-xl shadow-slate-200/30 flex flex-col gap-1.5 w-[210px] min-w-[210px] max-w-[210px] text-left select-none pointer-events-none animate-fade-in">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">
            {data.dateFormatted}
          </p>
          {currentAmount !== null && currentAmount !== undefined ? (
            <p className="text-lg font-black text-indigo-600 tracking-tight">
              {formatCurrency(currentAmount)}
            </p>
          ) : (
            <p className="text-xs font-bold text-slate-400 italic">No spend yet</p>
          )}
        </div>

        {isCompareValid && (
          <div className="border-t border-slate-100/80 pt-1.5 mt-1 space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
              <span>Same day last month:</span>
              <span className="font-bold text-slate-800">{formatCurrency(prevAmount)}</span>
            </div>
            {currentAmount !== null && currentAmount !== undefined && (
              <div className="flex justify-between items-center text-[10px]">
                <span>Vs. last month:</span>
                <span className={cn(
                  "font-bold uppercase tracking-wider text-[8px] px-1.5 py-0.5 rounded-md",
                  isSaving ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {isSaving ? "▼" : "▲"} {formatCurrency(Math.abs(diff))}
                </span>
              </div>
            )}
          </div>
        )}

        {currentAmount !== null && currentAmount !== undefined && data.dailyAmount > 0 && (
          <div className="border-t border-slate-100/80 pt-1.5 mt-1">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Daily Spend</span>
              <span className="text-[10px] font-bold text-slate-800">{formatCurrency(data.dailyAmount)}</span>
            </div>
            {data.topCategories && data.topCategories.length > 0 && (
              <div className="flex flex-col gap-1 mt-1">
                {data.topCategories.slice(0, 2).map((c: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-[9px] text-slate-500">
                    <span className="truncate max-w-[90px]">{c.name}</span>
                    <span className="font-semibold text-slate-600">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};

const SpendingChart = ({ 
  data, 
  isSaving, 
  badgePrevVal, 
  badgePrevLabel 
}: { 
  data: any[]; 
  isSaving: boolean; 
  badgePrevVal: number; 
  badgePrevLabel: string;
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
  const [clickedPoint, setClickedPoint] = useState<any | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Cross-platform custom state bridge synced with Recharts tooltips
  const TooltipBridge = ({ active, payload }: any) => {
    React.useEffect(() => {
      if (active && payload && payload.length) {
        setHoveredPoint(payload[0].payload);
      } else {
        setHoveredPoint(null);
      }
    }, [active, payload]);
    return null;
  };

  const activePoint = hoveredPoint || clickedPoint;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setClickedPoint(null);
        setHoveredPoint(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside, { passive: true });
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col w-full outline-none focus:outline-none">
      <div 
        className="relative h-44 w-full mt-4 outline-none focus:outline-none select-none"
        onClick={() => {
          if (hoveredPoint) {
            setClickedPoint(hoveredPoint);
          }
        }}
      >
        <ResponsiveContainer width="100%" height="100%" className="outline-none">
          <AreaChart 
            data={data} 
            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
            className="outline-none"
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length) {
                setClickedPoint(state.activePayload[0].payload);
              }
            }}
          >
            <defs>
              <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.12}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#cbd5e1" stopOpacity={0.08}/>
                <stop offset="95%" stopColor="#cbd5e1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              content={<TooltipBridge />} 
              cursor={{ stroke: '#e2e8f0', strokeWidth: 1.5, strokeDasharray: '4 4' }} 
            />
            {/* Last month's reference line (light silver-gray) */}
            <Area 
              type="monotone" 
              dataKey="prevAmount" 
              stroke="#cbd5e1" 
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorPrev)"
              dot={false}
              activeDot={false}
            />
            {/* Current month's bold spending area */}
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke="#a855f7" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorSpend)" 
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#a855f7', fill: '#ffffff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <AnimatePresence>
        {activePoint && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden w-full shrink-0"
          >
            {(() => {
              const currentAmount = activePoint.amount;
              const prevAmount = activePoint.prevAmount;
              const isCompareValid = prevAmount !== undefined && prevAmount !== null;
              const diff = currentAmount !== null && currentAmount !== undefined ? currentAmount - prevAmount : null;
              const isSavingPoint = diff !== null && diff <= 0;

              return (
                <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 select-none relative pr-10">
                  {/* Pinned Card Close Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setClickedPoint(null);
                      setHoveredPoint(null);
                    }}
                    className="absolute top-3.5 right-3.5 p-1 bg-slate-200/50 hover:bg-slate-200 text-slate-500 rounded-full transition-all hover:scale-105 active:scale-95 z-10"
                    aria-label="Close details"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.12em]">
                      {activePoint.dateFormatted}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-slate-950 tracking-tight">
                        {currentAmount !== null && currentAmount !== undefined ? formatCurrency(currentAmount) : "No spend yet"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">cumulative</span>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end justify-center gap-1 border-t md:border-t-0 border-slate-200/40 pt-2 md:pt-0">
                    {isCompareValid && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-medium">
                          Same day last month: <strong className="text-slate-800 font-semibold">{formatCurrency(prevAmount)}</strong>
                        </span>
                        {currentAmount !== null && currentAmount !== undefined && (
                          <span className={cn(
                            "font-black tracking-widest text-[8px] uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 border",
                            isSavingPoint 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" 
                              : "bg-rose-50 text-rose-600 border-rose-100/50"
                          )}>
                            {isSavingPoint ? "▼" : "▲"} {formatCurrency(Math.abs(diff))}
                          </span>
                        )}
                      </div>
                    )}
                    {currentAmount !== null && currentAmount !== undefined && activePoint.dailyAmount > 0 && (
                      <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-1.5">
                        <span>Daily spend on this day: <strong className="text-slate-800 font-semibold">{formatCurrency(activePoint.dailyAmount)}</strong></span>
                        {activePoint.topCategories && activePoint.topCategories.length > 0 && (
                          <div className="flex gap-1 items-center">
                            {activePoint.topCategories.slice(0, 1).map((c: any, i: number) => (
                              <span key={i} className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider max-w-[90px] truncate border border-indigo-100/40">
                                {c.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ScreenshotCard = React.memo(({ 
  snap, 
  transactions, 
  categories, 
  onDelete, 
  onEditTx, 
  onAddTxToSnap,
  onSelect,
  onConsolidate,
  onBulkTag
}: {
  snap: Screenshot;
  transactions: Transaction[];
  categories: string[];
  onDelete: (id: string) => void;
  onEditTx: (tx: Transaction) => void;
  onAddTxToSnap: () => void;
  onSelect: () => void;
  onConsolidate: () => void;
  onBulkTag: (cat: string) => void;
}) => {
  const snapTxs = transactions.filter(t => t.screenshotId === snap.id);

  const categoryTotals = snapTxs.reduce((acc, tx) => {
    const cat = tx.category || 'Uncategorised';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += getSignedAmount(tx);
    return acc;
  }, {} as Record<string, number>);
  
  const netTotal = Math.round(snapTxs.reduce((sum, tx) => sum + getSignedAmount(tx), 0) * 100) / 100;
  
  const moneyIn = snapTxs.reduce((sum, tx) => {
    const amt = getSignedAmount(tx);
    return amt > 0 ? sum + amt : sum;
  }, 0);
  
  const moneyOut = snapTxs.reduce((sum, tx) => {
    const amt = getSignedAmount(tx);
    return amt < 0 ? sum + Math.abs(amt) : sum;
  }, 0);
  
  // Tracking Total (Cycle Impact)
  const trackingTotal = Math.round(snapTxs.reduce((sum, tx) => {
    if (isTrackingExpense(tx)) return sum - Math.abs(getSignedAmount(tx));
    if (isTrackingIncome(tx)) return sum + Math.abs(getSignedAmount(tx));
    return sum;
  }, 0) * 100) / 100;


  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
      <div className="group relative h-48 bg-slate-100 cursor-pointer" onClick={onSelect}>
        <img
          src={snap.base64}
          alt={snap.name}
          className="w-full h-full object-cover mix-blend-multiply"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (snap.id) onDelete(snap.id);
            }}
            className="self-end p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="text-[10px] font-bold text-white uppercase tracking-wider bg-black/20 p-2 rounded backdrop-blur-sm self-start">
            {format(new Date(snap.createdAt), "MMM d, h:mm a")}
          </div>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-3 min-h-[200px]">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Extracted ({snapTxs.length})
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddTxToSnap();
              }}
              className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
              title="Manually add transaction to this snap"
            >
              <Plus className="w-3 h-3" />
            </button>
            {snap.balance !== undefined && (
              <div className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                Bal: {formatCurrency(snap.balance)}
              </div>
            )}
          </div>
        </div>
        {snapTxs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic">
            No transactions extracted
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-60 pr-1 mb-2">
            {snapTxs.map(tx => (
              <div
                key={tx.id}
                onClick={() => onEditTx(tx)}
                className="flex justify-between items-center text-sm p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl cursor-pointer transition-colors"
              >
                <div className="flex flex-col flex-1 min-w-0 pr-2">
                  <span className="font-bold text-slate-700 truncate">{tx.merchant}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{tx.category}</span>
                </div>
                <span className={cn("font-bold", getSignedAmount(tx) >= 0 ? 'text-emerald-500' : 'text-slate-700')}>
                  {getSignedAmount(tx) >= 0 ? '+' : '-'}{formatCurrency(Math.abs(getSignedAmount(tx)))}
                </span>
              </div>
            ))}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100/50">
                  <div className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Inflow</div>
                  <div className="text-xs font-bold text-emerald-700">+{formatCurrency(moneyIn)}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Outflow</div>
                  <div className="text-xs font-bold text-slate-700">-{formatCurrency(moneyOut)}</div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col gap-1 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-800 font-bold uppercase tracking-wider text-[10px]">Total Captured flow</span>
                  <span className={cn("font-black text-[11px]", netTotal >= 0 ? "text-emerald-600" : "text-slate-900")}>
                    {netTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netTotal))}
                  </span>
                </div>
                {Object.entries(categoryTotals).map(([cat, total]) => (
                <div key={cat} className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">{cat}</span>
                  <span className={cn("font-bold", total >= 0 ? "text-emerald-500" : "text-slate-700")}>
                    {total >= 0 ? '+' : '-'}{formatCurrency(Math.abs(total))}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                <div className="flex flex-col">
                  <span className="text-slate-800 font-bold uppercase tracking-wider text-[10px]">Net Extracted Flow</span>
                  {Math.abs(trackingTotal) > 0.01 && (
                    <span className="text-slate-400 text-[8px] uppercase tracking-tighter">
                      Budget Impact: {trackingTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(trackingTotal))}
                    </span>
                  )}
                </div>
                <span className={cn("font-bold text-sm", netTotal >= 0 ? "text-emerald-500" : "text-slate-900")}>
                  {netTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netTotal))}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {snapTxs.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 mt-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConsolidate();
              }}
              className="flex-1 py-3 text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors whitespace-nowrap"
            >
              Group as Balance
            </button>
            <div className="relative flex-1">
              <select
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const newCat = e.target.value;
                  if (newCat) onBulkTag(newCat);
                  e.target.value = "";
                }}
                className="w-full pl-3 pr-8 py-3 text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer outline-none text-center appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%234f46e5%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:calc(100%-8px)_center] bg-no-repeat"
              >
                <option value="">Bulk Tag...</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const LucaLogo = ({ className = "", iconOnly = false }: { className?: string, iconOnly?: boolean }) => (
  <div className={cn("flex items-center gap-3", !iconOnly && "w-auto", className)}>
    <div className={cn("relative flex items-center justify-center", iconOnly ? "w-full h-full" : "w-10 h-10")}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* L-Axis axis */}
        <path
          d="M30 20V72Q30 80 38 80H90"
          stroke="#6F2CF3"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Teal Graph Line */}
        <path
          d="M42 70L55 52L68 62L82 32"
          stroke="#00EDC2"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Teal Nodes */}
        <circle cx="42" cy="70" r="4" fill="#00EDC2" />
        <circle cx="55" cy="52" r="4" fill="#00EDC2" />
        <circle cx="68" cy="62" r="4" fill="#00EDC2" />
        <circle cx="82" cy="32" r="4" fill="#00EDC2" />
      </svg>
    </div>
    {!iconOnly && (
      <div className="flex flex-col">
        <span className="font-black text-2xl tracking-[0.3em] uppercase text-[#6F2CF3] leading-none">Luca</span>
        <span className="text-[6px] font-bold text-slate-500 uppercase tracking-[0.15em] mt-1 whitespace-nowrap">Smart Financial Insight</span>
      </div>
    )}
  </div>
);

const isMetaData = (t: Transaction) => {
  const m = (t.merchant || "").toLowerCase().trim();
  const c = (t.category || "").toLowerCase().trim();
  
  // Basic exclusions for structural rows
  if (!m || m === "total" || m === "balance" || m === "net position" || m === "amount" || m === "date" || m === "merchant") return true;
  
  // OCR often picks up headers or summary totals. Only filter exact matches or very specific patterns.
  if (m === "total income" || m === "total expense" || m === "total spent" || m === "total received") return true;
  if (m === "account summary" || m === "statement summary" || m === "closing balance" || m === "opening balance") return true;
  if (m === "balance forward" || m === "carried forward" || m === "balance b/f" || m === "balance c/f") return true;
  if (m === "statement total" || m === "grand total" || m === "subtotal") return true;

  // Don't filter if it looks like a real transaction amount line (e.g. just a number)
  // but do filter if it's exactly the words "Total" or "Balance" without context
  if (m === "total" || m === "balance" || m === "net position" || m === "amount" || m === "date" || m === "merchant") return true;

  // Pattern match for purely numerical merchants that look like structural totals (usually at start/end of pages)
  // We only filter if it's very likely junk, not just any amount.
  if (m === "0.00" || m === "") return true;

  if (m.includes("summary") || c.includes("summary")) return true;
  
  return false;
};

const isInternalTransfer = (t: Transaction) => {
  const m = (t.merchant || "").toLowerCase();
  const c = (t.category || "").toLowerCase();
  
  // Standard markers for moves between user's own accounts
  const isInternalMerchant = m.includes("amer suljic") || 
                             m.includes("between accounts") || 
                             m.includes("to account") || 
                             m.includes("from account") || 
                             m.includes("internal transfer") ||
                             m.includes("to pot") ||
                             m.includes("from pot");

  const isTransferCategory = c === "transfer" || c === "pots" || c === "savings";
  
  return isTransferCategory && isInternalMerchant;
};
export const getSignedAmount = (tx: Partial<Transaction>) => {
  const rawAmt = parseAmount(tx.amount);
  const amt = Math.abs(rawAmt);
  const m = (tx.merchant || "").toLowerCase();
  const c = (tx.category || "").toLowerCase();
  
  // 1. Explicit types
  if (tx.type === 'income') return amt;
  if (tx.type === 'expense') return -amt;

  // 2. Trust the negative sign if it exists (highly reliable)
  if (rawAmt < 0) return rawAmt;

  // 3. Keywords for Inflow/Income
  const incomeKeywords = [
    'salary', 'interest', 'refund', 'credit', 'received', 'deposit', 
    'money in', 'inward', 'incoming', 'suljic', 'paid in', 'transfer from',
    'from pot', 'from account', 'to current', 'to main', 'credit'
  ];

  const isIncome = c.includes('income') || 
                   incomeKeywords.some(k => m.includes(k) || c.includes(k)) ||
                   m.includes('transfer from') || m.includes('incoming');

  if (isIncome) return amt;

  // 4. Default for Transfers - if they are positive and not confirmed income, 
  // but in "Pots/Savings", let's keep them positive as inflow markers if the merchant doesn't sound like a purchase.
  if ((c === 'transfer' || c === 'pots' || c === 'savings' || c === 'income') && rawAmt > 0) {
    // If it's "To Savings" or "To Pot" or has "To" but in savings category, it's usually an expense from the bank's perspective
    if (m.includes('to ') || m.includes('save')) return -amt;
    return amt;
  }

  // 5. Default to expense if it's positive but doesn't look like income (Safety for receipts)
  // Check common purchase categories
  const expenseCategories = ['food', 'shopping', 'transport', 'entertainment', 'bills', 'health', 'travel', 'grocery'];
  if (expenseCategories.some(cat => c.includes(cat))) return -amt;

  // If it's a known merchant, it's an expense
  const expenseMerchants = ['starbucks', 'amazon', 'tesco', 'sainsbury', 'asda', 'uber', 'deliveroo', 'netflix', 'spotify', 'apple', 'google', 'mcdonald'];
  if (expenseMerchants.some(em => m.includes(em))) return -amt;

  // If it's large and positive and we don't know what it is, BUT it's not a common merchant name pattern
  // (e.g. "Tesco 1234" vs "Transfer from X")
  if (rawAmt > 100 && !m.includes(' ')) return amt; 
  if (rawAmt > 0 && (m.includes('transfer') || m.includes('from') || m.includes('incoming'))) return amt;

  // If it's literally just a number and positive, likely a bank entry
  if (rawAmt > 0 && /^\d+$/.test(m)) return amt;

  return -amt;
};

export const getBucketIcon = (bucketName: string) => {
  const name = bucketName.toLowerCase();
  if (name.includes("car") || name.includes("vehicle") || name.includes("auto") || name.includes("bike")) return Car;
  if (name.includes("holiday") || name.includes("trip") || name.includes("flight") || name.includes("japan") || name.includes("paris") || name.includes("iceland") || name.includes("travel")) return Plane;
  if (name.includes("laptop") || name.includes("pc") || name.includes("computer") || name.includes("mac")) return Laptop;
  if (name.includes("phone") || name.includes("iphone")) return Smartphone;
  if (name.includes("school") || name.includes("uni") || name.includes("college") || name.includes("course") || name.includes("learn")) return GraduationCap;
  if (name.includes("baby") || name.includes("kid")) return Baby;
  if (name.includes("gift") || name.includes("present") || name.includes("christmas") || name.includes("birthday")) return Gift;
  if (name.includes("gym") || name.includes("fitness") || name.includes("health")) return Dumbbell;
  if (name.includes("home") || name.includes("house") || name.includes("mortgage") || name.includes("rent")) return Home;
  return Wallet;
};

export const getSavingsImpact = (tx: Partial<Transaction>) => {
  const m = (tx.merchant || "").toLowerCase();
  const globalSigned = getSignedAmount(tx);

  // Constants for positive impact (increasing savings balance)
  const isInterest = m.includes("interest");
  const isAdjustment = m.includes("adjustment") || m.includes("balance correction") || m.includes("opening balance") || m.includes("closing balance");
  const isDepositShortcut = m.includes("deposit") || m.includes("to sav");

  // Constants for negative impact (decreasing savings balance)
  const isWithdrawalShortcut = m.includes("withdraw") || m.includes("from sav");

  // Handle explicit overrides first
  if (isInterest || isAdjustment || isDepositShortcut) return Math.abs(globalSigned);
  if (isWithdrawalShortcut) return -Math.abs(globalSigned);

  // Logical inference based on bank transaction type:
  // If money is an INCOME to the main bank, it was likely TAKEN OUT of savings (Withdrawal)
  if (tx.type === 'income') {
    return -Math.abs(globalSigned);
  }

  // If money is an EXPENSE from the main bank, it was likely PUT INTO savings (Deposit)
  if (tx.type === 'expense') {
    return Math.abs(globalSigned);
  }

  // Fallback: reverse of bank movement (expense -> +, income -> -)
  return globalSigned * -1;
};

const isTrackingExpense = (t: Transaction) => {
  if (isMetaData(t)) return false;
  return getSignedAmount(t) < 0;
};

const isTrackingIncome = (t: Transaction) => {
  if (isMetaData(t)) return false;
  return getSignedAmount(t) > 0;
};

const DroppableBucket = ({ bucketName, isUncategorised, children, activeBuckets, onDrop }: any) => {
  const { isOver, setNodeRef } = useDroppable({
    id: isUncategorised ? "unallocated" : bucketName,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 flex flex-col transition-all",
        isOver && "ring-2 ring-indigo-200 scale-[1.02]"
      )}
    >
      {children}
    </div>
  );
};

const DraggableTransaction = ({ tx, children }: any) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tx.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-50 z-[200] scale-105 shadow-xl")}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
};

const MerchantLogo = ({ merchant, category, className, iconClassName, getMerchantLogo, isNeg, profile }: any) => {
  const [error, setError] = useState(false);
  const logo = getMerchantLogo ? getMerchantLogo(merchant) : null;
  const Icon = getCategoryIconComponent(category, profile);

  if (logo && !error) {
    return (
      <img
        src={logo}
        className={cn("object-cover", className)}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
      />
    );
  }

  const catColorObj = getCategoryColorComponent(category, profile);
  const catColorText = category ? catColorObj.text : (isNeg ? "text-slate-400" : "text-emerald-500");
  return <Icon className={cn(iconClassName || className, catColorText)} />;
};

const TransactionRow = ({ tx, onClick, formatCurrency, getSignedAmount, getMerchantLogo, profile, onTagClick, filterTag }: any) => {
  const isNeg = getSignedAmount(tx) < 0;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-6 bg-white hover:bg-slate-50 transition-colors cursor-pointer group flex items-center justify-between"
      onClick={onClick}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1 mr-3">
        <div className="w-12 h-12 flex items-center justify-center relative shrink-0">
          <MerchantLogo 
            merchant={tx.merchant} 
            category={tx.category} 
            className="w-full h-full rounded-2.5xl object-cover" 
            iconClassName="w-7 h-7"
            getMerchantLogo={getMerchantLogo} 
            isNeg={isNeg}
            profile={profile}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="text-sm font-black text-slate-900 tracking-tight truncate">{tx.merchant}</div>
            {tx.receiptBase64 && (
              <div title="Receipt attached" className="p-1 bg-indigo-50 rounded-md shrink-0">
                <FileText className="w-3 h-3 text-indigo-500" />
              </div>
            )}
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
            {tx.category} • {format(new Date(tx.date), "MMM d, h:mm a")}
          </div>
          {tx.tags && tx.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 xs:gap-1.5 sm:gap-1 mt-1.5" title={tx.tags.join(', ')}>
              {tx.tags.slice(0, 2).map((tag: string) => (
                <span 
                  key={tag} 
                  className={cn(
                    "relative text-[9px] sm:text-[8px] font-bold px-2.5 py-1.5 xs:px-2 xs:py-1 sm:px-1.5 sm:py-0.5 rounded-md uppercase tracking-wider transition-colors cursor-pointer before:absolute before:-inset-2.5",
                    filterTag === tag 
                      ? "bg-rose-100 text-rose-600 hover:bg-rose-200" 
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onTagClick) onTagClick(tag);
                  }}
                >
                  {tag}
                </span>
              ))}
              {tx.tags.length > 2 && (
                <span className="text-[9px] sm:text-[8px] font-bold text-slate-400">+{tx.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={cn("text-lg font-black tracking-tighter", isNeg ? "text-slate-900" : "text-emerald-600")}>
          {isNeg ? '-' : '+'}{formatCurrency(Math.abs(getSignedAmount(tx)))}
        </div>
      </div>
    </motion.div>
  );
};

const RuleManager = ({ rules, onUpdate, formatCurrency }: any) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
      {rules.map((rule: any) => (
        <div key={rule.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 group">
          <div className="flex justify-between items-start mb-6">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
                 <Tag className="w-5 h-5 text-indigo-600" />
               </div>
               <div>
                 <h4 className="font-black text-slate-900 text-lg tracking-tight">{rule.pattern}</h4>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                   {rule.type === 'exact' ? 'Exact Match' : 'Keyword'}
                 </p>
               </div>
             </div>
             <button 
              onClick={async () => {
                if (confirm('Delete rule?')) {
                  await deleteRule(rule.id);
                  onUpdate();
                }
              }}
              className="p-3 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
             >
               <Trash2 className="w-4 h-4" />
             </button>
          </div>
          
          <div className="flex items-center justify-between pt-6 border-t border-slate-50">
            <div className="flex items-center gap-2">
               <ArrowRight className="w-4 h-4 text-slate-300" />
               <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{rule.targetCategory}</span>
            </div>
            {rule.amount && (
              <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{formatCurrency(rule.amount)}</span>
            )}
          </div>
        </div>
      ))}
      {rules.length === 0 && (
         <div className="col-span-full py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center">
            <Settings className="w-12 h-12 text-slate-200 mb-4" />
            <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No automation rules</p>
         </div>
      )}
    </div>
  );
};

const BucketInsight = ({ bucketConfig, totalSaved, monthlyTarget, streak }: { bucketConfig?: SavingsBucketConfig, totalSaved: number, monthlyTarget: number, streak: number }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!bucketConfig) return;
    let isMounted = true;
    setIsLoading(true);
    generateBucketInsight(bucketConfig, totalSaved, monthlyTarget, streak).then(res => {
      if (isMounted) {
        setInsight(res);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoading(false);
    });
    return () => { isMounted = false; };
  }, [bucketConfig, totalSaved, monthlyTarget, streak]);

  if (!insight && !isLoading) return null;

  return (
    <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
      <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        {isLoading ? (
           <div className="h-4 w-3/4 bg-indigo-100 animate-pulse rounded" />
        ) : (
           <p className="text-xs font-bold text-indigo-900 leading-relaxed">{insight}</p>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [promptedNameValue, setPromptedNameValue] = useState("");

  useEffect(() => {
    if (profile && profile.displayName && !promptedNameValue) {
      setPromptedNameValue(profile.displayName !== "User" ? profile.displayName : "");
    }
  }, [profile]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [merchantsMetadata, setMerchantsMetadata] = useState<
    MerchantMetadata[]
  >([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "history" | "rules" | "analytics" | "screenshots" | "savings" | "bills" | "export"
  >("dashboard");
  const [spendingView, setSpendingView] = useState<"spending" | "budget">("spending");
  const [breakdownView, setBreakdownView] = useState<"categories" | "merchants" | "transactions" | "tags">("categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(COMMON_CATEGORIES);
  const [insights, setInsights] = useState<string | null>(null);
  const [routineInsight, setRoutineInsight] = useState<string | null>(null);
  const [suggestedRules, setSuggestedRules] = useState<Partial<CategorizationRule>[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<{ transactionIds: string[], tag: string, reason: string }[]>([]);
  const [suggestedCategories, setSuggestedCategories] = useState<{ transactionIds: string[], category: string, reason: string }[]>([]);
  const [habitTips, setHabitTips] = useState<HabitTip[]>([]);
  const [suggestedBudgets, setSuggestedBudgets] = useState<{ targetType: "category"|"merchant"|"tag", targetId: string, amount: number, cycle: "daily"|"weekly"|"monthly", reason: string }[]>([]);
  const [isAnalysingRoutine, setIsAnalysingRoutine] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] =
    useState<Screenshot | null>(null);

  const [bulkUpdatePrompt, setBulkUpdatePrompt] = useState<{
    txId: string;
    merchant: string;
    newCat: string;
    allUpdates?: any;
    bulkUpdateCandidates: Transaction[];
    existingRule?: CategorizationRule;
    mode: "bulk" | "rule_only_update" | "rule_only_create" | null;
  } | null>(null);

  // Editing states
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [isEditingTransactionIcon, setIsEditingTransactionIcon] = useState(false);
  const [isEditingTxCategoryOpen, setIsEditingTxCategoryOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CategorizationRule | null>(
    null,
  );
  const [editingBucket, setEditingBucket] =
    useState<SavingsBucketConfig | null>(null);
  const [showBucketForm, setShowBucketForm] = useState(false);
  const [showMoveFunds, setShowMoveFunds] = useState(false);
  const [moveFundsData, setMoveFundsData] = useState({
    from: "",
    to: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: "Internal Transfer",
    isDetailed: false
  });
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategoryIcon, setEditingCategoryIcon] = useState<string | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [isEnteringNewTargetCat, setIsEnteringNewTargetCat] = useState(false);
  const [isEnteringNewMerchant, setIsEnteringNewMerchant] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [isEnteringNewTag, setIsEnteringNewTag] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [editingMerchant, setEditingMerchant] =
    useState<MerchantMetadata | null>(null);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [bulkPotTarget, setBulkPotTarget] = useState<{
    transactionIds: string[];
    category: string;
    onComplete?: () => void;
  } | null>(null);
  const [showManualTransaction, setShowManualTransaction] = useState(false);
  const [manualTx, setManualTx] = useState<any>({
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    merchant: "",
    amount: "0.00",
    category: "General",
    type: "expense",
    receiptBase64: undefined
  });

  const handleCreateManualTransaction = async () => {
    if (!manualTx.merchant || !manualTx.amount) return;
    setUploadStatus("Creating transaction...");
    try {
      await saveTransaction({
        ...manualTx,
        amount: parseAmount(manualTx.amount),
        createdAt: new Date().toISOString()
      });
      setShowManualTransaction(false);
      setManualTx({
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        merchant: "",
        amount: "0.00",
        category: "General",
        type: "expense",
        receiptBase64: undefined
      });
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setUploadStatus(null);
    }
  };

  const handleMoveFunds = async () => {
    if (!moveFundsData.amount || !moveFundsData.to) return;
    setUploadStatus("Moving funds...");
    try {
      const amt = parseFloat(moveFundsData.amount);
      const date = new Date(moveFundsData.date).toISOString();
      const notes = moveFundsData.notes || "Internal Transfer";
      const userUid = user?.uid || "";

      // 1. Withdrawal from SOURCE (if specified)
      // Moving money out of a savings pot acts as an INCOME to the main global ledger
      if (moveFundsData.from) {
        await saveTransaction({
          userId: userUid,
          date,
          amount: amt,
          merchant: `${notes} (From ${moveFundsData.from})`,
          category: "Savings & Investments",
          subCategory: moveFundsData.from === "Unallocated" ? undefined : moveFundsData.from,
          type: "income",
          rawText: `Internal move from ${moveFundsData.from}`,
          createdAt: new Date().toISOString()
        });
      }

      // 2. Deposit into TARGET
      // Moving money into a savings pot acts as an EXPENSE from the main global ledger
      await saveTransaction({
        userId: userUid,
        date,
        amount: amt,
        merchant: `${notes} (To ${moveFundsData.to})`,
        category: "Savings & Investments",
        subCategory: moveFundsData.to === "Unallocated" ? undefined : moveFundsData.to,
        type: "expense",
        rawText: `Internal move to ${moveFundsData.to}`,
        createdAt: new Date().toISOString()
      });

      await loadData();
      setShowMoveFunds(false);
      setMoveFundsData({
        from: "",
        to: "",
        amount: "",
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        notes: "Internal Transfer",
        isDetailed: false
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUploadStatus(null);
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragEndBucket = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const txId = active.id as string;
      const bucketName = over.id === "unallocated" ? null : over.id as string;
      await updateTransaction(txId, { subCategory: bucketName });
      loadData();
    }
  };

  const handleBulkCategoryChange = async (newCategory: string) => {
    if (!newCategory || selectedTxIds.size === 0) return;
    setUploadStatus(`Updating ${selectedTxIds.size} transactions...`);
    try {
      await Promise.all(
        Array.from(selectedTxIds).map((id) =>
          updateTransaction(id, { category: newCategory, subCategory: null }),
        ),
      );
      setSelectedTxIds(new Set());
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setUploadStatus("");
    }
  };

  const getMerchantLogo = useCallback((merchant: string) => {
    // Check for custom user-uploaded metadata first
    const custom = merchantsMetadata.find(
      (m) => m.merchantName.toLowerCase() === merchant.toLowerCase(),
    );
    if (custom?.customLogo) return custom.customLogo;

    // Basic mapping for common merchants to domains
    const domainMap: Record<string, string> = {
      deliveroo: "deliveroo.co.uk",
      uber: "uber.com",
      amazon: "amazon.co.uk",
      tesco: "tesco.com",
      sainsbury: "sainsburys.co.uk",
      pret: "pret.co.uk",
      starbucks: "starbucks.com",
      netflix: "netflix.com",
      spotify: "spotify.com",
      monzo: "monzo.com",
      chase: "chase.com",
      amex: "americanexpress.com",
      halifax: "halifax.co.uk",
      apple: "apple.com",
      google: "google.com",
      mcdonald: "mcdonalds.com",
      costa: "costacoffee.co.uk",
      shell: "shell.com",
      bp: "bp.com",
      asda: "asda.com",
      waitrose: "waitrose.com",
      morrison: "morrisons.com",
      aldi: "aldi.co.uk",
      lidl: "lidl.co.uk",
      "marks & spencer": "marksandspencer.com",
      "m&s": "marksandspencer.com",
      greggs: "greggs.co.uk",
      "just eat": "just-eat.co.uk",
      boots: "boots.com",
      argos: "argos.co.uk",
      ebay: "ebay.co.uk",
    };

    const lower = merchant.toLowerCase();
    for (const [key, domain] of Object.entries(domainMap)) {
      if (lower.includes(key)) return `https://logo.clearbit.com/${domain}`;
    }

    // Fallback attempt for any merchant name - cleaning up common prefixes/suffixes
    const cleaned = lower
      .replace(
        /stores|limited|ltd|retail|pfs|petrol|service station|uk|gb/g,
        "",
      )
      .trim()
      .split(" ")[0]
      .replace(/[^a-z0-9]/g, "");

    if (cleaned.length > 2) return `https://logo.clearbit.com/${cleaned}.com`;

    return null;
  }, [merchantsMetadata]);

  const [viewingBucketTxs, setViewingBucketTxs] = useState<{name: string, txs: Transaction[]} | null>(null);
  const [newTagInputValue, setNewTagInputValue] = useState("");

  // Filter State
  const [filterQuery, setFilterQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterWithReceipts, setFilterWithReceipts] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingCategoryIconFor, setEditingCategoryIconFor] = useState<string | null>(null);
  const emblemModalScrollRef = React.useRef<HTMLDivElement>(null);

  // Rule Form State
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState<{
    pattern: string;
    tagPattern?: string;
    type: "keyword" | "exact" | "tag";
    targetCategory: string;
    amount?: number | "";
    minAmount?: number | "";
    maxAmount?: number | "";
    daysOfWeek?: string[];
    startTime?: string;
    endTime?: string;
  }>({
    pattern: "",
    type: "exact",
    targetCategory: "",
    amount: "",
    minAmount: "",
    maxAmount: "",
    daysOfWeek: [],
    startTime: "",
    endTime: ""
  });

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, "users", u.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          const newProfile = {
            uid: u.uid,
            email: u.email!,
            displayName: u.displayName || "User",
            billingDay: 15,
            createdAt: new Date().toISOString(),
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user && profile) {
      loadData();
    }
  }, [user, profile, viewDate, isCustomPeriod, customStart, customEnd]);

  // Fetch screenshots only when the tab is active or forced
  useEffect(() => {
    if (user && activeTab === 'screenshots' && screenshots.length === 0) {
      loadData(true);
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (!editingTransaction) setIsEditingTransactionIcon(false);
  }, [editingTransaction]);

  const loadData = async (forceScreenshots = false) => {
    let start: Date;
    let end: Date;

    if (isCustomPeriod && customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
    } else {
      const period = getBudgetPeriod(viewDate, profile?.billingDay);
      start = period.start;
      end = period.end;
    }

    // Only fetch screenshots if explicitly requested or if the tab is active and they aren't loaded yet
    const shouldFetchScreenshots = forceScreenshots;

    const [txs, rls, snaps, cats, merts] = await Promise.all([
      getAllTransactions(),
      getRules(),
      shouldFetchScreenshots ? getScreenshots() : Promise.resolve(null),
      getCategories(),
      getMerchantMetadata(),
    ]);

    setTransactions(txs);
    setRules(rls);
    if (snaps !== null) setScreenshots(snaps);
    setCategories(cats);
    setMerchantsMetadata(merts);
  };

  const handleExportCsv = async () => {
    // Generate CSV from transactions
    const headers = [
      "Date",
      "Time",
      "Merchant",
      "Category",
      "Subcategory",
      "Amount",
      "Type",
      "Tags",
      "Screenshot ID",
      "Receipt Image Filename",
    ].join(",");

    const zip = new JSZip();
    const imagesFolder = zip.folder("images");

    const rows = filteredTransactions.map((tx, idx) => {
      const d = new Date(tx.date);
      let receiptFilename = "";
      
      if (tx.receiptBase64 && imagesFolder) {
        const base64Data = tx.receiptBase64.split(",")[1];
        if (base64Data) {
          // guess extension from mime type if needed, but default to jpg
          const mimeTypeMatch = tx.receiptBase64.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
          const ext = mimeTypeMatch ? (mimeTypeMatch[1] === 'jpeg' ? 'jpg' : mimeTypeMatch[1]) : 'jpg';
          receiptFilename = `receipt_${tx.id || idx}.${ext}`;
          imagesFolder.file(receiptFilename, base64Data, {base64: true});
        }
      } else if (tx.screenshotId && imagesFolder) {
        const snap = screenshots.find(s => s.id === tx.screenshotId);
        if (snap && snap.base64) {
          const base64Data = snap.base64.split(",")[1];
          if (base64Data) {
             const mimeTypeMatch = snap.base64.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
             const ext = mimeTypeMatch ? (mimeTypeMatch[1] === 'jpeg' ? 'jpg' : mimeTypeMatch[1]) : 'jpg';
             receiptFilename = `screenshot_${tx.screenshotId}.${ext}`;
             imagesFolder.file(receiptFilename, base64Data, {base64: true});
          }
        }
      }

      const row = [
        format(d, "yyyy-MM-dd"),
        format(d, "HH:mm:ss"),
        `"${tx.merchant.replace(/"/g, '""')}"`,
        `"${tx.category}"`,
        `"${tx.subCategory || ""}"`,
        tx.amount,
        tx.type || "expense",
        `"${tx.tags?.join("; ") || ""}"`,
        tx.screenshotId || "",
        receiptFilename,
      ];
      return row.join(",");
    });

    const csvContent = [headers, ...rows].join("\n");
    zip.file("transactions.csv", csvContent);

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    
    // Create an anchor point and trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_export_${format(new Date(), "yyyy_MM_dd")}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateInsights = async () => {
    if (transactions.length === 0) return;
    setActiveTab("dashboard");
    setIsGeneratingInsights(true);
    try {
      const text = await generateInsights(transactions);
      setInsights(text);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

    const handleApplySuggestedTag = async (transactionIds: string[], tag: string) => {
    setIsAnalysingRoutine(true);
    try {
      await Promise.all(transactionIds.map(async id => {
        const tx = transactions.find(t => t.id === id);
        if (tx && tx.id) {
          const newTags = Array.from(new Set([...(tx.tags || []), tag]));
          await updateTransaction(tx.id, { tags: newTags });
        }
      }));
      await loadData();
      setSuggestedTags(prev => prev.filter(p => p.tag !== tag));
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalysingRoutine(false);
    }
  };

  const handleApplySuggestedCategory = async (transactionIds: string[], category: string) => {
    setIsAnalysingRoutine(true);
    try {
      await Promise.all(transactionIds.map(async id => {
        const tx = transactions.find(t => t.id === id);
        if (tx && tx.id) {
          await updateTransaction(tx.id, { category });
        }
      }));
      await loadData();
      setSuggestedCategories(prev => prev.filter(p => p.category !== category));
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalysingRoutine(false);
    }
  };

  const handleAcceptHabitTip = async (tip: HabitTip) => {
    if (!profile) return;
    setIsAnalysingRoutine(true);
    try {
      const currentReminders = profile.reminders || [];
      const newReminders = [...currentReminders];

      if (tip.suggestedReminder) {
        newReminders.push({
          id: Date.now().toString(),
          title: tip.suggestedReminder.title || "Smart Reminder",
          message: tip.suggestedReminder.message || `Cut back to save for ${tip.relatedCategory}!`,
          timeOfDay: tip.suggestedReminder.timeOfDay || "12:00",
          daysOfWeek: tip.suggestedReminder.daysOfWeek,
          isActive: true
        });
      }

      await updateUserProfile({ reminders: newReminders });
      setProfile({ ...profile, reminders: newReminders });
      setHabitTips(prev => prev.filter(t => t.description !== tip.description));
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalysingRoutine(false);
    }
  };

  const handleAcceptSuggestedBudget = async (budget: any) => {
    if (!profile) return;
    setIsAnalysingRoutine(true);
    try {
      const currentBudgets = profile.budgets || [];
      const newBudgets = [...currentBudgets, { ...budget, id: Date.now().toString(), isActive: true, alertThresholdPercent: 80 }];
      await updateUserProfile({ budgets: newBudgets });
      setProfile({ ...profile, budgets: newBudgets });
      setSuggestedBudgets(prev => prev.filter(b => b.targetId !== budget.targetId));
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalysingRoutine(false);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!profile || !profile.reminders) return;
    try {
      const newReminders = profile.reminders.filter(r => r.id !== id);
      await updateUserProfile({ reminders: newReminders });
      setProfile({ ...profile, reminders: newReminders });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!profile || !profile.budgets) return;
    try {
      const newBudgets = profile.budgets.filter(b => b.id !== id);
      await updateUserProfile({ budgets: newBudgets });
      setProfile({ ...profile, budgets: newBudgets });
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplySuggestedRule = async (rule: Partial<CategorizationRule>) => {
    setIsAnalysingRoutine(true);
    try {
      const validTypes = ['exact', 'keyword', 'tag'];
      const safeType = rule.type && validTypes.includes(rule.type) ? rule.type : 'keyword';
      const safePattern = typeof rule.pattern === 'string' && rule.pattern.trim() ? rule.pattern : 'Pattern';
      const safeTargetCategory = typeof rule.targetCategory === 'string' && rule.targetCategory.trim() ? rule.targetCategory : 'Uncategorised';
      
      await saveRule({
        ...rule,
        pattern: safePattern,
        type: safeType as any,
        targetCategory: safeTargetCategory,
      });
      await loadData();
      setSuggestedRules(prev => prev.filter(p => p !== rule));
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalysingRoutine(false);
    }
  };

  const handleAnalyticQuery = async (queryText: string) => {
    setIsAnalysingRoutine(true);
    setSuggestedRules([]);
    setSuggestedTags([]);
    setSuggestedCategories([]);
    setHabitTips([]);
    setSuggestedBudgets([]);
    try {
      const allTx = await getAllTransactions();
      const result = await analyzeRoutine(allTx, profile?.savingsBucketsConfig || [], queryText);
      setRoutineInsight(result.insight);
      setSuggestedRules(result.suggestedRules || []);
      setSuggestedTags(result.suggestedTags || []);
      setSuggestedCategories(result.suggestedCategories || []);
      setHabitTips(result.habitTips || []);
      setSuggestedBudgets(result.suggestedBudgets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalysingRoutine(false);
    }
  };

  const handleDeleteScreenshot = async (id: string) => {
    setConfirmDialog({
      message: "Remove this screenshot?",
      onConfirm: async () => {
        await deleteScreenshot(id);
        loadData(true);
      }
    });
  };

  const [ruleConflictPrompt, setRuleConflictPrompt] =
    useState<CategorizationRule | null>(null);

  const handleCreateRule = async (
    e?: React.FormEvent,
    skipConflictCheck = false,
  ) => {
    if (e) e.preventDefault();
    if ((!newRule.pattern && !newRule.tagPattern) || !newRule.targetCategory)
      return;

    // Check for conflicting rules
    const conflictingRule = rules.find(
      (r) =>
        r.id !== editingRule?.id &&
        r.type === newRule.type &&
        (r.pattern || "").toLowerCase() ===
          (newRule.pattern || "").toLowerCase() &&
        (r.tagPattern || "").toLowerCase() ===
          (newRule.tagPattern || "").toLowerCase() &&
        (r.amount === undefined ? "" : r.amount) ===
          (newRule.amount === undefined ? "" : newRule.amount) &&
        (r.minAmount === undefined ? "" : r.minAmount) ===
          (newRule.minAmount === undefined ? "" : newRule.minAmount) &&
        (r.maxAmount === undefined ? "" : r.maxAmount) ===
          (newRule.maxAmount === undefined ? "" : newRule.maxAmount),
    );

    if (conflictingRule && !skipConflictCheck) {
      setRuleConflictPrompt(conflictingRule);
      return;
    }

    if (conflictingRule && skipConflictCheck) {
      if (conflictingRule.id) {
        await deleteRule(conflictingRule.id);
      }
    }

    // Automatically add as a new category if it doesn't exist
    if (
      !categories.includes(newRule.targetCategory) &&
      newRule.targetCategory.trim() !== ""
    ) {
      await addCategory(newRule.targetCategory.trim());
      const cats = await getCategories();
      setCategories(cats);
    }

    // We send null for empty fields so updateRule can delete them if needed
    const rulePayload = {
      pattern: newRule.pattern || "",
      ...(newRule.tagPattern
        ? { tagPattern: newRule.tagPattern }
        : { tagPattern: null }),
      type: newRule.type,
      targetCategory: newRule.targetCategory,
      ...(newRule.amount !== "" && newRule.amount !== undefined
        ? { amount: newRule.amount }
        : { amount: null }),
      ...(newRule.minAmount !== "" && newRule.minAmount !== undefined
        ? { minAmount: newRule.minAmount }
        : { minAmount: null }),
      ...(newRule.maxAmount !== "" && newRule.maxAmount !== undefined
        ? { maxAmount: newRule.maxAmount }
        : { maxAmount: null }),
      ...(newRule.daysOfWeek && newRule.daysOfWeek.length > 0
        ? { daysOfWeek: newRule.daysOfWeek }
        : { daysOfWeek: null }),
      ...(newRule.startTime
        ? { startTime: newRule.startTime }
        : { startTime: null }),
      ...(newRule.endTime
        ? { endTime: newRule.endTime }
        : { endTime: null })
    };

    if (editingRule?.id) {
      await updateRule(editingRule.id, rulePayload as any);
      setEditingRule(null);
    } else {
      // Remove nulls before save
      const savePayload = { ...rulePayload };
      if (savePayload.amount === null) delete savePayload.amount;
      if (savePayload.minAmount === null) delete savePayload.minAmount;
      if (savePayload.maxAmount === null) delete savePayload.maxAmount;
      if (savePayload.daysOfWeek === null) delete savePayload.daysOfWeek;
      if (savePayload.startTime === null) delete savePayload.startTime;
      if (savePayload.endTime === null) delete savePayload.endTime;

      await saveRule({
        ...savePayload,
        createdAt: new Date().toISOString(),
      });
    }

    setNewRule({
      pattern: "",
      tagPattern: undefined,
      type: "exact",
      targetCategory: "",
      amount: "",
      minAmount: "",
      maxAmount: "",
      daysOfWeek: [],
      startTime: "",
      endTime: ""
    });
    setSuggestedRules((prev) => 
      prev.filter((r) => 
        !((r.pattern || "") === (rulePayload.pattern || "") && r.targetCategory === rulePayload.targetCategory)
      )
    );
    setShowAddRule(false);

    // Auto re-apply rules to current period
    const period = getBudgetPeriod(viewDate, profile?.billingDay);
    await reapplyRules(period.start, period.end, [...rules, newRule as any]);
    loadData();
  };

  const handleDeleteRule = async (id: string) => {
    setUploadStatus("Updating transactions...");
    await deleteRule(id);
    const remainingRules = rules.filter((r) => r.id !== id);
    const period = getBudgetPeriod(viewDate, profile?.billingDay);
    await reapplyRules(period.start, period.end, remainingRules);
    await loadData();
    setUploadStatus(null);
  };

  const handleDeleteTransaction = async (id: string) => {
    setConfirmDialog({
      message: "Are you sure you want to delete this transaction?",
      onConfirm: async () => {
        try {
          await deleteTransaction(id);
          await loadData();
          setEditingTransaction(null);
        } catch (err: any) {
          console.error(err);
        }
      }
    });
  };

  const executeBulkUpdate = async (
    createRule: boolean,
    updateExisting: boolean,
  ) => {
    if (!bulkUpdatePrompt) return;
    const { merchant, newCat, bulkUpdateCandidates, existingRule } =
      bulkUpdatePrompt;

    setUploadStatus("Applying updates...");

    if (updateExisting && bulkUpdateCandidates.length > 0) {
      await Promise.all(
        bulkUpdateCandidates.map((t) =>
          updateTransaction(t.id!, { category: newCat }),
        ),
      );
    }

    if (createRule) {
      if (existingRule && existingRule.id) {
        await updateRule(existingRule.id, { targetCategory: newCat });
      } else {
        await saveRule({
          pattern: merchant,
          type: "exact",
          targetCategory: newCat,
          createdAt: new Date().toISOString(),
        });
      }
    }

    setBulkUpdatePrompt(null);
    setUploadStatus(null);
    await loadData();
  };

  const handleCategoryChangeWithPrompt = async (
    txId: string,
    merchant: string,
    newCat: string,
    allUpdates?: any,
  ) => {
    const tx = transactions.find((t) => t.id === txId);
    if (tx?.category === newCat) {
      if (allUpdates) await updateTransaction(txId, allUpdates);
      return;
    }

    // Immediately update the edited transaction because the user changed it in the UI!
    await updateTransaction(txId, allUpdates || { category: newCat });

    const existingRule = rules.find(
      (r) => r.type === "exact" && r.pattern === merchant,
    );
    const otherRules = rules.filter((r) => r !== existingRule);

    const allSameMerchantTxs = transactions.filter(
      (t) => t.merchant === merchant && t.id !== txId,
    );

    const bulkUpdateCandidates = allSameMerchantTxs.filter(
      (t) => t.category !== newCat
    );

    let mode: "bulk" | "rule_only_update" | "rule_only_create" | null = null;
    if (bulkUpdateCandidates.length > 0) {
      mode = "bulk";
    } else {
      if (allSameMerchantTxs.length > 0) {
        mode = "rule_only_update";
      } else {
        mode = "rule_only_create";
      }
    }

    setBulkUpdatePrompt({
      txId,
      merchant,
      newCat,
      allUpdates,
      bulkUpdateCandidates,
      existingRule,
      mode,
    });
  };

  const syncRules = async () => {
    setUploadStatus("Recategorizing...");
    const period = getBudgetPeriod(viewDate, profile?.billingDay);
    await reapplyRules(period.start, period.end, rules);
    await loadData();
    setUploadStatus(null);
  };

  const handleResetData = async () => {
    setConfirmDialog({
      message: "Are you sure? This will delete ALL imported transactions from your account.",
      onConfirm: async () => {
        setUploadStatus("Clearing all transactions...");
        try {
          await clearAllTransactionsOnly();
          await loadData();
        } catch (err: any) {
          console.error(err);
          alert(`Failed to delete transactions: ${err.message}`);
        } finally {
          setUploadStatus(null);
        }
      }
    });
  };

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    signInWithPopup(auth, provider).catch((error) => {
      console.error("Login failed:", error);
      if (error.code === 'auth/popup-blocked') {
        alert("The pop-up was blocked. If you are using an iPhone inside WhatsApp, Discord, or Instagram, please open this link in Safari directly (tap the top-right share or options button and choose 'Open in Safari'). Otherwise, please allow pop-ups for this website in your browser settings.");
      } else {
        alert(`Authentication failed: ${error.message}`);
      }
    });
  };

  const handleLogout = () => signOut(auth);

  const compressImage = (base64: string, maxWidth = 800, quality = 0.3): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // We use image/jpeg for better compression than image/png
        const compressed = canvas.toDataURL("image/jpeg", quality);
        
        // If still too large, we could recursively compress
        // but 800px at 0.3 quality is usually < 100KB
        resolve(compressed);
      };
      img.onerror = () => resolve(base64);
    });
  };

  const onDrop = async (acceptedFiles: File[]) => {
    setIsUploading(true);
    setUploadStatus(`Processing ${acceptedFiles.length} files...`);

    try {
      let totalCount = 0;
      const results = await Promise.all(
        acceptedFiles.map(async (file) => {
          try {
            const rawBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });

            const isDuplicate = screenshots.some(s => 
              s.name === file.name || 
              (s.base64 && s.base64.slice(-500) === rawBase64.slice(-500))
            );
            if (isDuplicate) {
              console.log("Duplicate screenshot ignored:", file.name);
              return 0;
            }

            // Compress image to fit Firestore 1MB limit
            const base64 = await compressImage(rawBase64);

            const extractionResult = await extractTransactionsFromScreenshot(
              base64,
              categories,
              "image/jpeg",
            );
            
            const extracted = extractionResult.transactions || [];

            const screenshotId = await saveScreenshot({
              base64,
              name: file.name,
              balance: extractionResult.balance,
            });

            let fileCount = 0;
            for (const txData of extracted) {
              const finalCategory = applyRules(txData, rules);
              const suggestedTags = txData.merchant
                ? suggestTagsForMerchant(txData.merchant)
                : [];
              const mergedTags = Array.from(
                new Set([...(txData.tags || []), ...suggestedTags]),
              );

              let finalDate = new Date();
              if (txData.date) {
                const parsed = new Date(txData.date);
                if (!isNaN(parsed.getTime())) {
                  finalDate = parsed;
                }
              }

              await saveTransaction({
                ...txData,
                amount: parseAmount(txData.amount),
                tags: mergedTags,
                category: finalCategory,
                date: finalDate.toISOString(),
                screenshotId,
              });
              fileCount++;
            }
            return fileCount;
          } catch (err) {
            console.error(`Failed to process ${file.name}:`, err);
            return 0;
          }
        }),
      );

      totalCount = results.reduce((acc, curr) => acc + curr, 0);

      if (totalCount > 0) {
        setUploadStatus(`Success! Imported ${totalCount} transactions.`);
      } else {
        setUploadStatus("No transactions found or processing failed.");
      }

      await loadData(true);
      setTimeout(() => setUploadStatus(null), 4000);
    } catch (err) {
      console.error("Upload process failed:", err);
      setUploadStatus("Error: Overall upload process failed.");
      setTimeout(() => setUploadStatus(null), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
    noClick: true, // We will trigger it via button or explicit click on the dropzone if needed, or maybe false. Let's keep noClick: false so clicking dropzone works too
  } as any);

  const resetFilters = () => {
    setFilterQuery("");
    setFilterCategory("");
    setFilterTag("");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  const formatCycle = (start: Date, end: Date) => {
    const bd = profile?.billingDay || 1;
    if (bd === 1) {
      return format(start, "MMM yy");
    }
    return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
  };

  const period = useMemo(() => getBudgetPeriod(viewDate, profile?.billingDay), [viewDate, profile?.billingDay]);

  // Unfiltered Period Total (Net position for period)
  const periodTotal = useMemo(() => transactions
    .filter(t => {
      const d = new Date(t.date);
      return d >= period.start && d <= period.end && !isMetaData(t);
    })
    .reduce((sum, t) => sum + getSignedAmount(t), 0), [transactions, period]);

  // Filtered Transactions Logic
  const filteredTransactions = useMemo(() => transactions.filter((tx) => {
    // Exclude metadata rows globally
    if (isMetaData(tx)) return false;

    const matchesQuery =
      !filterQuery ||
      tx.merchant.toLowerCase().includes(filterQuery.toLowerCase()) ||
      tx.rawText?.toLowerCase().includes(filterQuery.toLowerCase());

    const matchesCategory = !filterCategory || tx.category === filterCategory;
    const matchesTag = !filterTag || (tx.tags && tx.tags.includes(filterTag));
    const matchesReceipt = !filterWithReceipts || (!!tx.receiptBase64 || !!tx.screenshotId);

    let matchesDate = true;
    const txDate = new Date(tx.date);
    
    if (filterStartDate || filterEndDate) {
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        start.setHours(0, 0, 0, 0);
        if (txDate < start) matchesDate = false;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        if (txDate > end) matchesDate = false;
      }
    } else {
      // Default to the current month/period or custom period view
      let start: Date, end: Date;
      if (isCustomPeriod && customStart && customEnd) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
      } else {
        start = period.start;
        end = period.end;
      }
      if (txDate < start || txDate > end) matchesDate = false;
    }

    return matchesQuery && matchesCategory && matchesTag && matchesDate && matchesReceipt;
  }), [transactions, filterQuery, filterCategory, filterTag, filterStartDate, filterEndDate, filterWithReceipts, period, isCustomPeriod, customStart, customEnd]);

  const filteredScreenshots = useMemo(() => screenshots.filter((snap) => {
    let matchesDate = true;
    const snapDate = new Date(snap.createdAt);
    
    // Ignore filter strip dates for snaps to keep it simple, just use the dashboard period.
    let start: Date, end: Date;
    if (isCustomPeriod && customStart && customEnd) {
      start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
    } else {
      start = period.start;
      end = period.end;
    }
    
    if (snapDate < start || snapDate > end) matchesDate = false;
    return matchesDate;
  }), [screenshots, isCustomPeriod, customStart, customEnd, period]);

  const filteredTotal = useMemo(() => filteredTransactions
    .reduce((sum, t) => sum + getSignedAmount(t), 0), [filteredTransactions]);

  const allAvailableCategories = useMemo(() => Array.from(
    new Set([
      "Savings & Investments",
      ...categories,
      ...transactions.map((t) => t.category).filter(Boolean),
    ]),
  ).sort(), [categories, transactions]);

  const allAvailableTags = useMemo(() => Array.from(
    new Set([...COMMON_TAGS, ...transactions.flatMap((t) => t.tags || [])]),
  ).sort(), [transactions]);

  const recurringCandidates = useMemo(() => {
    const byMerchant = transactions.reduce(
      (acc, tx) => {
        if (tx.type !== "expense" && tx.type !== undefined) return acc;
        if (!acc[tx.merchant]) acc[tx.merchant] = [];
        acc[tx.merchant].push(tx);
        return acc;
      },
      {} as Record<string, Transaction[]>,
    );

    const candidates: {
      merchant: string;
      amount: number;
      occurrences: number;
      txs: Transaction[];
    }[] = [];

    const COMMON_SUBSCRIPTION_KEYWORDS = [
      "netflix", "spotify", "prime", "amazon prime", "audible", "chatgpt", "openai", "claude", "anthropic",
      "disney", "hulu", "hbo", "max", "apple tv", "apple music", "youtube premium", 
      "gym", "strava", "patreon", "dropbox", "google one", "icloud", "microsoft", "xbox", "playstation", "adobe",
      "puregym", "the gym", "nintendo", "peloton", "ring", "canva", "figma", "github", "zoom", "slack", "o2",
      "ee", "vodafone", "three mobile", "giffgaff"
    ];

    const isCommonSubscription = (merchant: string) => {
      const m = merchant.toLowerCase();
      return COMMON_SUBSCRIPTION_KEYWORDS.some(sub => m.includes(sub));
    };

    // Smart date-alignment detector: looks for same merchant charging in different months 
    // on near-identical day of the month (+/- 4 days difference)
    const detectRecurringSequenceByDate = (txsList: Transaction[]) => {
      if (txsList.length < 2) return null;
      
      const sorted = [...txsList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const seq: Transaction[] = [];

      for (let i = 0; i < sorted.length; i++) {
        const tx1 = sorted[i];
        const date1 = new Date(tx1.date);
        const day1 = date1.getDate();
        let hasAtLeastOneMatch = false;

        for (let j = 0; j < sorted.length; j++) {
          if (i === j) continue;
          const tx2 = sorted[j];
          const date2 = new Date(tx2.date);
          const day2 = date2.getDate();

          const diffMonths = (date2.getFullYear() - date1.getFullYear()) * 12 + (date2.getMonth() - date1.getMonth());
          if (Math.abs(diffMonths) >= 1) {
            // Check day number proximity (helpful for billing schedules shifting on weekends)
            if (Math.abs(day1 - day2) <= 4) {
              hasAtLeastOneMatch = true;
              break;
            }
          }
        }

        if (hasAtLeastOneMatch) {
          seq.push(tx1);
        }
      }

      return seq.length >= 2 ? seq : null;
    };

    for (const [merchant, txs] of Object.entries(byMerchant)) {
      const isKnownSub = isCommonSubscription(merchant);

      // 1. Primary check: Monthly Recurring Date-aligned pattern
      const dateAlignedSeq = detectRecurringSequenceByDate(txs);
      if (dateAlignedSeq) {
        const uncategorisedAsSub = dateAlignedSeq.filter(
          (t) => t.category !== "Subscriptions" && t.category !== "Bills",
        );
        if (uncategorisedAsSub.length > 0) {
          const avgAmt = uncategorisedAsSub.reduce((sum, t) => sum + t.amount, 0) / uncategorisedAsSub.length;
          candidates.push({
            merchant,
            amount: avgAmt,
            occurrences: dateAlignedSeq.length,
            txs: uncategorisedAsSub,
          });
          continue; // Handled nicely via date alignments!
        }
      }

      // 2. Secondary check: Exact same amount or known subscription keywords as fallback
      if (!isKnownSub && txs.length < 2) continue;

      const byAmount = txs.reduce(
        (acc, tx) => {
          const amt = Math.round(tx.amount);
          if (!acc[amt]) acc[amt] = [];
          acc[amt].push(tx);
          return acc;
        },
        {} as Record<number, Transaction[]>,
      );

      for (const amountTxs of Object.values(byAmount)) {
        if (amountTxs.length >= 2 || isKnownSub) {
          const uncategorisedAsSub = amountTxs.filter(
            (t) => t.category !== "Subscriptions" && t.category !== "Bills",
          );
          if (uncategorisedAsSub.length > 0) {
            if (!candidates.some(c => c.merchant === merchant)) {
              candidates.push({
                merchant: merchant,
                amount: amountTxs[0].amount,
                occurrences: amountTxs.length,
                txs: uncategorisedAsSub,
              });
            }
          }
        }
      }
    }
    return candidates.sort((a, b) => b.occurrences - a.occurrences);
  }, [transactions]);

  const handleToggleTag = async (tx: Transaction, tag: string) => {
    if (!tx.id) return;
    const currentTags = tx.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    await updateTransaction(tx.id, { tags: newTags });
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl p-10 shadow-sm border border-gray-100 text-center"
        >
          <LucaLogo className="w-20 h-20 mx-auto mb-6" iconOnly />
          <h1 className="text-3xl font-black tracking-[0.3em] uppercase text-[#6F2CF3] mb-2">
            Luca
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10">
            Smart Financial Insight
          </p>
          <button
            onClick={handleLogin}
            className="w-full bg-black text-white py-4 rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-3"
          >
            <img
              src="https://www.google.com/favicon.ico"
              className="w-4 h-4 invert"
              alt=""
            />
            Continue with Google
          </button>

          <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-200/50 text-left">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> iPhone / Mobile User?
            </p>
            <p className="text-xs text-amber-700/90 leading-relaxed font-medium">
              If you opened this inside WhatsApp, Instagram, Discord, or Facebook, Google blocks webview signs. Please tap the <strong>•••</strong> or Share button and choose <strong>"Open in Safari"</strong> or <strong>"Open in Chrome"</strong> to sign in.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full max-w-full bg-slate-50 font-sans text-slate-900 overflow-x-hidden overflow-y-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 px-4 md:px-8 border-b border-slate-200 bg-white flex items-center justify-between z-50">
        <LucaLogo />
        <div className="flex items-center gap-3 md:gap-6">
          <div className="hidden sm:block text-xs font-medium text-slate-500">
            Next Payday:{" "}
            <span className="text-indigo-600 font-semibold">
              {format(period.end, "MMM do")}
            </span>
          </div>
          <button
            onClick={() => setShowProfileSettings(true)}
            className="p-2 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-400 transition-all"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row pt-16 pb-20 lg:pb-0 overflow-y-auto overflow-x-hidden w-full max-w-full lg:overflow-hidden relative">
        {/* Mobile FAB */}
        <div className="fixed bottom-24 right-6 z-[60] flex flex-col gap-3 lg:hidden">
          <button
            onClick={handleGenerateInsights}
            disabled={isGeneratingInsights}
            className="w-14 h-14 bg-white border border-slate-200 text-emerald-500 rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
          >
            {isGeneratingInsights ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : <Sparkles className="w-6 h-6" />}
          </button>
          <button
            onClick={() => setShowManualTransaction(true)}
            className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>

        {/* Sidebar / Overview Section */}
        <aside className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-4 md:p-8 flex flex-col gap-4 lg:gap-8 flex-shrink-0 lg:overflow-y-auto lg:max-h-full">
          <section className="bg-slate-50 lg:bg-transparent -mx-4 lg:mx-0 p-4 lg:p-0">
            <div className="flex items-center justify-between lg:hidden mb-2">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Cycle Overview
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100/50 rounded-lg p-0.5 border border-slate-200/50">
                  <button
                    onClick={() => {
                      setIsCustomPeriod(false);
                      setViewDate(subMonths(viewDate, 1));
                    }}
                    className="p-1 hover:bg-white hover:shadow-sm rounded text-slate-400 transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsCustomPeriod(!isCustomPeriod)}
                    className="px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {formatCycle(period.start, period.end)}
                  </button>
                  <button
                    onClick={() => {
                      setIsCustomPeriod(false);
                      setViewDate(addMonths(viewDate, 1));
                    }}
                    className="p-1 hover:bg-white hover:shadow-sm rounded text-slate-400 transition-all"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => setShowProfileSettings(true)}
                  className="p-1 hover:bg-slate-200 rounded-md transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            </div>
            <h3 className="hidden lg:block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Current Cycle
            </h3>
            <div className="space-y-4">
              <div className="p-4 md:p-5 bg-white lg:bg-slate-50 rounded-2xl border border-slate-100 shadow-sm lg:shadow-none">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {formatCycle(period.start, period.end)}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100/50 rounded-lg p-0.5 ml-1 border border-slate-200/50">
                      <button
                        onClick={() => {
                          setIsCustomPeriod(false);
                          setViewDate(subMonths(viewDate, 1));
                        }}
                        className="p-1 hover:bg-white hover:shadow-sm rounded text-slate-400 transition-all"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setIsCustomPeriod(false);
                          setViewDate(addMonths(viewDate, 1));
                        }}
                        className="p-1 hover:bg-white hover:shadow-sm rounded text-slate-400 transition-all"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProfileSettings(true)}
                    className="hidden lg:block p-1 -m-1 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500" />
                  </button>
                </div>
                <div className="flex lg:block items-baseline justify-between lg:justify-start">
                  <div className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">
                    {formatCurrency(periodTotal)}
                  </div>
                  <div className="text-[10px] md:text-xs text-slate-500 mt-0 lg:mt-2 font-medium bg-slate-100 lg:bg-transparent px-2 lg:px-0 py-0.5 lg:py-0 rounded-full lg:rounded-none">
                    Cycle spending
                  </div>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 md:mt-4 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((periodTotal / 2000) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </section>

          <div className="hidden lg:flex flex-col gap-6">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Smart Rules
                </h3>
                <Tag className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <div className="space-y-2">
                {rules.slice(0, 5).map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors group/rule"
                    onClick={() => {
                      setActiveTab("rules");
                      setNewRule({
                        pattern: rule.pattern,
                        tagPattern: rule.tagPattern,
                        type: rule.type,
                        targetCategory: rule.targetCategory,
                        amount: rule.amount ?? "",
                        minAmount: rule.minAmount ?? "",
                        maxAmount: rule.maxAmount ?? "",
                        daysOfWeek: rule.daysOfWeek || [],
                        startTime: rule.startTime || "",
                        endTime: rule.endTime || ""
                      });
                      setEditingRule(rule);
                      setShowAddRule(true);
                    }}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                        <span className="truncate">
                          {rule.pattern || "Any Merchant"} → {rule.targetCategory}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        rule.id && handleDeleteRule(rule.id);
                      }}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {rules.length > 5 && (
                  <button 
                    onClick={() => setActiveTab("rules")}
                    className="w-full py-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    View All {rules.length} Rules
                  </button>
                )}
              </div>
            </section>
          </div>

          <div className="hidden lg:flex flex-col gap-6">
            <button
              onClick={handleLogout}
              className="mt-6 flex items-center gap-3 p-4 rounded-2xl bg-slate-50 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all text-xs font-bold uppercase tracking-widest"
            >
              <LogOut className="w-4 h-4" />
              Sign out session
            </button>
          </div>
        </aside>

        {/* Content Section */}
        <section className="flex-1 flex flex-col p-4 sm:p-6 lg:p-10 lg:overflow-y-auto overflow-visible">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-6 md:mb-8 shrink-0 lg:sticky lg:top-0 bg-slate-50 z-20 py-1 -mt-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                  {activeTab === "dashboard"
                    ? "Home"
                    : activeTab === "history"
                      ? "History"
                      : activeTab === "rules"
                        ? "Bills & Rules"
                        : activeTab === "screenshots"
                          ? "Snaps"
                          : activeTab === "analytics"
                            ? "Spending"
                            : activeTab === "savings"
                              ? "Savings"
                              : activeTab === "export"
                                ? "Export Data"
                                : "Bills"}
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1 sm:mt-0">
                  <p className="text-slate-400 text-[10px] md:text-sm font-medium">
                    {activeTab === "rules"
                      ? "Categorization logic engine"
                      : activeTab === "analytics"
                        ? "Spending breakdown by category"
                        : activeTab === "screenshots"
                          ? "Raw scan archive"
                          : activeTab === "export"
                            ? "Download your transaction data"
                            : `Showing ${filteredTransactions.length} of ${transactions.length} entries`}
                  </p>

                  {/* Mobile-only date switcher right below the title subtitle */}
                  {activeTab !== "rules" && activeTab !== "savings" && activeTab !== "dashboard" && (
                    <div className="flex sm:hidden flex-col items-start gap-2 relative mt-1">
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm w-fit">
                        <button
                          onClick={() => {
                            setIsCustomPeriod(false);
                            setViewDate(subMonths(viewDate, 1));
                          }}
                          className="p-1 hover:bg-slate-50 rounded text-slate-400 transition-colors"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setIsCustomPeriod(!isCustomPeriod)}
                          className="px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 rounded transition-colors"
                        >
                          {formatCycle(period.start, period.end)}
                        </button>
                        <button
                          onClick={() => {
                            setIsCustomPeriod(false);
                            setViewDate(addMonths(viewDate, 1));
                          }}
                          className="p-1 hover:bg-slate-50 rounded text-slate-400 transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <AnimatePresence>
                        {isCustomPeriod && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 shadow-xl z-50 absolute top-full mt-2 left-0"
                          >
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                                Start
                              </label>
                              <input
                                type="date"
                                className="text-xs font-bold border rounded-lg px-2 py-1 outline-indigo-500"
                                value={
                                  customStart || format(period.start, "yyyy-MM-dd")
                                }
                                onChange={(e) => setCustomStart(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                                End
                              </label>
                              <input
                                type="date"
                                className="text-xs font-bold border rounded-lg px-2 py-1 outline-indigo-500"
                                value={
                                  customEnd || format(period.end, "yyyy-MM-dd")
                                }
                                onChange={(e) => setCustomEnd(e.target.value)}
                              />
                            </div>
                            <button
                              onClick={() => setIsCustomPeriod(false)}
                              className="self-end mb-1 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "p-2.5 rounded-xl border sm:hidden transition-all",
                  showFilters || filterCategory || filterQuery
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm"
                    : "bg-white border-slate-200 text-slate-500",
                )}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              {/* Tab Switcher */}
              <div className="flex p-1 bg-slate-100 rounded-xl min-w-max">
                {[
                  { id: "dashboard", icon: Home, label: "Home" },
                  { id: "analytics", icon: PieChart, label: "Spending" },
                  { id: "history", icon: History, label: "History" },
                  { id: "bills", icon: FileText, label: "Bills" },
                  { id: "savings", icon: Wallet, label: "Savings" },
                  { id: "screenshots", icon: ImageIcon, label: "Snaps" },
                  { id: "rules", icon: Tag, label: "Rules" },
                  { id: "export", icon: Download, label: "Export" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      resetFilters();
                      setActiveTab(tab.id as any);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                      activeTab === tab.id
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-400 hover:text-slate-600",
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Manual Entry Button */}
              <button
                onClick={() => setShowManualTransaction(true)}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all shrink-0 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Transaction</span>
              </button>

              {activeTab !== "rules" && activeTab !== "savings" && (
                <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-fit">
                    <button
                      onClick={() => {
                        setIsCustomPeriod(false);
                        setViewDate(subMonths(viewDate, 1));
                      }}
                      className="p-1.5 md:p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button
                      onClick={() => setIsCustomPeriod(!isCustomPeriod)}
                      className="px-3 md:px-4 text-[10px] md:text-sm font-bold text-slate-700 min-w-[90px] md:min-w-[140px] text-center hover:bg-slate-50 rounded-lg py-1 transition-colors"
                    >
                      {formatCycle(period.start, period.end)}
                    </button>
                    <button
                      onClick={() => {
                        setIsCustomPeriod(false);
                        setViewDate(addMonths(viewDate, 1));
                      }}
                      className="p-1.5 md:p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>

                  <AnimatePresence>
                    {isCustomPeriod && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 shadow-xl z-50 absolute mt-12"
                      >
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                            Start
                          </label>
                          <input
                            type="date"
                            className="text-xs font-bold border rounded-lg px-2 py-1 outline-indigo-500"
                            value={
                              customStart || format(period.start, "yyyy-MM-dd")
                            }
                            onChange={(e) => setCustomStart(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                            End
                          </label>
                          <input
                            type="date"
                            className="text-xs font-bold border rounded-lg px-2 py-1 outline-indigo-500"
                            value={
                              customEnd || format(period.end, "yyyy-MM-dd")
                            }
                            onChange={(e) => setCustomEnd(e.target.value)}
                          />
                        </div>
                        <button
                          onClick={() => setIsCustomPeriod(false)}
                          className="self-end mb-1 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {insights && activeTab === "dashboard" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 text-emerald-900 relative">
                    <button
                      onClick={() => setInsights(null)}
                      className="absolute top-4 right-4 text-emerald-400 hover:text-emerald-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-emerald-500" />
                      <h3 className="font-bold uppercase tracking-widest text-[10px]">
                        Luca AI Insights
                      </h3>
                    </div>
                    <div className="prose prose-sm max-w-none prose-emerald">
                      <Markdown>{insights}</Markdown>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "dashboard" ? (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="h-full overflow-y-auto no-scrollbar pb-32 space-y-8"
                >
                  <div className="flex flex-col gap-1 mt-4 px-2">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Home</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
                      {(() => {
                        const hour = new Date().getHours();
                        const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
                        const name = profile?.displayName ? profile.displayName.split(" ")[0] : (user?.displayName ? user.displayName.split(" ")[0] : "Amer");
                        return `${greeting}, ${name}`;
                      })()}
                    </p>
                  </div>

                  {/* Routine Analysis - Compact version at top */}
                  <div className="bg-slate-900 rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden group shadow-2xl shadow-indigo-900/10">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[80px] -mr-24 -mt-24 rounded-full" />
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-xl shadow-indigo-500/20 shrink-0">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black tracking-tight">Financial Patterns</h3>
                            <p className="text-xs text-slate-400 font-medium tracking-tight">AI habits analysis</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          {[
                            "Weekend routine spend",
                            "Lifestyle subscriptions",
                            "Office day costs"
                          ].map((q) => (
                            <button
                              key={q}
                              onClick={() => handleAnalyticQuery(q)}
                              disabled={isAnalysingRoutine}
                              className="px-4 py-2.5 bg-slate-800/80 hover:bg-indigo-600 border border-slate-700/30 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shrink-0"
                            >
                              {q}
                            </button>
                          ))}
                          <div className="flex bg-slate-800/80 border border-slate-700/30 rounded-xl overflow-hidden min-w-[200px]">
                            <input 
                              id="analytic-query-input"
                              type="text"
                              placeholder="Ask Luca about your spend..."
                              className="bg-transparent text-white text-xs px-4 py-2 outline-none w-full placeholder:text-slate-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                  handleAnalyticQuery(e.currentTarget.value);
                                  e.currentTarget.value = '';
                                }
                              }}
                              disabled={isAnalysingRoutine}
                            />
                            <button 
                              onClick={() => {
                                const input = document.getElementById('analytic-query-input') as HTMLInputElement;
                                if (input && input.value.trim()) {
                                  handleAnalyticQuery(input.value);
                                  input.value = '';
                                }
                              }}
                              className="px-3 bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center disabled:opacity-50" 
                              disabled={isAnalysingRoutine}
                            >
                              <Search className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        </div>
                    </div>

                    <AnimatePresence>
                      {(isAnalysingRoutine || routineInsight) && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="relative z-10 overflow-hidden"
                        >
                          <div className="mt-6 pt-6 border-t border-slate-800">
                            {isAnalysingRoutine ? (
                               <div className="flex items-center gap-3 text-slate-400 font-bold text-sm">
                                 <div className="w-4 h-4 border-2 border-slate-400 border-t-indigo-400 rounded-full animate-spin" />
                                 Analyzing patterns...
                               </div>
                            ) : routineInsight ? (
                               <div className="space-y-6">
                                 <div className="prose prose-sm prose-invert max-w-none">
                                   <Markdown>{routineInsight}</Markdown>
                                 </div>
                                 {(suggestedRules.length > 0 || suggestedTags.length > 0 || suggestedCategories.length > 0 || habitTips.length > 0 || suggestedBudgets.length > 0) && (
                                   <div className="mt-8 space-y-4">
                                     <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Suggested Smart Actions</h4>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       {suggestedBudgets.map((b, idx) => (
                                          <div key={`sbudget-${idx}`} className="bg-emerald-900/50 p-4 rounded-2xl border border-emerald-500/30 flex flex-col justify-between gap-4">
                                           <div>
                                             <div className="flex items-center gap-2 mb-2">
                                               <Target className="w-4 h-4 text-emerald-400" />
                                               <span className="text-xs font-bold text-slate-200 line-clamp-1 capitalize">{b.targetId} {b.cycle} Budget</span>
                                             </div>
                                             <p className="text-[10px] text-slate-300 leading-relaxed font-medium">{b.reason}</p>
                                             <div className="mt-2 text-[10px] font-black text-emerald-400">Budget Limit: {formatCurrency(b.amount)}</div>
                                           </div>
                                           <button
                                             onClick={() => handleAcceptSuggestedBudget(b)}
                                             className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                                           >
                                             Enable Target Alert
                                           </button>
                                         </div>
                                        ))}
                                       {habitTips.map((tip, idx) => (
                                         <div key={`habit-${idx}`} className="bg-indigo-900/50 p-4 rounded-2xl border border-indigo-500/30 flex flex-col justify-between gap-4">
                                           <div>
                                             <div className="flex items-center gap-2 mb-2">
                                               <Sparkles className="w-4 h-4 text-indigo-400" />
                                               <span className="text-xs font-bold text-slate-200 line-clamp-1">Habit Swap for {tip.relatedCategory}</span>
                                             </div>
                                             <p className="text-[10px] text-slate-300 leading-relaxed font-medium">{tip.description}</p>
                                             {tip.monthlySavings > 0 && (
                                                <div className="mt-2 text-[10px] font-black text-emerald-400">Potential Savings: +{formatCurrency(tip.monthlySavings)}/mo</div>
                                             )}
                                           </div>
                                           <button
                                             onClick={() => handleAcceptHabitTip(tip)}
                                             className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                                           >
                                             Enable Target & Reminder
                                           </button>
                                         </div>
                                       ))}
                                       {suggestedRules.map((rule, idx) => (
                                         <div key={`rule-${idx}`} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col justify-between gap-4">
                                           <div>
                                             <div className="flex items-center gap-2 mb-2">
                                               <Sparkles className="w-4 h-4 text-indigo-400" />
                                               <span className="text-xs font-bold text-slate-200 line-clamp-1" title={`${rule.pattern} → ${rule.targetCategory}`}>Rule: {rule.pattern} → {rule.targetCategory}</span>
                                             </div>
                                             <p className="text-[10px] text-slate-400 leading-relaxed">Automatically group matching transactions into {rule.targetCategory}.</p>
                                           </div>
                                           <button
                                             onClick={() => handleApplySuggestedRule(rule)}
                                             className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                                           >
                                             Create Rule
                                           </button>
                                         </div>
                                       ))}
                                       {suggestedTags.map((tagObj, idx) => (
                                         <div key={`tag-${idx}`} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col justify-between gap-4">
                                           <div>
                                             <div className="flex items-center gap-2 mb-2">
                                               <Tag className="w-4 h-4 text-emerald-400" />
                                               <span className="text-xs font-bold text-slate-200 line-clamp-1" title={`Tag ${tagObj.transactionIds.length} items as '${tagObj.tag}'`}>Tag {tagObj.transactionIds.length} items as '{tagObj.tag}'</span>
                                             </div>
                                             <p className="text-[10px] text-slate-400 leading-relaxed">{tagObj.reason}</p>
                                           </div>
                                           <button
                                             onClick={() => handleApplySuggestedTag(tagObj.transactionIds, tagObj.tag)}
                                             className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                                           >
                                             Apply Tag
                                           </button>
                                         </div>
                                       ))}
                                       {suggestedCategories.map((catObj, idx) => (
                                         <div key={`cat-${idx}`} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col justify-between gap-4">
                                           <div>
                                             <div className="flex items-center gap-2 mb-2">
                                               <FileText className="w-4 h-4 text-amber-400" />
                                               <span className="text-xs font-bold text-slate-200 line-clamp-1" title={`Move ${catObj.transactionIds.length} items to '${catObj.category}'`}>Move {catObj.transactionIds.length} items to '{catObj.category}'</span>
                                             </div>
                                             <p className="text-[10px] text-slate-400 leading-relaxed">{catObj.reason}</p>
                                           </div>
                                           <button
                                             onClick={() => handleApplySuggestedCategory(catObj.transactionIds, catObj.category)}
                                             className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                                           >
                                             Update Category
                                           </button>
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 )}
                               </div>
                            ) : null}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {(profile?.budgets && profile.budgets.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {profile.budgets.map(b => {
                        const amountSpentText = isCustomPeriod ? "Custom Period Spend" : "Current Cycle Spend";
                        let budgetStart = period.start;
                        let budgetEnd = period.end;
                        const today = new Date();
                        if (b.cycle === 'daily') {
                          budgetStart = new Date(today.setHours(0,0,0,0));
                          budgetEnd = new Date(today.setHours(23,59,59,999));
                        } else if (b.cycle === 'weekly') {
                          const wStart = new Date(today);
                          wStart.setDate(wStart.getDate() - wStart.getDay() + (wStart.getDay() === 0 ? -6 : 1));
                          wStart.setHours(0,0,0,0);
                          const wEnd = new Date(wStart);
                          wEnd.setDate(wStart.getDate() + 6);
                          wEnd.setHours(23,59,59,999);
                          budgetStart = wStart;
                          budgetEnd = wEnd;
                        }

                        const spend = transactions
                          .filter(t => t.type === 'expense' && (new Date(t.date) >= budgetStart) && (new Date(t.date) <= budgetEnd))
                          .filter(t => {
                            if (b.targetType === 'category') return t.category === b.targetId;
                            if (b.targetType === 'merchant') return t.merchant === b.targetId;
                            if (b.targetType === 'tag') return t.tags?.includes(b.targetId);
                            return false;
                          })
                          .reduce((sum, t) => sum + Math.abs(getSignedAmount(t)), 0);
                        const progress = Math.min((spend / b.amount) * 100, 100);
                        const isNearing = progress > (b.alertThresholdPercent || 80);

                        return (
                        <div key={b.id} className={`bg-white rounded-[2.5rem] p-6 border ${isNearing ? 'border-rose-200 shadow-rose-100/50' : 'border-slate-100 shadow-slate-200/50'} flex flex-col gap-4 relative overflow-hidden group shadow-lg`}>
                          <div className="flex items-center gap-4 relative z-10">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${isNearing ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-500'}`}>
                              <Target className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 tracking-tight leading-tight capitalize">{b.targetId} ({b.cycle})</h4>
                              <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isNearing ? 'text-rose-500' : 'text-slate-400'}`}>{formatCurrency(spend)} / {formatCurrency(b.amount)}</p>
                            </div>
                          </div>
                          
                          <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                             <div className={`h-full rounded-full transition-all ${isNearing ? 'bg-rose-500' : 'bg-emerald-400'}`} style={{ width: `${progress}%` }}></div>
                          </div>
                          
                          <button onClick={() => handleDeleteBudget(b.id)} className="w-full mt-auto py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 relative z-10">
                            Remove Budget
                          </button>
                        </div>
                      )})}
                    </div>
                  )}

                  {profile?.reminders && profile.reminders.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {profile.reminders.map(r => (
                        <div key={r.id} className="bg-rose-50 rounded-[2.5rem] p-6 border border-rose-100 flex flex-col gap-4 relative overflow-hidden group shadow-lg shadow-rose-100/50">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-200/50 blur-[40px] -mr-8 -mt-8 rounded-full" />
                          <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-rose-500 shadow-sm shrink-0">
                              <Bell className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 tracking-tight leading-tight">{r.title}</h4>
                              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mt-1">{r.timeOfDay}</p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed relative z-10">{r.message}</p>
                          <button onClick={() => handleDeleteReminder(r.id)} className="w-full mt-auto py-2.5 bg-rose-200/50 hover:bg-rose-500 text-rose-700 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 relative z-10">
                            Dismiss
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/20">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
                      <div className="relative z-10">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] block mb-4">Total Balance</span>
                        <div className="text-5xl font-black tracking-tighter mb-4">
                          {formatCurrency(
                            filteredTransactions.reduce((sum, t) => sum + getSignedAmount(t), 0)
                          )}
                        </div>
                        {(() => {
                          const currentMonth = new Date().getMonth();
                          const currentYear = new Date().getFullYear();
                          const thisMonthTxs = filteredTransactions.filter(t => {
                            const d = new Date(t.date);
                            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                          });
                          const changeThisMonth = thisMonthTxs.reduce((sum, t) => sum + getSignedAmount(t), 0);
                          const isPositive = changeThisMonth >= 0;
                          return (
                            <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest", isPositive ? "text-emerald-400" : "text-rose-400")}>
                              {isPositive ? <ChevronUp className="w-4 h-4 ml-[-4px]" /> : <ChevronDown className="w-4 h-4 ml-[-4px]" />}
                              {formatCurrency(Math.abs(changeThisMonth))} this month
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/40 relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-4">Savings Total</span>
                        <div className="text-5xl font-black tracking-tighter text-slate-900 mb-4">
                          {formatCurrency(
                            transactions
                              .filter(t => t.category === "Savings & Investments")
                              .reduce((sum, t) => sum + getSignedAmount(t), 0) * -1
                          )}
                        </div>
                        <button 
                          onClick={() => setActiveTab("savings")}
                          className="flex items-center gap-2 text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:translate-x-1 transition-transform"
                        >
                          View all pots
                          <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                  </div>

                  {/* Top Merchants Card - Modernised */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-6">
                      <div className="px-2">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Categories</h3>
                      </div>
                      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 p-8 space-y-5">
                        {Array.from(new Set(filteredTransactions.map(t => t.category).filter(Boolean)))
                          .map(cat => ({
                            name: cat as string,
                            total: filteredTransactions.filter(t => t.category === cat).reduce((sum, t) => sum + getSignedAmount(t), 0),
                            colors: getCategoryColorComponent(cat as string, profile),
                            icon: getCategoryIconComponent(cat as string, profile)
                          }))
                          .sort((a,b) => Math.abs(b.total) - Math.abs(a.total))
                          .slice(0, 4)
                          .map((cat) => (
                            <div
                              key={cat.name}
                              className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded-2xl group transition-all"
                              onClick={() => {
                                resetFilters();
                                setFilterCategory(cat.name);
                                setActiveTab("history");
                              }}
                            >
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCategoryIconFor(cat.name);
                                  }}
                                  className="w-10 h-10 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                                  title="Change Emblem"
                                >
                                  <cat.icon className={cn("w-6 h-6", cat.colors.text)} />
                                </button>
                                <span className="text-sm font-black text-slate-800 tracking-tight">{cat.name}</span>
                              </div>
                              <span className="text-sm font-black text-slate-900 tracking-tighter">
                                {formatCurrency(Math.abs(cat.total))}
                              </span>
                            </div>
                          ))}
                      </div>
                      
                      <div className="hidden lg:block bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200">
                         <div className="flex items-center gap-3 mb-6">
                           <LucaLogo iconOnly className="w-8 h-8" />
                           <span className="text-[10px] font-black uppercase tracking-[0.3em]">Smart Tip</span>
                         </div>
                         <p className="text-sm font-bold leading-relaxed mb-4 opacity-90">
                           You've spent more on <span className="text-emerald-400">Coffee</span> this week compared to last. Why not try a home brew today?
                         </p>
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Top Merchants</h3>
                        <button 
                          onClick={() => setActiveTab("analytics")}
                          className="text-[10px] font-black text-indigo-600 uppercase tracking-widest"
                        >
                          Full Report
                        </button>
                      </div>

                      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden divide-y divide-slate-50">
                        {Array.from(new Set(filteredTransactions.map(t => t.merchant)))
                          .map(merchant => {
                            const mTransactions = filteredTransactions.filter(t => t.merchant === merchant);
                            return {
                              name: merchant,
                              total: mTransactions.reduce((sum, t) => sum + getSignedAmount(t), 0),
                              count: mTransactions.length,
                              category: mTransactions[0]?.category || "Uncategorised"
                            };
                          })
                          .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
                          .slice(0, 5)
                          .map((m, idx) => (
                            <motion.div
                              key={m.name}
                              initial={{ opacity: 0, x: -10 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: idx * 0.05 }}
                              className="p-5 flex items-center justify-between hover:bg-slate-50 transition-all group cursor-pointer active:bg-slate-100"
                              onClick={() => {
                                setFilterQuery(m.name);
                                setActiveTab("history");
                              }}
                            >
                              <div className="flex items-center gap-5">
                                <div className="w-14 h-14 flex items-center justify-center shrink-0 relative group-hover:scale-110 transition-transform">
                                  <MerchantLogo 
                                    merchant={m.name} 
                                    category={m.category} 
                                    className="w-full h-full rounded-2.5xl object-cover p-2" 
                                    iconClassName="w-7 h-7"
                                    isNeg={m.total < 0}
                                    profile={profile}
                                  />
                                </div>
                                <div>
                                  <div className="font-black text-slate-800 text-sm tracking-tight">{m.name}</div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {m.count} {m.count === 1 ? 'Visit' : 'Visits'} this period
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-black text-slate-900 tracking-tighter text-lg">
                                  {formatCurrency(Math.abs(m.total))}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === "savings" ? (
                <motion.div
                  key="savings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="h-full overflow-y-auto no-scrollbar pb-32 space-y-8"
                >
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-4 px-2">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight">Savings</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Track your goals & pots</p>
                    </div>
                    <div className="flex gap-2">
                       <button
                        onClick={() => setShowMoveFunds(true)}
                        className="px-6 py-3 bg-white text-slate-900 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-xl shadow-slate-200/20 flex items-center gap-2"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        Move Funds
                      </button>
                      <button
                        onClick={() => {
                          setEditingBucket(null);
                          setShowBucketForm(true);
                        }}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2"
                      >
                        <PlusCircle className="w-3 h-3" />
                        New Pot
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const savingsTxs = transactions.filter(t => t.category === "Savings & Investments");
                    const definedBucketConfigs: SavingsBucketConfig[] = profile?.savingsBucketsConfig || (profile?.savingsBuckets || []).map(name => ({ id: name, name }) as SavingsBucketConfig);
                    const activeBuckets = Array.from(new Set([...definedBucketConfigs.map(b => b.name), ...savingsTxs.map(t => t.subCategory).filter(Boolean)])) as string[];

                    if (activeBuckets.length === 0 && savingsTxs.length === 0) {
                      return (
                        <div className="py-20 bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/30 flex flex-col items-center justify-center text-center">
                          <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                            <Wallet className="w-10 h-10 text-slate-200" />
                          </div>
                          <h4 className="text-xl font-black text-slate-900">No pots detected</h4>
                          <p className="text-sm text-slate-400 mt-2 max-w-[280px] font-medium leading-relaxed">
                            Create a pot or categorise a transaction as 'Savings' to start tracking.
                          </p>
                        </div>
                      );
                    }

                    const renderBucket = (bucketName: string, isUncategorised: boolean = false) => {
                      const txsInBucket = savingsTxs.filter(t => isUncategorised ? (!t.subCategory || !activeBuckets.includes(t.subCategory)) : t.subCategory === bucketName);
                      if (isUncategorised && txsInBucket.length === 0) return null;

                      const total = txsInBucket.reduce((sum, t) => sum + getSavingsImpact(t), 0);
                      const bucketConfig = definedBucketConfigs.find(b => b.name === bucketName);

                      let monthlyTarget = 0;
                      if (bucketConfig?.target && bucketConfig?.targetDate) {
                        const monthsLeft = Math.max(1, Math.ceil((new Date(bucketConfig.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)));
                        monthlyTarget = Math.max(0, bucketConfig.target - total) / monthsLeft;
                      }
                      
                      const BucketIcon = getBucketIcon(bucketName);

                      // Streak calculation
                      const sortedTxsForStreak = [...txsInBucket].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                      const depositTxs = sortedTxsForStreak.filter(t => getSavingsImpact(t) > 0);
                      const depositMonths = new Set(depositTxs.map(t => new Date(t.date).toISOString().slice(0, 7)));
                      let streak = 0;
                      if (depositTxs.length > 0) {
                        let tempDate = new Date();
                        const currentMonthStr = tempDate.toISOString().slice(0, 7);
                        let hasCurrent = depositMonths.has(currentMonthStr);
                        if (!hasCurrent) {
                          tempDate.setMonth(tempDate.getMonth() - 1);
                          if (depositMonths.has(tempDate.toISOString().slice(0, 7))) {
                             hasCurrent = true;
                          }
                        }
                        if (hasCurrent) {
                          while(depositMonths.has(tempDate.toISOString().slice(0, 7))) {
                            streak++;
                            tempDate.setMonth(tempDate.getMonth() - 1);
                          }
                        }
                      }

                      return (
                        <DroppableBucket key={bucketName} bucketName={bucketName} isUncategorised={isUncategorised} activeBuckets={activeBuckets}>
                          <div className={cn(
                            "bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden flex flex-col h-full",
                            isUncategorised ? "opacity-75 grayscale-[0.5]" : ""
                          )}>
                            <div className="p-8 pb-4">
                               <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-0 mb-6">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="relative">
                                      <div className={cn("w-14 h-14 rounded-2.5xl flex items-center justify-center shrink-0 border-2",
                                        isUncategorised ? "bg-slate-100 border-transparent text-slate-400" : 
                                        streak >= 3 ? "bg-amber-50 border-amber-400 text-amber-600 shadow-[0_0_15px_rgba(251,191,36,0.3)]" : 
                                        streak > 0 ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-indigo-50 border-transparent text-indigo-600"
                                      )}>
                                        <BucketIcon className="w-7 h-7" />
                                      </div>
                                      {streak >= 3 && !isUncategorised && (
                                        <div className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[9px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-amber-500/40 z-10" title={`${streak} month streak!`}>
                                          {streak}
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xl font-black text-slate-900 tracking-tight truncate">{bucketName}</h4>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{txsInBucket.length} transactions</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col lg:items-end">
                                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                                      {formatCurrency(total)}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                      {bucketConfig && !isUncategorised && (
                                        <button onClick={() => { setEditingBucket(bucketConfig); setShowBucketForm(true); }} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><Edit3 className="w-4 h-4" /></button>
                                      )}
                                      {!isUncategorised ? (
                                        <button onClick={() => {
                                          setConfirmDialog({
                                            message: `Remove "${bucketName}"? Transactions will become unallocated.`,
                                            onConfirm: async () => {
                                              const newConfigs = definedBucketConfigs.filter(b => b.name !== bucketName);
                                              const newBuckets = newConfigs.map(b => b.name);
                                              if (profile) {
                                                setProfile({ ...profile, savingsBuckets: newBuckets, savingsBucketsConfig: newConfigs });
                                                await updateUserProfile({ savingsBuckets: newBuckets, savingsBucketsConfig: newConfigs });
                                              }
                                              const txsToClear = savingsTxs.filter(t => t.subCategory === bucketName);
                                              if (txsToClear.length > 0) {
                                                await Promise.all(txsToClear.map(t => updateTransaction(t.id!, { subCategory: null })));
                                                loadData();
                                              }
                                            }
                                          });
                                        }} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                      ) : (
                                        <button onClick={() => {
                                          setConfirmDialog({
                                            message: `Delete all ${txsInBucket.length} unallocated? This is permanent.`,
                                            onConfirm: async () => {
                                              await Promise.all(txsInBucket.map(t => deleteTransaction(t.id!)));
                                              loadData();
                                            }
                                          });
                                        }} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                      )}
                                    </div>
                                  </div>
                               </div>

                               {!isUncategorised && bucketConfig?.target && (
                                 <div className="space-y-3">
                                   <div className="flex justify-between items-end">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                                      <span className="text-sm font-black text-slate-900 tracking-tight">
                                        {Math.round((total / bucketConfig.target) * 100)}%
                                      </span>
                                   </div>
                                    <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, Math.max(0, (total / bucketConfig.target) * 100))}%` }}
                                        className="h-full bg-indigo-500 rounded-full shadow-sm" 
                                      />
                                    </div>
                                    {bucketConfig.targetDate && (
                                      <div className="flex items-center justify-between pt-1">
                                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                           <Clock className="w-3 h-3" />
                                           {format(new Date(bucketConfig.targetDate), "MMM yyyy")}
                                         </span>
                                         {monthlyTarget > 0 && (
                                           <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                                             Need {formatCurrency(monthlyTarget)}/mo
                                           </span>
                                         )}
                                      </div>
                                    )}
                                 </div>
                               )}
                               
                               {!isUncategorised && bucketConfig && (
                                  <BucketInsight bucketConfig={bucketConfig} totalSaved={total} monthlyTarget={monthlyTarget} streak={streak} />
                               )}
                            </div>

                            <div className="flex-1 bg-slate-50/50 p-6 space-y-2 mt-4">
                               {txsInBucket.slice(0, 5).map(tx => (
                                 <motion.div 
                                  key={tx.id} 
                                  className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between group/row cursor-pointer active:scale-[0.98] transition-all"
                                  onClick={() => setEditingTransaction(tx)}
                                 >
                                    <div className="flex items-center gap-3">
                                       <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                       <div>
                                          <div className="text-xs font-black text-slate-800 tracking-tight">{tx.merchant}</div>
                                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(tx.date), "MMM d")}</div>
                                       </div>
                                    </div>
                                    <div className={cn("text-xs font-black tracking-tight", getSavingsImpact(tx) >= 0 ? "text-emerald-500" : "text-slate-900")}>
                                      {getSavingsImpact(tx) >= 0 ? '+' : '-'}{formatCurrency(Math.abs(getSavingsImpact(tx)))}
                                    </div>
                                 </motion.div>
                               ))}
                               {txsInBucket.length > 0 && (
                                 <button 
                                  onClick={() => setViewingBucketTxs({ name: bucketName, txs: txsInBucket })}
                                  className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white rounded-2xl border border-dashed border-slate-200 hover:border-indigo-200 hover:text-indigo-500 transition-all flex items-center justify-center gap-2 group"
                                 >
                                   <History className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                                   {txsInBucket.length > 5 ? `+ ${txsInBucket.length - 5} more transactions` : 'Show Details'}
                                 </button>
                               )}
                               {txsInBucket.length === 0 && (
                                 <div className="py-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest border border-dashed border-slate-100 rounded-[2rem]">
                                   Pots Empty
                                 </div>
                               )}
                            </div>
                          </div>
                        </DroppableBucket>
                      );
                    };

                    return (
                      <DndContext sensors={sensors} onDragEnd={handleDragEndBucket}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {renderBucket("Unallocated", true)}
                          {activeBuckets.map(b => renderBucket(b))}
                        </div>
                      </DndContext>
                    );
                  })()}
                </motion.div>
              ) : activeTab === "bills" ? (
                <motion.div
                  key="bills"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="h-full overflow-y-auto no-scrollbar pb-32 space-y-8"
                >
                  <div className="flex flex-col gap-1 mt-4 px-2">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Bills</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Fixed costs & subscriptions</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/20">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
                      <div className="relative z-10">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] block mb-4">Monthly Commitments</span>
                        <div className="text-5xl font-black tracking-tighter mb-4">
                          {formatCurrency(
                            transactions
                              .filter(t => t.category === "Bills" || t.category === "Subscriptions")
                              .reduce((sum, t) => sum + Math.abs(getSignedAmount(t)), 0)
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                          <Clock className="w-4 h-4 ml-[-4px]" />
                          Next payment in 2 days
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/40 relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-4">Active Subscriptions</span>
                        <div className="text-5xl font-black tracking-tighter text-slate-900 mb-4">
                          {transactions.filter(t => t.category === "Subscriptions").length}
                        </div>
                        <button 
                          onClick={() => setShowRecurringModal(true)}
                          className="flex items-center gap-2 text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:translate-x-1 transition-transform"
                        >
                          Review all recurring
                          <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="px-2">
                       <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Upcoming & Recent</h3>
                    </div>
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden divide-y divide-slate-50">
                      {transactions
                        .filter(t => t.category === "Bills" || t.category === "Subscriptions")
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10)
                        .map((tx) => (
                          <TransactionRow 
                            key={tx.id} 
                            tx={tx} 
                            onClick={() => setEditingTransaction(tx)} 
                            onTagClick={(tag: string) => { if (filterTag === tag) { setFilterTag(""); } else { setFilterTag(tag); } }} filterTag={filterTag}
                            formatCurrency={formatCurrency} 
                            getSignedAmount={getSignedAmount}
                            getMerchantLogo={getMerchantLogo}
                            profile={profile}
                          />
                        ))}
                      {transactions.filter(t => t.category === "Bills" || t.category === "Subscriptions").length === 0 && (
                        <div className="p-12 text-center">
                          <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No bills found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === "analytics" ? (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="h-full flex flex-col gap-6 overflow-y-auto no-scrollbar pb-32"
                >
                  <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full px-2">
                    
                    {/* Header Controls */}
                    <div className="flex flex-col gap-1 mt-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Spending</h2>
                        <button onClick={() => alert('Spending insights and configuration coming soon!')} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 active:scale-90 transition-transform">
                          <AlertCircle className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        Updated today, {format(new Date(), "HH:mm")}
                      </p>
                    </div>

                    {/* primary toggle */}
                    <div className="bg-slate-100/80 p-1.5 rounded-[1.5rem] flex shadow-inner">
                      <button
                        onClick={() => setSpendingView("spending")}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                          spendingView === "spending" ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100" : "text-slate-500"
                        )}
                      >
                        Your spending
                      </button>
                      <button
                        onClick={() => setSpendingView("budget")}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                          spendingView === "budget" ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100" : "text-slate-500"
                        )}
                      >
                        Your budget
                      </button>
                    </div>

                    {/* Month Selector */}
                    <div className="flex items-center gap-3 overflow-x-auto py-1 no-scrollbar lg:justify-center">
                      {[subMonths(new Date(), 2), subMonths(new Date(), 1), new Date()].map((m, i) => {
                        const isSelected = format(m, "MMM yyyy") === format(viewDate, "MMM yyyy") && !isCustomPeriod;
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              setViewDate(m);
                              setIsCustomPeriod(false);
                            }}
                            className={cn(
                              "whitespace-nowrap px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all shrink-0 border",
                              isSelected 
                                ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                                : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                            )}
                          >
                            {format(m, "MMM")}
                          </button>
                        );
                      })}
                      <button 
                         onClick={() => setIsCustomPeriod(true)}
                         className={cn(
                            "whitespace-nowrap px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all shrink-0 border",
                            isCustomPeriod 
                              ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                              : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                         )}
                      >
                        Custom
                      </button>
                    </div>

                    {/* Summary Card */}
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 p-5 xs:p-8 sm:p-10 relative group">
                       <div className="absolute inset-0 rounded-[3rem] overflow-hidden pointer-events-none">
                         <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/50 blur-3xl -mr-24 -mt-24 rounded-full group-hover:bg-indigo-100/50 transition-colors" />
                       </div>
                       
                       {(() => {
                         let startDate: Date;
                         let endDate: Date;
                         if (isCustomPeriod && customStart && customEnd) {
                           startDate = new Date(customStart);
                           endDate = new Date(customEnd);
                         } else {
                           startDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
                           endDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
                         }

                         // Calculate previous month/period dates
                         let prevStartDate: Date;
                         let prevEndDate: Date;
                         if (isCustomPeriod) {
                           const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
                           prevStartDate = new Date(startDate);
                           prevStartDate.setDate(prevStartDate.getDate() - daysCount);
                           prevEndDate = new Date(endDate);
                           prevEndDate.setDate(prevEndDate.getDate() - daysCount);
                         } else {
                           prevStartDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
                           prevEndDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0);
                         }

                         // Filter entire transactions list for previous period expenses (getSignedAmount < 0)
                         const prevPeriodTransactions = transactions.filter(t => {
                           if (isMetaData(t)) return false;
                           
                           const matchesQuery = !filterQuery || t.merchant.toLowerCase().includes(filterQuery.toLowerCase()) || (t.rawText && t.rawText.toLowerCase().includes(filterQuery.toLowerCase()));
                           const matchesCategory = !filterCategory || t.category === filterCategory;
                           const matchesTag = !filterTag || (t.tags && t.tags.includes(filterTag));
                           const matchesReceipt = !filterWithReceipts || (!!t.receiptBase64 || !!t.screenshotId);

                           if (!matchesQuery || !matchesCategory || !matchesTag || !matchesReceipt) return false;

                           const txDate = new Date(t.date);
                           if (getSignedAmount(t) >= 0) return false;
                           return txDate >= prevStartDate && txDate <= prevEndDate;
                         });

                         // Group current period daily totals
                         const dailyStats = filteredTransactions
                           .filter(t => getSignedAmount(t) < 0)
                           .reduce((acc, t) => {
                             const dateStr = format(new Date(t.date), "yyyy-MM-dd");
                             if (!acc[dateStr]) {
                               acc[dateStr] = { total: 0, categories: {} as Record<string, number> };
                             }
                             acc[dateStr].total += Math.abs(getSignedAmount(t));
                             const cat = t.category || "Uncategorised";
                             acc[dateStr].categories[cat] = (acc[dateStr].categories[cat] || 0) + Math.abs(getSignedAmount(t));
                             return acc;
                           }, {} as Record<string, { total: number, categories: Record<string, number> }>);

                         // Group previous period daily totals
                         const prevDaily = prevPeriodTransactions
                           .reduce((acc, t) => {
                             const dateStr = format(new Date(t.date), "yyyy-MM-dd");
                             acc[dateStr] = (acc[dateStr] || 0) + Math.abs(getSignedAmount(t));
                             return acc;
                           }, {} as Record<string, number>);

                         // Populate consecutive daily spend arrays for mapping
                         const prevDaysCount = Math.ceil((prevEndDate.getTime() - prevStartDate.getTime()) / (1000 * 3600 * 24)) + 1;
                         const prevDailyValues = Array(prevDaysCount).fill(0);
                         for (let i = 0; i < prevDaysCount; i++) {
                           const d = new Date(prevStartDate);
                           d.setDate(d.getDate() + i);
                           const dateStr = format(d, "yyyy-MM-dd");
                           prevDailyValues[i] = prevDaily[dateStr] || 0;
                         }

                         const daysDiff = Math.min(Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1, 90);
                         const chartData = [];
                         let cumulative = 0;
                         let cumulativePrev = 0;

                         const isCurrentMonth = format(viewDate, "yyyy-MM") === format(new Date(), "yyyy-MM") && !isCustomPeriod;
                         const todayDay = isCurrentMonth ? new Date().getDate() : 999;

                         for (let i = 0; i < daysDiff; i++) {
                           const currentDate = new Date(startDate);
                           currentDate.setDate(currentDate.getDate() + i);
                           const dateStr = format(currentDate, "yyyy-MM-dd");
                           const stats = dailyStats[dateStr];
                           const dailyAmount = stats ? stats.total : 0;
                           
                           if (i + 1 <= todayDay) {
                             cumulative += dailyAmount;
                           }
                           
                           const prevDailyAmount = i < prevDaysCount ? prevDailyValues[i] : 0;
                           cumulativePrev += prevDailyAmount;

                           const topCategories = stats 
                             ? Object.entries(stats.categories)
                                 .map(([name, amount]) => ({ name, amount }))
                                 .sort((a, b) => b.amount - a.amount)
                                 .slice(0, 3)
                             : [];

                           chartData.push({ 
                             day: i + 1,
                             amount: (i + 1 <= todayDay) ? cumulative : null,
                             prevAmount: cumulativePrev,
                             dailyAmount: (i + 1 <= todayDay) ? dailyAmount : 0,
                             dailyAmountPrev: prevDailyAmount,
                             dateFormatted: format(currentDate, "d MMM yyyy"),
                             prevDateFormatted: i < prevDaysCount 
                               ? format(new Date(prevStartDate.getTime() + i * 24 * 3600 * 1000), "d MMM yyyy") 
                               : "",
                             topCategories
                           });
                         }

                         // Calculate general header totals
                         const currentPeriodTotalExpenses = Math.abs(filteredTransactions.filter(t => getSignedAmount(t) < 0).reduce((sum, t) => sum + getSignedAmount(t), 0));
                         const previousTotalExpenses = prevPeriodTransactions.reduce((sum, t) => sum + Math.abs(getSignedAmount(t)), 0);
                         const prevTotalToCompare = isCurrentMonth
                           ? prevPeriodTransactions
                               .filter(t => new Date(t.date).getDate() <= todayDay)
                               .reduce((sum, t) => sum + Math.abs(getSignedAmount(t)), 0)
                           : previousTotalExpenses;

                         const diff = currentPeriodTotalExpenses - prevTotalToCompare;
                         const isSaving = diff <= 0;
                         const absDiff = Math.abs(diff);

                         const compareDay = isCurrentMonth ? Math.min(new Date().getDate(), daysDiff) : daysDiff;
                         const todayDataItem = chartData.find(d => d.day === compareDay);
                         const badgePrevVal = todayDataItem ? todayDataItem.prevAmount : prevTotalToCompare;
                         const badgePrevLabel = isCustomPeriod 
                           ? "vs. previous active period" 
                           : `vs. ${compareDay} ${format(prevStartDate, "MMMM")}`;

                         return (
                           <>
                             <div className="flex items-center justify-between mb-2 relative z-10">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">{format(viewDate, "MMMM")} spend</span>
                               <button onClick={() => setBreakdownView(breakdownView === 'categories' ? 'merchants' : 'categories')} className="px-5 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all active:scale-95">
                                 <Edit3 className="w-3 h-3" />
                                 Personalise
                               </button>
                             </div>

                             <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 mb-8 relative z-10">
                                <div className="text-3xl xs:text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter select-text">
                                  {formatCurrency(currentPeriodTotalExpenses)}
                                </div>
                                <div className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black tracking-widest uppercase transition-all whitespace-nowrap border shrink-0",
                                  isSaving 
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" 
                                    : "bg-rose-50 text-rose-600 border-rose-100/50"
                                )}>
                                  {isSaving ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                  <span>{formatCurrency(absDiff)} {isSaving ? "less" : "more"}</span>
                                </div>
                              </div>

                              {/* Line Chart */}
                              <SpendingChart 
                                data={chartData} 
                                isSaving={isSaving}
                                badgePrevVal={badgePrevVal}
                                badgePrevLabel={badgePrevLabel}
                              />
                           </>
                         );
                       })()}

                       <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-[0.15em]">
                         <span>1 {format(viewDate, "MMM")}</span>
                         <span>{new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()} {format(viewDate, "MMM")}</span>
                       </div>
                    </div>

                    {/* Breakdown Toggle */}
                    <div className="flex flex-col gap-4">
                      {(filterCategory || filterQuery || filterTag) && (
                        <div className="flex items-center gap-2 px-1 flex-wrap">
                          {filterCategory && (
                            <div className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 animate-fade-in shadow-sm border border-indigo-100/50">
                              {filterCategory}
                              <button onClick={() => setFilterCategory("")} className="hover:text-indigo-900 transition-colors bg-indigo-100/50 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                            </div>
                          )}
                          {filterQuery && (
                            <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 animate-fade-in shadow-sm border border-emerald-100/50">
                              {filterQuery}
                              <button onClick={() => setFilterQuery("")} className="hover:text-emerald-900 transition-colors bg-emerald-100/50 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                            </div>
                          )}
                          {filterTag && (
                            <div className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 animate-fade-in shadow-sm border border-rose-100/50">
                              <Tag className="w-3 h-3" />
                              {filterTag}
                              <button onClick={() => setFilterTag("")} className="hover:text-rose-900 transition-colors bg-rose-100/50 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1">
                       <div className="bg-slate-100/50 p-1 rounded-2xl grid grid-cols-2 gap-1 md:flex md:flex-row md:flex-nowrap md:gap-0 w-full transition-all">
                        <button
                          onClick={() => setBreakdownView("categories")}
                          className={cn(
                            "py-2 px-1 md:px-0 md:py-2.5 md:flex-1 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all text-center",
                            breakdownView === "categories" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                          )}
                        >
                          Categories
                        </button>
                        <button
                          onClick={() => setBreakdownView("merchants")}
                          className={cn(
                            "py-2 px-1 md:px-0 md:py-2.5 md:flex-1 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all text-center",
                            breakdownView === "merchants" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                          )}
                        >
                          Merchants
                        </button>
                        <button
                          onClick={() => setBreakdownView("tags")}
                          className={cn(
                            "py-2 px-1 md:px-0 md:py-2.5 md:flex-1 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all text-center",
                            breakdownView === "tags" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                          )}
                        >
                          Tags
                        </button>
                        <button
                          onClick={() => setBreakdownView("transactions")}
                          className={cn(
                            "py-2 px-1 md:px-0 md:py-2.5 md:flex-1 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all text-center",
                            breakdownView === "transactions" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                          )}
                        >
                          Transactions
                        </button>
                      </div>
                      <button onClick={() => {
                        const views: ("categories" | "merchants" | "tags" | "transactions")[] = ['categories', 'merchants', 'tags', 'transactions'];
                        const nextIndex = (views.indexOf(breakdownView) + 1) % views.length;
                        setBreakdownView(views[nextIndex]);
                      }} className="w-10 h-10 ml-1 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm transition-transform active:scale-95 shrink-0 select-none">
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>
                    </div>

                    {/* Categorised List */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden">
                      {breakdownView === "transactions" ? (
                        <div className="flex flex-col">
                           {(() => {
                             const groups = filteredTransactions.reduce((acc, tx) => {
                               const date = format(new Date(tx.date), "yyyy-MM-dd");
                               if (!acc[date]) acc[date] = [];
                               acc[date].push(tx);
                               return acc;
                             }, {} as Record<string, Transaction[]>);

                             const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

                             if (sortedDates.length === 0) {
                               return (
                                 <div className="py-20 text-center flex flex-col items-center justify-center p-8">
                                   <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                                     <Search className="w-10 h-10 text-slate-200" />
                                   </div>
                                   <h4 className="text-xl font-black text-slate-900 tracking-tight">No results</h4>
                                   <p className="text-sm text-slate-400 mt-2 font-medium">Try a different filter.</p>
                                 </div>
                               );
                             }

                             return sortedDates.map(dateStr => (
                               <div key={dateStr} className="space-y-0">
                                 <div className="bg-slate-50 px-5 py-3 border-y border-slate-100 first:border-t-0">
                                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                     {format(new Date(dateStr), "EEEE, MMMM do")}
                                   </h5>
                                 </div>
                                 <div className="divide-y divide-slate-50">
                                     {groups[dateStr].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
                                      <TransactionRow 
                                        key={tx.id} 
                                        tx={tx} 
                                        onClick={() => setEditingTransaction(tx)} 
                                        onTagClick={(tag: string) => { if (filterTag === tag) { setFilterTag(""); } else { setFilterTag(tag); } }} filterTag={filterTag}
                                        formatCurrency={formatCurrency} 
                                        getSignedAmount={getSignedAmount}
                                        getMerchantLogo={getMerchantLogo}
                                        profile={profile}
                                      />
                                     ))}
                                 </div>
                               </div>
                             ));
                           })()}
                        </div>
                      ) : (() => {
                        const items = breakdownView === "categories" 
                          ? Array.from(new Set(filteredTransactions.map(t => t.category).filter(Boolean)))
                            .map(cat => {
                              const txs = filteredTransactions.filter(t => t.category === cat);
                              return {
                                name: cat,
                                total: txs.reduce((sum, t) => sum + getSignedAmount(t), 0),
                                count: txs.length,
                                tags: Array.from(new Set(txs.flatMap(t => t.tags || []))),
                                icon: getCategoryIconComponent(cat, profile),
                                colors: getCategoryColorComponent(cat, profile)
                              }
                            })
                          : breakdownView === "merchants" ? Array.from(new Set(filteredTransactions.map(t => t.merchant).filter(Boolean)))
                            .map(merch => {
                              const txs = filteredTransactions.filter(t => t.merchant === merch);
                              return {
                                name: merch,
                                total: txs.reduce((sum, t) => sum + getSignedAmount(t), 0),
                                count: txs.length,
                                tags: Array.from(new Set(txs.flatMap(t => t.tags || []))),
                                icon: Tag,
                                colors: CATEGORY_COLORS["Uncategorised"]
                              };
                            })
                          : Array.from(new Set(filteredTransactions.flatMap(t => t.tags || []).filter(Boolean)))
                            .map(tag => {
                              const txs = filteredTransactions.filter(t => t.tags?.includes(tag));
                              return {
                                name: tag,
                                total: txs.reduce((sum, t) => sum + getSignedAmount(t), 0),
                                count: txs.length,
                                tags: [], // no tags for tag view to prevent recursion
                                icon: Tag,
                                colors: CATEGORY_COLORS["Uncategorised"]
                              };
                            });

                         // Group items into spend analysis and excluded
                         const spendAnalysis = items.filter(i => i.total < 0).sort((a,b) => a.total - b.total);
                         const excluded = items.filter(i => i.total >= 0).sort((a,b) => b.total - a.total);

                         const renderRow = (item: any, idx: number) => (
    <motion.div 
      key={item.name} 
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.03 }}
      className="flex items-center justify-between p-5 hover:bg-slate-50 transition-all group border-b border-slate-50 last:border-0 cursor-pointer active:bg-slate-100"
      onClick={() => {
        resetFilters();
        if (breakdownView === "categories") {
          setFilterCategory(item.name);
          setBreakdownView("merchants");
        } else if (breakdownView === "merchants") {
          setFilterQuery(item.name);
          setBreakdownView("transactions");
        } else if (breakdownView === "tags") {
          setFilterTag(item.name);
          setBreakdownView("transactions");
        } else {
          setFilterQuery(item.name);
          setActiveTab("history");
        }
      }}
    >
      <div className="flex items-center gap-3 xs:gap-5 min-w-0 flex-1 mr-3">
        {breakdownView === "categories" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingCategoryIconFor(item.name);
            }}
            className="w-14 h-14 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shrink-0"
            title="Change Emblem"
          >
            <item.icon className={cn("w-7 h-7", item.colors.text)} />
          </button>
        ) : (
          <div className="w-14 h-14 flex items-center justify-center transition-transform group-hover:scale-110 shrink-0">
            <item.icon className={cn("w-7 h-7", item.colors.text)} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-black text-slate-800 text-sm tracking-tight truncate">{item.name}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap mt-0.5">
            {item.count} {item.count === 1 ? 'Transaction' : 'Transactions'}
          </div>
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 xs:gap-1 mt-1.5">
              {item.tags.slice(0, 3).map((tag: string) => (
                <span key={tag} className={cn("relative text-[9px] sm:text-[8px] font-bold px-2.5 py-1.5 xs:px-2 xs:py-1 sm:px-1.5 sm:py-0.5 rounded-md uppercase tracking-wider transition-colors cursor-pointer before:absolute before:-inset-2.5", filterTag === tag ? "bg-rose-100 text-rose-600 hover:bg-rose-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200")} onClick={(e) => { e.stopPropagation(); if (filterTag === tag) { setFilterTag(""); } else { setFilterTag(tag); } }}>
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="text-[9px] sm:text-[8px] font-bold text-slate-400">+{item.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
                               <div className="font-black text-slate-900 tracking-tighter text-lg">
                                 {formatCurrency(Math.abs(item.total))}
                               </div>
                             </div>
                           </motion.div>
                         );

                         return (
                           <div className="divide-y divide-slate-50">
                             {spendAnalysis.map(renderRow)}
                             {excluded.length > 0 && (
                               <div className="bg-slate-50/50 p-6">
                                 <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Excluded from analysis</h4>
                                 <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                                   {excluded.map(renderRow)}
                                 </div>
                               </div>
                             )}
                           </div>
                         );
                      })()}
                    </div>

                    <button 
                      onClick={() => setShowCategoryManager(true)}
                      className="w-full py-5 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      <Edit2 className="w-4 h-4" />
                      Manage Categories
                    </button>
                  </div>
                </motion.div>
              ) : activeTab === "screenshots" ? (
                <motion.div
                  key="screenshots"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full overflow-y-auto pr-2 pb-10"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Add Transaction Card */}
                    <div 
                      onClick={() => {
                        setManualTx({
                          ...manualTx,
                          date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                          screenshotId: undefined
                        });
                        setShowManualTransaction(true);
                      }}
                      className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center gap-4 text-center group cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                    >
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:bg-white group-hover:shadow-lg transition-all">
                        <Plus className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">Add Transaction</h4>
                        <p className="text-xs text-slate-400 mt-1">Manually enter a record here</p>
                      </div>
                    </div>

                    {filteredScreenshots.map((snap) => (
                      <ScreenshotCard
                        key={snap.id}
                        snap={snap}
                        transactions={transactions}
                        categories={allAvailableCategories}
                        onDelete={handleDeleteScreenshot}
                        onEditTx={setEditingTransaction}
                        onAddTxToSnap={() => {
                          setManualTx({
                            ...manualTx,
                            date: format(new Date(snap.createdAt), "yyyy-MM-dd'T'HH:mm"),
                            screenshotId: snap.id
                          });
                          setShowManualTransaction(true);
                        }}
                        onSelect={() => setSelectedScreenshot(snap)}
                        onConsolidate={async () => {
                          const snapTxs = transactions.filter(t => t.screenshotId === snap.id);
                          let balToUse = snap.balance;
                          if (balToUse === undefined) {
                            const input = window.prompt("Enter the final balance for this screenshot (e.g. 150.00):");
                            if (!input) return;
                            balToUse = Number(input);
                            if (isNaN(balToUse)) {
                              alert("Invalid number.");
                              return;
                            }
                          }

                          setConfirmDialog({
                            message: `Consolidate ${snapTxs.length} transactions into a single Savings balance of ${formatCurrency(balToUse!)}?`,
                            onConfirm: async () => {
                              await Promise.all(snapTxs.map(t => t.id ? deleteTransaction(t.id) : Promise.resolve()));
                              await saveTransaction({
                                amount: balToUse!,
                                merchant: `Closing Balance (${snap.name})`,
                                category: "Savings & Investments",
                                type: "expense",
                                date: new Date().toISOString(),
                                screenshotId: snap.id
                              });
                              await loadData();
                            }
                          });
                        }}
                        onBulkTag={async (newCat) => {
                          const snapTxs = transactions.filter(t => t.screenshotId === snap.id);
                          const txIds = snapTxs.map(t => t.id).filter(Boolean) as string[];
                          
                          if (newCat === "Savings & Investments") {
                            setBulkPotTarget({
                              transactionIds: txIds,
                              category: newCat,
                              onComplete: () => loadData()
                            });
                          } else {
                            setConfirmDialog({
                              message: `Mark all ${snapTxs.length} transactions in this screenshot as ${newCat}?`,
                              onConfirm: async () => {
                                const updates = txIds.map(id => updateTransaction(id, { category: newCat }));
                                await Promise.all(updates);
                                await loadData();
                              }
                            });
                          }
                        }}
                      />
                    ))}
                    {screenshots.length === 0 && (
                      <div className="col-span-full py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                        <ImageIcon className="w-12 h-12 text-slate-200 mb-4" />
                        <h3 className="font-bold text-slate-300">
                          No raw scans found
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 max-w-[200px]">
                          Upload screenshots to see them here.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : activeTab === "rules" ? (
                <motion.div
                  key="rules"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="h-full overflow-y-auto no-scrollbar pb-32 space-y-8"
                >
                  <div className="flex flex-col gap-1 mt-4 px-2">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Automation</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Custom categorization rules</p>
                  </div>
                  <RuleManager rules={rules} categories={allAvailableCategories} onUpdate={loadData} />
                </motion.div>

              ) : activeTab === "history" || activeTab === "export" ? (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="h-full overflow-y-auto no-scrollbar pb-32 space-y-8"
                >
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-4 px-2">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                        {activeTab === "history" ? "Activity" : "Export"}
                      </h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
                        {activeTab === "history" ? "Transaction log" : "Download your data"}
                      </p>
                    </div>
                    {activeTab === "history" && (
                      <div className="flex gap-2">
                        <div className="relative group/search">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors" />
                          <input
                            type="text"
                            placeholder="Search..."
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                            className="pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-100 w-[200px] shadow-xl shadow-slate-200/20 transition-all focus:w-[280px]"
                          />
                        </div>
                        <button
                          onClick={() => setShowFilters(true)}
                          className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-xl shadow-slate-200/20"
                        >
                          <Filter className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {activeTab === "export" ? (
                    <div className="max-w-md mx-auto py-12">
                       <div className="bg-slate-900 rounded-[3rem] p-12 text-white text-center shadow-2xl shadow-slate-900/40 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent)] pointer-events-none" />
                        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8">
                          <Download className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight mb-4">Export CSV</h2>
                        <p className="text-slate-400 text-sm font-medium mb-10 leading-relaxed">
                          Download your {filteredTransactions.length} transactions in CSV format.
                        </p>
                        <button
                            onClick={handleExportCsv}
                            className="w-full py-5 bg-white text-slate-900 rounded-2.5xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-950"
                          >
                            <Download className="w-4 h-4" />
                            Download CSV
                          </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const groups = filteredTransactions.reduce((acc, tx) => {
                          const date = format(new Date(tx.date), "yyyy-MM-dd");
                          if (!acc[date]) acc[date] = [];
                          acc[date].push(tx);
                          return acc;
                        }, {} as Record<string, Transaction[]>);

                        const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

                        if (sortedDates.length === 0) {
                          return (
                            <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/30">
                              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                                <Search className="w-10 h-10 text-slate-200" />
                              </div>
                              <h4 className="text-xl font-black text-slate-900 tracking-tight">No results</h4>
                              <p className="text-sm text-slate-400 mt-2 font-medium">Try a different filter.</p>
                            </div>
                          );
                        }

                        return sortedDates.map(dateStr => (
                          <div key={dateStr} className="space-y-3">
                            <div className="px-4">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                {format(new Date(dateStr), "EEEE, MMMM do")}
                              </h5>
                            </div>
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden divide-y divide-slate-50">
                                {groups[dateStr].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
                                  <TransactionRow 
                                    key={tx.id} 
                                    tx={tx} 
                                    onClick={() => setEditingTransaction(tx)} 
                                    onTagClick={(tag: string) => { if (filterTag === tag) { setFilterTag(""); } else { setFilterTag(tag); } }} filterTag={filterTag}
                                    formatCurrency={formatCurrency} 
                                    getSignedAmount={getSignedAmount}
                                    getMerchantLogo={getMerchantLogo}
                                    profile={profile}
                                  />
                                ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </section>
      </div>

      {/* Filters Modal */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white max-w-sm w-full rounded-[2rem] shadow-2xl overflow-hidden p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                    Category
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none appearance-none cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    {allAvailableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                    Tag
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by tag..."
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                     onClick={() => setFilterWithReceipts(!filterWithReceipts)}>
                  <div className={cn(
                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                    filterWithReceipts ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"
                  )}>
                    {filterWithReceipts && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-xs font-bold text-slate-700">Only with receipts</span>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setFilterQuery("");
                      setFilterCategory("");
                      setFilterTag("");
                      setFilterStartDate("");
                      setFilterEndDate("");
                      setFilterWithReceipts(false);
                    }}
                    className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Reset All Filters
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bucket Transactions Modal */}
      <AnimatePresence>
        {viewingBucketTxs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            onClick={() => setViewingBucketTxs(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl max-h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-10 pb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">{viewingBucketTxs.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1">Transaction Breakdown</p>
                </div>
                <button
                  onClick={() => setViewingBucketTxs(null)}
                  className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-10 pt-0 space-y-4">
                {viewingBucketTxs.txs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
                  <div 
                    key={tx.id} 
                    className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 flex items-center justify-center relative shrink-0">
                        <MerchantLogo 
                          merchant={tx.merchant} 
                          category={tx.category} 
                          className="w-full h-full rounded-2xl object-cover" 
                          iconClassName="w-7 h-7"
                          getMerchantLogo={getMerchantLogo} 
                          isNeg={getSavingsImpact(tx) < 0}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900 tracking-tight">{tx.merchant}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{format(new Date(tx.date), "EEEE, MMMM do")}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className={cn("text-lg font-black tracking-tighter", getSavingsImpact(tx) >= 0 ? "text-emerald-500" : "text-slate-900")}>
                        {getSavingsImpact(tx) >= 0 ? '+' : '-'}{formatCurrency(Math.abs(getSavingsImpact(tx)))}
                      </div>
                      <button 
                        onClick={async () => {
                          if (confirm('Delete this transaction?')) {
                             await deleteTransaction(tx.id!);
                             loadData();
                             setViewingBucketTxs(prev => prev ? ({ ...prev, txs: prev.txs.filter(t => t.id !== tx.id) }) : null);
                          }
                        }}
                        className="p-3 bg-white text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {viewingBucketTxs.txs.length === 0 && (
                  <div className="py-20 text-center">
                    <p className="text-slate-400 font-medium italic">Empty</p>
                  </div>
                )}
              </div>

              {viewingBucketTxs.name === "Unallocated" && viewingBucketTxs.txs.length > 0 && (
                <div className="p-10 bg-slate-50 border-t border-slate-100">
                   <button 
                    onClick={() => {
                      setConfirmDialog({
                        message: `Delete all ${viewingBucketTxs.txs.length} unallocated? This is permanent.`,
                        onConfirm: async () => {
                          await Promise.all(viewingBucketTxs.txs.map(t => deleteTransaction(t.id!)));
                          loadData();
                          setViewingBucketTxs(null);
                        }
                      });
                    }}
                    className="w-full py-5 bg-red-50 text-red-600 rounded-2.5xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all"
                   >
                    Purge All Unallocated
                   </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screenshot Viewer Modal */}
      <AnimatePresence>
        {selectedScreenshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
            onClick={() => setSelectedScreenshot(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between text-white bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <div className="text-sm font-bold truncate">
                      {selectedScreenshot.name}
                    </div>
                    {selectedScreenshot.balance !== undefined && (
                      <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                        Extracted Bal: {formatCurrency(selectedScreenshot.balance)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const snapTxs = transactions.filter(t => t.screenshotId === selectedScreenshot.id);
                      if (snapTxs.length === 0) return;
                      
                      let balToUse = selectedScreenshot.balance;
                      if (balToUse === undefined) {
                        const input = window.prompt("Enter the final balance for this screenshot (e.g. 150.00):");
                        if (!input) return;
                        balToUse = Number(input);
                        if (isNaN(balToUse)) {
                          alert("Invalid number.");
                          return;
                        }
                      }

                      setConfirmDialog({
                        message: `Consolidate ${snapTxs.length} transactions into a single Savings balance of ${formatCurrency(balToUse)}?`,
                        onConfirm: async () => {
                          // Delete all extracted individual txs for this screenshot
                          await Promise.all(snapTxs.map(t => t.id ? deleteTransaction(t.id) : Promise.resolve()));
                          // Create one big balance transaction
                          await saveTransaction({
                            amount: balToUse,
                            merchant: `Closing Balance (${selectedScreenshot.name})`,
                            category: "Savings & Investments",
                            type: "expense",
                            date: new Date().toISOString(),
                            screenshotId: selectedScreenshot.id
                          });
                          await loadData();
                        }
                      });
                    }}
                    className="px-3 py-1.5 text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors whitespace-nowrap"
                  >
                    Group as Balance
                  </button>
                  <select
                    onChange={async (e) => {
                      const newCat = e.target.value;
                      if (!newCat) return;
                      const snapTxs = transactions.filter(t => t.screenshotId === selectedScreenshot.id);
                      const txIds = snapTxs.map(t => t.id).filter(Boolean) as string[];
                      if (txIds.length === 0) return;

                      if (newCat === "Savings & Investments") {
                        setBulkPotTarget({
                          transactionIds: txIds,
                          category: newCat,
                          onComplete: () => loadData()
                        });
                      } else {
                        setConfirmDialog({
                          message: `Mark all ${txIds.length} transactions in this screenshot as ${newCat}?`,
                          onConfirm: async () => {
                            const updates = txIds.map(id => updateTransaction(id, { category: newCat }));
                            await Promise.all(updates);
                            await loadData();
                          }
                        });
                      }
                      e.target.value = "";
                    }}
                    className="pl-3 pr-8 py-1.5 text-[10px] font-bold bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors cursor-pointer outline-none border-none"
                  >
                    <option value="">Bulk Tag All...</option>
                    {allAvailableCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSelectedScreenshot(null)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 flex items-center justify-center min-h-[300px] max-h-[50vh] overflow-y-auto">
                <img
                  src={selectedScreenshot.base64}
                  className="max-w-full h-auto rounded-xl shadow-inner shadow-black"
                  alt=""
                />
              </div>
              {(() => {
                const snapTxs = transactions.filter(t => t.screenshotId === selectedScreenshot.id);

                const categoryTotals = snapTxs.reduce((acc, tx) => {
                  const cat = tx.category || 'Uncategorised';
                  if (!acc[cat]) acc[cat] = 0;
                  acc[cat] += getSignedAmount(tx);
                  return acc;
                }, {} as Record<string, number>);
                const netTotal = Math.round(snapTxs.reduce((sum, tx) => sum + getSignedAmount(tx), 0) * 100) / 100;
                const trackingTotal = Math.round(snapTxs.reduce((sum, tx) => {
                  if (isTrackingExpense(tx)) return sum - Math.abs(getSignedAmount(tx));
                  if (isTrackingIncome(tx)) return sum + Math.abs(getSignedAmount(tx));
                  return sum;
                }, 0) * 100) / 100;
                
                const moneyIn = snapTxs.reduce((sum, tx) => {
                  const amt = getSignedAmount(tx);
                  return amt > 0 ? sum + amt : sum;
                }, 0);
                
                const moneyOut = snapTxs.reduce((sum, tx) => {
                  const amt = getSignedAmount(tx);
                  return amt < 0 ? sum + Math.abs(amt) : sum;
                }, 0);

                return (
                  <div className="p-4 bg-slate-800/30 flex flex-col gap-3 border-t border-white/10">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">
                      Extracted Transactions ({snapTxs.length})
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {snapTxs.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-white/5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">{tx.merchant}</span>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400">{tx.category}</span>
                          </div>
                          <span className={cn("text-sm font-bold", getSignedAmount(tx) >= 0 ? 'text-emerald-400' : 'text-white')}>
                            {getSignedAmount(tx) >= 0 ? '+' : '-'}{formatCurrency(Math.abs(getSignedAmount(tx)))}
                          </span>
                        </div>
                      ))}
                      
                      {snapTxs.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                              <div className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">Inflow</div>
                              <div className="text-xs font-bold text-emerald-400">+{formatCurrency(moneyIn)}</div>
                            </div>
                            <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Outflow</div>
                              <div className="text-xs font-bold text-slate-300">-{formatCurrency(moneyOut)}</div>
                            </div>
                          </div>
                          
                          {Object.entries(categoryTotals).map(([cat, total]) => (
                            <div key={cat} className="flex justify-between items-center text-xs">
                              <span className="text-slate-400 font-medium">{cat}</span>
                              <span className={cn("font-bold", total >= 0 ? "text-emerald-400" : "text-slate-300")}>
                                {total >= 0 ? '+' : '-'}{formatCurrency(Math.abs(total))}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                            <div className="flex flex-col">
                              <span className="text-white font-bold uppercase tracking-wider text-[10px]">Net Extracted Flow</span>
                              {Math.abs(trackingTotal) > 0.01 && (
                                <span className="text-white/40 text-[8px] uppercase tracking-tighter">
                                  Budget Impact: {trackingTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(trackingTotal))}
                                </span>
                              )}
                            </div>
                            <span className={cn("font-bold text-sm", netTotal >= 0 ? "text-emerald-400" : "text-white")}>
                              {netTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netTotal))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction Edit Modal */}
      <AnimatePresence>
        {editingTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingTransaction(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white max-w-lg w-full rounded-[2.5rem] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <div className="relative group/emblem">
                      <div className="w-16 h-16 flex items-center justify-center relative shrink-0">
                        <MerchantLogo 
                          merchant={editingTransaction.merchant} 
                          category={editingTransaction.category} 
                          className="w-full h-full rounded-3xl object-cover border border-slate-100 shadow-sm bg-white" 
                          iconClassName="w-9 h-9"
                          getMerchantLogo={getMerchantLogo} 
                          isNeg={getSignedAmount(editingTransaction) < 0}
                          profile={profile}
                        />
                      </div>
                      <button
                        onClick={() => setIsEditingTransactionIcon(!isEditingTransactionIcon)}
                        className="absolute -bottom-1 -right-1 bg-white text-slate-500 rounded-lg p-1.5 shadow-md opacity-0 group-hover/emblem:opacity-100 transition-opacity z-10 hover:text-indigo-600 hover:scale-110 active:scale-95 border border-slate-100"
                        title="Change Category Emblem"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        Edit Transaction
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Recorded: {format(new Date(editingTransaction.date), "PPP")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingTransaction(null)}
                    className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all self-start"
                  >
                    <X className="w-6 h-6 text-slate-300 hover:text-slate-900" />
                  </button>
                </div>
                
                <AnimatePresence>
                  {isEditingTransactionIcon && (
                     <motion.div 
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: "auto", opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       className="overflow-hidden"
                     >
                       <div className="pt-2 border-t border-slate-100/50">
                         <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Select Category Emblem</p>
                         <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                           {Object.keys(ICON_LIBRARY).map(iconName => {
                             const LibraryIcon = ICON_LIBRARY[iconName];
                             const cat = editingTransaction.category;
                             if (!cat) return null;
                             
                             const isActive = (profile?.categoryIcons?.[cat] === iconName) || (!profile?.categoryIcons?.[cat] && CATEGORY_ICONS[cat] === LibraryIcon);
                             return (
                               <button 
                                 key={iconName}
                                 onClick={async () => {
                                   if (profile) {
                                     const updatedIcons = { ...profile.categoryIcons, [cat]: iconName };
                                     setProfile({ ...profile, categoryIcons: updatedIcons });
                                     await updateUserProfile({ categoryIcons: updatedIcons });
                                   }
                                 }}
                                 className={cn(
                                   "aspect-square rounded-xl flex items-center justify-center transition-all hover:scale-110",
                                   isActive ? "bg-indigo-100 text-indigo-600 border border-indigo-200" : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-100 shadow-sm"
                                 )}
                               >
                                 <LibraryIcon className="w-4 h-4" />
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] no-scrollbar">
                <div className="space-y-4">
                  {/* Receipt Preview/Upload at Top for Prominence */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 flex items-center justify-between">
                      <span>Receipt / Proof of Purchase</span>
                      {editingTransaction.receiptBase64 && (
                        <button 
                          onClick={() => setEditingTransaction({ ...editingTransaction, receiptBase64: undefined })}
                          className="text-red-500 hover:text-red-600 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </label>
                    <div className="relative">
                      {editingTransaction.receiptBase64 ? (
                        <div className="w-full h-48 rounded-[2rem] border border-slate-200 overflow-hidden bg-slate-50 relative group">
                          <img src={editingTransaction.receiptBase64} className="w-full h-full object-cover" alt="Receipt" />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                             <label className="bg-white text-slate-900 px-6 py-2 rounded-xl text-xs font-black cursor-pointer hover:bg-indigo-50 active:scale-95 transition-all">
                               Replace
                               <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setEditingTransaction({
                                        ...editingTransaction,
                                        receiptBase64: reader.result as string
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                             </label>
                          </div>
                        </div>
                      ) : (
                        <label className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer transition-all group">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              <ImageIcon className="w-5 h-5 flex-shrink-0" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Attach Receipt Image</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setEditingTransaction({
                                    ...editingTransaction,
                                    receiptBase64: reader.result as string
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      Merchant
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 outline-none"
                      value={editingTransaction.merchant}
                      onChange={(e) =>
                        setEditingTransaction({
                          ...editingTransaction,
                          merchant: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                        Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          £
                        </span>
                        <input
                          type="number"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-8 pr-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 outline-none"
                          value={editingTransaction.amount}
                          onChange={(e) =>
                            setEditingTransaction({
                              ...editingTransaction,
                              amount: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                        Date
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 outline-none"
                        value={format(
                          new Date(editingTransaction.date),
                          "yyyy-MM-dd'T'HH:mm",
                        )}
                        onChange={(e) =>
                          setEditingTransaction({
                            ...editingTransaction,
                            date: new Date(e.target.value).toISOString(),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                        Category
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsEditingTxCategoryOpen(!isEditingTxCategoryOpen)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 outline-none flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {(() => {
                              const IconComp = getCategoryIconComponent(editingTransaction.category || "Uncategorised", profile);
                              return <IconComp className="w-4 h-4 text-slate-500" />;
                            })()}
                            <span className="truncate">{editingTransaction.category || "Uncategorised"}</span>
                          </div>
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
                        </button>

                        <AnimatePresence>
                          {isEditingTxCategoryOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-[100]" 
                                onClick={() => setIsEditingTxCategoryOpen(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute left-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-[110] overflow-hidden min-w-full w-max max-w-[calc(100vw-32px)] sm:max-w-xs"
                              >
                                <div className="max-h-60 overflow-y-auto custom-scrollbar py-2">
                                  {allAvailableCategories.map((cat) => {
                                    const IconComp = getCategoryIconComponent(cat, profile);
                                    return (
                                      <button
                                        key={cat}
                                        onClick={() => {
                                          setIsEditingTxCategoryOpen(false);
                                          const newCat = cat;
                                          if (newCat === "Savings & Investments") {
                                            setBulkPotTarget({
                                              transactionIds: [editingTransaction.id!],
                                              category: newCat,
                                              onComplete: () => {
                                                setEditingTransaction(null);
                                                loadData();
                                              }
                                            });
                                          } else {
                                            setEditingTransaction({
                                              ...editingTransaction,
                                              category: newCat,
                                            });
                                          }
                                        }}
                                        className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
                                      >
                                        <IconComp className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="whitespace-nowrap pr-2">{cat}</span>
                                        {editingTransaction.category === cat && (
                                          <Check className="w-4 h-4 text-indigo-500 ml-auto shrink-0" />
                                        )}
                                      </button>
                                    );
                                  })}
                                  
                                  <div className="h-px bg-slate-100 my-2 mx-4" />
                                  
                                  <div className="px-2 space-y-1">
                                    <button
                                      onClick={() => {
                                        setIsEditingTxCategoryOpen(false);
                                        setShowCategoryManager(true);
                                      }}
                                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-indigo-50 text-indigo-600 text-sm font-bold rounded-xl transition-colors"
                                    >
                                      <PlusCircle className="w-4 h-4 shrink-0" />
                                      <span className="whitespace-nowrap">New Category...</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setIsEditingTxCategoryOpen(false);
                                        setShowCategoryManager(true);
                                      }}
                                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-50 text-slate-600 text-sm font-bold rounded-xl transition-colors"
                                    >
                                      <Edit3 className="w-4 h-4 shrink-0" />
                                      <span className="whitespace-nowrap">Manage Categories...</span>
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                        Type
                      </label>
                      <div className="relative">
                        <select
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 outline-none appearance-none"
                          value={editingTransaction.type || "expense"}
                          onChange={(e) => {
                            setEditingTransaction({
                              ...editingTransaction,
                              type: e.target.value as "expense" | "income" | "transfer",
                            });
                          }}
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                          <option value="transfer">Transfer</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      {editingTransaction.category === "Savings & Investments" ? "Select Pot" : "Subcategory"}
                    </label>
                    {editingTransaction.category === "Savings & Investments" ? (
                      <div className="relative">
                        <select
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 outline-none appearance-none"
                          value={editingTransaction.subCategory || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "NEW_POT") {
                              setEditingBucket(null);
                              setShowBucketForm(true);
                            } else {
                              setEditingTransaction({
                                ...editingTransaction,
                                subCategory: val || undefined,
                              });
                            }
                          }}
                        >
                          <option value="">-- Unallocated Pot --</option>
                          {(() => {
                            const definedBucketConfigs = profile?.savingsBucketsConfig || [];
                            const buckets = Array.from(new Set([
                              ...definedBucketConfigs.map(b => b.name),
                              ...(transactions.filter(t => t.category === "Savings & Investments").map(t => t.subCategory).filter(Boolean) as string[])
                            ]));
                            return buckets.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ));
                          })()}
                          <option value="NEW_POT">+ Create New Pot...</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Subcategory (e.g. Wales Trip)"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 outline-none"
                        value={editingTransaction.subCategory || ""}
                        onChange={(e) =>
                          setEditingTransaction({
                            ...editingTransaction,
                            subCategory: e.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      Tags (Optional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {editingTransaction.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-1 group"
                        >
                          {tag}
                          <button
                            onClick={() =>
                              setEditingTransaction({
                                ...editingTransaction,
                                tags: editingTransaction.tags?.filter(
                                  (t) => t !== tag,
                                ),
                              })
                            }
                            className="w-4 h-4 rounded-full hover:bg-indigo-100 flex items-center justify-center -mr-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <div className="relative flex-1 min-w-[120px] flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Add tag..."
                          className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-100 outline-none w-full"
                          value={newTagInputValue}
                          onChange={(e) => setNewTagInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const newTag = newTagInputValue.trim();
                              if (newTag && !editingTransaction.tags?.includes(newTag)) {
                                setEditingTransaction({
                                  ...editingTransaction,
                                  tags: [...(editingTransaction.tags || []), newTag],
                                });
                              }
                              setNewTagInputValue("");
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const newTag = newTagInputValue.trim();
                            if (newTag && !editingTransaction.tags?.includes(newTag)) {
                              setEditingTransaction({
                                ...editingTransaction,
                                tags: [...(editingTransaction.tags || []), newTag],
                              });
                            }
                            setNewTagInputValue("");
                          }}
                          className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {suggestTagsForMerchant(editingTransaction.merchant).filter(
                      (t) => !editingTransaction.tags?.includes(t),
                    ).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Suggested:
                        </span>
                        {suggestTagsForMerchant(editingTransaction.merchant)
                          .filter((t) => !editingTransaction.tags?.includes(t))
                          .map((tag) => (
                            <button
                              key={tag}
                              onClick={() =>
                                setEditingTransaction({
                                  ...editingTransaction,
                                  tags: [
                                    ...(editingTransaction.tags || []),
                                    tag,
                                  ],
                                })
                              }
                              className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center gap-1"
                            >
                              + {tag}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>


                </div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      if (editingTransaction.id) {
                        const originalMerchant = editingTransaction.merchant;
                        const originalCategory = transactions.find(
                          (t) => t.id === editingTransaction.id,
                        )?.category;

                        if (editingTransaction.category !== originalCategory) {
                          await handleCategoryChangeWithPrompt(
                            editingTransaction.id,
                            originalMerchant,
                            editingTransaction.category,
                            editingTransaction,
                          );
                        } else {
                          await updateTransaction(
                            editingTransaction.id,
                            editingTransaction,
                          );
                        }

                        await loadData();
                        setEditingTransaction(null);
                      }
                    }}
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() =>
                      editingTransaction.id &&
                      handleDeleteTransaction(editingTransaction.id)
                    }
                    className="px-6 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Transaction Modal */}
      <AnimatePresence>
        {showManualTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowManualTransaction(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white max-w-lg w-full rounded-[2.5rem] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 flex items-center justify-center relative shrink-0">
                    <MerchantLogo 
                      merchant={manualTx.merchant} 
                      category={manualTx.category} 
                      className="w-full h-full rounded-3xl object-cover border border-slate-100 shadow-sm bg-white" 
                      iconClassName="w-9 h-9"
                      getMerchantLogo={getMerchantLogo} 
                      isNeg={manualTx.type === 'expense'}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Add Transaction
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Manually track an entry
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowManualTransaction(false)}
                  className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all"
                >
                  <X className="w-6 h-6 text-slate-300 hover:text-slate-900" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      Merchant / Description
                    </label>
                    <input
                      autoFocus
                      type="text"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 outline-none"
                      placeholder="e.g. Weekly Groceries"
                      value={manualTx.merchant}
                      onChange={(e) => setManualTx({ ...manualTx, merchant: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                        Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          £
                        </span>
                        <div className="absolute left-1 top-1 bottom-1 flex gap-0.5 p-0.5 bg-slate-100 rounded-lg">
                          <button
                            onClick={() => setManualTx({ ...manualTx, type: 'expense' })}
                            className={cn(
                              "w-8 h-full flex items-center justify-center rounded-md transition-all text-xs font-black",
                              manualTx.type === 'expense' || !manualTx.type 
                                ? "bg-white text-slate-900 shadow-sm" 
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            -
                          </button>
                          <button
                            onClick={() => setManualTx({ ...manualTx, type: 'income' })}
                            className={cn(
                              "w-8 h-full flex items-center justify-center rounded-md transition-all text-xs font-black",
                              manualTx.type === 'income' 
                                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-100" 
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            +
                          </button>
                        </div>
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-16 pr-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 outline-none"
                          placeholder="0.00"
                          value={manualTx.amount}
                          onChange={(e) => setManualTx({ ...manualTx, amount: e.target.value.replace(/[^0-9.]/g, '') })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                        Date
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 outline-none"
                        value={manualTx.date}
                        onChange={(e) => setManualTx({ ...manualTx, date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                        Category
                      </label>
                      <div className="relative">
                        <select
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 outline-none appearance-none"
                          value={manualTx.category}
                          onChange={(e) => setManualTx({ ...manualTx, category: e.target.value })}
                        >
                          {allAvailableCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                        Subcategory
                      </label>
                      <input
                        type="text"
                        placeholder="Wales Trip"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-100 outline-none"
                        value={manualTx.subCategory || ""}
                        onChange={(e) => setManualTx({ ...manualTx, subCategory: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      Receipt (Optional)
                    </label>
                    <div className="relative">
                      {manualTx.receiptBase64 ? (
                        <div className="relative w-full h-32 rounded-2xl border border-slate-200 overflow-hidden group">
                           <img src={manualTx.receiptBase64} className="w-full h-full object-cover" alt="Receipt" />
                           <button 
                            onClick={() => setManualTx({ ...manualTx, receiptBase64: undefined })}
                            className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-black text-[10px] uppercase tracking-widest"
                           >
                            Remove Receipt
                           </button>
                        </div>
                      ) : (
                        <label className="w-full h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-all">
                          <div className="flex flex-col items-center gap-1">
                            <ImageIcon className="w-5 h-5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Upload Receipt Image</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setManualTx({
                                    ...manualTx,
                                    receiptBase64: reader.result as string
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-4">
                  <button
                    onClick={handleCreateManualTransaction}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 active:scale-95 transition-transform"
                  >
                    Create Transaction
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
      {showAddRule && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddRule(false)}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-6 md:p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {editingRule ? "Edit Smart Rule" : "Add New Smart Rule"}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Define how Luca should categorize future transactions.
                </p>
              </div>
              <button
                onClick={() => setShowAddRule(false)}
                className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRule} className="space-y-6">
              {/* Rule Pattern and Target Category */}
                          {(() => {
                            const merchantOptions = Array.from(
                              new Set(
                                transactions
                                  .map((t) => t.merchant)
                                  .filter(Boolean),
                              ),
                            ).sort();
                            const tagOptions = Array.from(
                              new Set(
                                transactions.flatMap((t) => t.tags || []),
                              ),
                            )
                              .filter(Boolean)
                              .sort();

                            // Try to infer the current predominant category for the entered/selected pattern
                            const matchingTxs = newRule.pattern
                              ? transactions.filter((t) => {
                                  let merchantMatch = true;
                                  let tagMatch = true;

                                  merchantMatch =
                                    newRule.type === "exact" ||
                                    newRule.type === "tag"
                                      ? t.merchant?.toLowerCase() ===
                                        newRule.pattern.toLowerCase()
                                      : t.merchant
                                          ?.toLowerCase()
                                          .includes(
                                            newRule.pattern.toLowerCase(),
                                          );

                                  if (
                                    newRule.type === "tag" &&
                                    newRule.tagPattern
                                  ) {
                                    tagMatch =
                                      t.tags?.some(
                                        (tag) =>
                                          tag.toLowerCase() ===
                                          newRule.tagPattern?.toLowerCase(),
                                      ) || false;
                                  } else if (
                                    newRule.type === "tag" &&
                                    !newRule.tagPattern
                                  ) {
                                    // fallback if they only use pattern as tag
                                    tagMatch = true;
                                    merchantMatch =
                                      t.tags?.some(
                                        (tag) =>
                                          tag.toLowerCase() ===
                                          newRule.pattern.toLowerCase(),
                                      ) || false;
                                  }

                                  return merchantMatch && tagMatch;
                                })
                              : [];

                            const catCounts = matchingTxs.reduce(
                              (acc, t) => {
                                if (t.category)
                                  acc[t.category] = (acc[t.category] || 0) + 1;
                                return acc;
                              },
                              {} as Record<string, number>,
                            );

                            const inferredCurrentCategory =
                              Object.entries(catCounts).sort(
                                (a, b) => b[1] - a[1],
                              )[0]?.[0] || "Unknown / Mixed";

                            return (
                              <div className="flex flex-col md:flex-row items-start md:items-start gap-4 md:gap-6 bg-slate-50 p-4 md:p-6 rounded-[1.5rem] border border-slate-100">
                                <div className="w-full md:flex-1 space-y-3 focus-within:z-10 relative">
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                                      Merchant Pattern
                                    </label>
                                    <div className="relative">
                                      {isEnteringNewMerchant ? (
                                        <input
                                          autoFocus
                                          required={newRule.type !== "tag"}
                                          type="text"
                                          placeholder="e.g. Netflix"
                                          className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-800"
                                          value={newRule.pattern}
                                          onChange={(e) =>
                                            setNewRule({
                                              ...newRule,
                                              pattern: e.target.value,
                                            })
                                          }
                                          onBlur={() => {
                                            if (!newRule.pattern)
                                              setIsEnteringNewMerchant(false);
                                          }}
                                        />
                                      ) : (
                                        <>
                                          <select
                                            required={newRule.type !== "tag"}
                                            className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-800 appearance-none cursor-pointer"
                                            value={newRule.pattern}
                                            onChange={(e) => {
                                              if (
                                                e.target.value === "ADD_CUSTOM"
                                              ) {
                                                setIsEnteringNewMerchant(true);
                                                setNewRule({
                                                  ...newRule,
                                                  pattern: "",
                                                });
                                              } else {
                                                setNewRule({
                                                  ...newRule,
                                                  pattern: e.target.value,
                                                });
                                              }
                                            }}
                                          >
                                            <option value="" disabled>
                                              Select Merchant Pattern
                                            </option>
                                            {merchantOptions.map((m) => (
                                              <option key={m} value={m}>
                                                {m}
                                              </option>
                                            ))}
                                            {newRule.pattern &&
                                              !merchantOptions.includes(
                                                newRule.pattern,
                                              ) && (
                                                <option value={newRule.pattern}>
                                                  {newRule.pattern}
                                                </option>
                                              )}
                                            <option value="ADD_CUSTOM">
                                              + Add Custom Pattern...
                                            </option>
                                          </select>
                                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {newRule.type === "tag" && (
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                                        Tag Pattern
                                      </label>
                                      <div className="flex flex-wrap gap-2">
                                        {tagOptions.map((t) => (
                                          <button
                                            key={t}
                                            type="button"
                                            onClick={() =>
                                              setNewRule({
                                                ...newRule,
                                                tagPattern: t,
                                              })
                                            }
                                            className={cn(
                                              "px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                                              newRule.tagPattern === t
                                                ? "bg-indigo-600 text-white border-indigo-600"
                                                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50",
                                            )}
                                          >
                                            {t}
                                          </button>
                                        ))}
                                        {newRule.tagPattern &&
                                          !tagOptions.includes(
                                            newRule.tagPattern,
                                          ) && (
                                            <div
                                              className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white border-indigo-600 border"
                                            >
                                              {newRule.tagPattern}
                                            </div>
                                          )}
                                        {isEnteringNewTag ? (
                                          <input
                                            autoFocus
                                            type="text"
                                            placeholder="New tag..."
                                            className="px-3 py-1.5 rounded-full text-xs font-bold border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-24 bg-white text-slate-700"
                                            value={newRule.tagPattern || ""}
                                            onChange={(e) =>
                                              setNewRule({
                                                ...newRule,
                                                tagPattern: e.target.value,
                                              })
                                            }
                                            onBlur={() => {
                                              if (!newRule.tagPattern)
                                                setIsEnteringNewTag(false);
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                setIsEnteringNewTag(false);
                                              }
                                            }}
                                          />
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setIsEnteringNewTag(true);
                                              setNewRule({
                                                ...newRule,
                                                tagPattern: "",
                                              });
                                            }}
                                            className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 flex items-center gap-1 transition-all"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div className="text-[10px] text-slate-400 font-semibold pl-1">
                                    Current category:{" "}
                                    <span className="text-slate-600">
                                      {newRule.pattern
                                        ? inferredCurrentCategory
                                        : "..."}
                                    </span>
                                  </div>
                                </div>

                                <div className="hidden md:flex flex-none pt-5">
                                  <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                                    <ArrowRight className="w-5 h-5 text-indigo-400" />
                                  </div>
                                </div>
                                <div className="flex md:hidden flex-none w-full items-center justify-center -my-2">
                                  <ArrowRight className="w-5 h-5 text-indigo-400 rotate-90" />
                                </div>

                                <div className="w-full md:flex-1 space-y-1.5">
                                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest pl-1">
                                    Target Category
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {allAvailableCategories.map((cat) => (
                                      <button
                                        key={cat}
                                        type="button"
                                        onClick={() =>
                                          setNewRule({
                                            ...newRule,
                                            targetCategory: cat,
                                          })
                                        }
                                        className={cn(
                                          "px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                                          newRule.targetCategory === cat
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                            : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100",
                                        )}
                                      >
                                        {cat}
                                      </button>
                                    ))}
                                    {newRule.targetCategory &&
                                      !categories.includes(
                                        newRule.targetCategory,
                                      ) && (
                                        <div
                                          className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white border-indigo-600 shadow-sm border"
                                        >
                                          {newRule.targetCategory}
                                        </div>
                                      )}
                                    {isEnteringNewTargetCat ? (
                                      <input
                                        autoFocus
                                        type="text"
                                        placeholder="New category..."
                                        className="px-3 py-1.5 rounded-full text-xs font-bold border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32 bg-white text-slate-700"
                                        value={newRule.targetCategory}
                                        onChange={(e) =>
                                          setNewRule({
                                            ...newRule,
                                            targetCategory: e.target.value,
                                          })
                                        }
                                        onBlur={() => {
                                          if (!newRule.targetCategory)
                                            setIsEnteringNewTargetCat(false);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            setIsEnteringNewTargetCat(false);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setIsEnteringNewTargetCat(true);
                                          setNewRule({
                                            ...newRule,
                                            targetCategory: "",
                                          });
                                        }}
                                        className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1 transition-all"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          <div className="grid grid-cols-3 gap-4 pt-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                                Exact Amount
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Any"
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-semibold"
                                value={
                                  newRule.amount === undefined
                                    ? ""
                                    : newRule.amount
                                }
                                onChange={(e) =>
                                  setNewRule({
                                    ...newRule,
                                    amount: e.target.value
                                      ? parseFloat(e.target.value)
                                      : "",
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                                Min Amount
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Any"
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-semibold"
                                value={
                                  newRule.minAmount === undefined
                                    ? ""
                                    : newRule.minAmount
                                }
                                onChange={(e) =>
                                  setNewRule({
                                    ...newRule,
                                    minAmount: e.target.value
                                      ? parseFloat(e.target.value)
                                      : "",
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                                Max Amount
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Any"
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-semibold"
                                value={
                                  newRule.maxAmount === undefined
                                    ? ""
                                    : newRule.maxAmount
                                }
                                onChange={(e) =>
                                  setNewRule({
                                    ...newRule,
                                    maxAmount: e.target.value
                                      ? parseFloat(e.target.value)
                                      : "",
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-3 pt-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                              Time & Day Conditions (Optional)
                            </label>
                            
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-4">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Days of the Week</label>
                                <div className="flex flex-wrap gap-2">
                                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => {
                                        const current = newRule.daysOfWeek || [];
                                        if (current.includes(day)) {
                                          setNewRule({ ...newRule, daysOfWeek: current.filter(d => d !== day) });
                                        } else {
                                          setNewRule({ ...newRule, daysOfWeek: [...current, day] });
                                        }
                                      }}
                                      className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border",
                                        newRule.daysOfWeek?.includes(day)
                                          ? "bg-indigo-600 text-white border-indigo-600"
                                          : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
                                      )}
                                    >
                                      {day.slice(0, 3)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Start Time</label>
                                  <input
                                    type="time"
                                    value={newRule.startTime || ""}
                                    onChange={(e) => setNewRule({ ...newRule, startTime: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-semibold text-slate-700 h-[42px] cursor-pointer"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">End Time</label>
                                  <input
                                    type="time"
                                    value={newRule.endTime || ""}
                                    onChange={(e) => setNewRule({ ...newRule, endTime: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-semibold text-slate-700 h-[42px] cursor-pointer"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 pt-2">
                            <button
                              type="button"
                              onClick={() =>
                                setNewRule({ ...newRule, type: "tag" })
                              }
                              className={cn(
                                "flex-1 py-3 rounded-xl text-xs font-bold border transition-all",
                                newRule.type === "tag"
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                  : "bg-white border-slate-100 text-slate-400",
                              )}
                            >
                              Tag Mode
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setNewRule({ ...newRule, type: "exact" })
                              }
                              className={cn(
                                "flex-1 py-3 rounded-xl text-xs font-bold border transition-all",
                                newRule.type === "exact"
                                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                  : "bg-white border-slate-100 text-slate-400",
                              )}
                            >
                              Exact Match
                            </button>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <button
                              disabled={
                                (!newRule.pattern && !newRule.tagPattern) ||
                                !newRule.targetCategory
                              }
                              className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              Save Rule
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddRule(false)}
                              className="px-6 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
          </motion.div>
        </div>
      )}

</AnimatePresence>
      {/* Category Manager Modal */}
      <AnimatePresence>
        {showCategoryManager && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowCategoryManager(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white max-w-sm w-full rounded-[2rem] shadow-2xl overflow-hidden p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">
                  Manage Categories
                </h3>
                <button
                  onClick={() => setShowCategoryManager(false)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {allAvailableCategories.map((cat) => {
                  const isCustom = !COMMON_CATEGORIES.includes(cat);
                  const isEditing = editingCategoryIcon === cat;
                  return (
                    <div
                      key={cat}
                      className={cn(
                        "flex flex-col p-3 rounded-xl border group transition-all",
                        isEditing ? "bg-white border-indigo-200 shadow-lg shadow-indigo-100/50" : "bg-slate-50 border-slate-100 hover:bg-slate-100/60"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setEditingCategoryIcon(isEditing ? null : cat)}
                            className="w-8 h-8 flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer"
                            title="Change Icon"
                          >
                            {(() => {
                              const IconComp = getCategoryIconComponent(cat, profile);
                              const catColor = getCategoryColorComponent(cat, profile).text;
                              return (
                                <IconComp className={cn("w-5 h-5", catColor)} />
                              );
                            })()}
                          </button>
                          <span className="text-sm font-bold text-slate-700">
                            {cat}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                           <button 
                             onClick={() => setEditingCategoryIcon(isEditing ? null : cat)}
                             className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                             title="Change Emblem"
                           >
                              <Edit2 className="w-4 h-4" />
                           </button>
                          {isCustom ? (
                            <button
                              onClick={async () => {
                                setConfirmDialog({
                                  message: `Delete category "${cat}"? Transactions using it will remain as is but the category will no longer be listed.`,
                                  onConfirm: async () => {
                                    await removeCategory(cat);
                                    const cats = await getCategories();
                                    setCategories(cats);
                                  }
                                });
                              }}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              System
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Icon Library Picker */}
                      <AnimatePresence>
                         {isEditing && (
                           <motion.div 
                             initial={{ height: 0, opacity: 0 }}
                             animate={{ height: "auto", opacity: 1 }}
                             exit={{ height: 0, opacity: 0 }}
                             className="overflow-hidden"
                           >
                             <div className="pt-4 mt-3 border-t border-slate-100">
                               <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Select Emblem</p>
                               <div className="grid grid-cols-6 gap-2">
                                  {Object.keys(ICON_LIBRARY).map(iconName => {
                                    const LibraryIcon = ICON_LIBRARY[iconName];
                                    const isActive = (profile?.categoryIcons?.[cat] === iconName) || (!profile?.categoryIcons?.[cat] && CATEGORY_ICONS[cat] === LibraryIcon);
                                    return (
                                      <button 
                                        key={iconName}
                                        onClick={async () => {
                                          if (profile) {
                                            const updatedIcons = { ...profile.categoryIcons, [cat]: iconName };
                                            setProfile({ ...profile, categoryIcons: updatedIcons });
                                            await updateUserProfile({ categoryIcons: updatedIcons });
                                          }
                                        }}
                                        className={cn(
                                          "aspect-square rounded-xl flex items-center justify-center transition-all hover:scale-110",
                                          isActive ? "bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm" : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-transparent"
                                        )}
                                      >
                                        <LibraryIcon className="w-4 h-4" />
                                      </button>
                                    );
                                  })}
                               </div>
                               
                               <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 mt-5">Select Color</p>
                               <div className="grid grid-cols-6 gap-2">
                                  {Object.keys(AVAILABLE_COLOR_PALETTES).map(colorKey => {
                                    const palette = AVAILABLE_COLOR_PALETTES[colorKey];
                                    const isActive = profile?.categoryColors?.[cat] === colorKey;
                                    return (
                                      <button 
                                        key={colorKey}
                                        onClick={async () => {
                                          if (profile) {
                                            const updatedColors = { ...profile.categoryColors, [cat]: colorKey };
                                            setProfile({ ...profile, categoryColors: updatedColors });
                                            await updateUserProfile({ categoryColors: updatedColors });
                                          }
                                        }}
                                        className={cn(
                                          "aspect-square rounded-xl flex items-center justify-center transition-all hover:scale-110 border",
                                          isActive ? "border-slate-800 shadow-md ring-2 ring-slate-800 ring-offset-1" : "border-transparent hover:border-slate-200"
                                        )}
                                      >
                                        <div className={cn("w-6 h-6 rounded-lg", palette.bg, palette.text, "border border-black/5 flex items-center justify-center")}>
                                          <div className={cn("w-3 h-3 rounded-full bg-current")} />
                                        </div>
                                      </button>
                                    );
                                  })}
                               </div>
                             </div>
                           </motion.div>
                         )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (newCategoryInput.trim()) {
                    await addCategory(newCategoryInput.trim());
                    const cats = await getCategories();
                    setCategories(cats);
                    setNewCategoryInput("");
                  }
                }}
                className="mt-6 flex gap-2"
              >
                <input
                  type="text"
                  placeholder="New Category Name..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-100 outline-none"
                />
                <button
                  type="submit"
                  disabled={!newCategoryInput.trim()}
                  className="bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflicting Rule Modal */}
      <AnimatePresence>
        {ruleConflictPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white max-w-md w-full rounded-[2.5rem] shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl mx-auto flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Conflicting Rule Detected
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                Hey, you have 2 rules that are in conflict, do you want to overwrite the previous rule?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setRuleConflictPrompt(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setRuleConflictPrompt(null);
                    handleCreateRule(undefined, true);
                  }}
                  className="flex-1 px-6 py-3 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200"
                >
                  Overwrite
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Update Prompt Modal */}
      <AnimatePresence>
        {bulkUpdatePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white max-w-md w-full rounded-[2.5rem] shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-6">
                <Tag className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Automate this category?
              </h3>

              <p className="text-sm text-slate-500 mb-8 font-medium">
                {bulkUpdatePrompt.mode === "bulk" &&
                  `We found ${bulkUpdatePrompt.bulkUpdateCandidates.length} other past transactions from "${bulkUpdatePrompt.merchant}". Would you like to update ALL of them to "${bulkUpdatePrompt.newCat}" and create a smart rule for future ones?`}
                {bulkUpdatePrompt.mode === "rule_only_update" &&
                  `There are no un-categorised past transactions to update for "${bulkUpdatePrompt.merchant}". Do you want to update your smart rule to auto-categorise future transactions as "${bulkUpdatePrompt.newCat}"?`}
                {bulkUpdatePrompt.mode === "rule_only_create" &&
                  `Do you want to create a smart rule so that future transactions from "${bulkUpdatePrompt.merchant}" are automatically categorised as "${bulkUpdatePrompt.newCat}"?`}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => executeBulkUpdate(true, true)}
                  className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors"
                >
                  {bulkUpdatePrompt.mode === "bulk"
                    ? `Yes, Update All & Create Rule`
                    : `Yes, Create Rule`}
                </button>
                <button
                  onClick={() => executeBulkUpdate(false, true)}
                  className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg shadow-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Update all past items (No rule)
                </button>
                <button
                  onClick={() => executeBulkUpdate(false, false)}
                  className="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  No, just this transaction
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Settings Modal */}
      <AnimatePresence>
        {showProfileSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowProfileSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white max-w-sm w-full rounded-[2rem] shadow-2xl overflow-hidden p-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">
                  Budget Settings
                </h3>
                <button
                  onClick={() => setShowProfileSettings(false)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                    Billing Day
                  </label>
                  <p className="text-xs text-slate-400 mb-2">
                    The day of the month your budget period starts (e.g. 15 for
                    mid-month pay).
                  </p>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    defaultValue={profile?.billingDay || 15}
                    id="set_billing_day"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      const day = parseInt(
                        (
                          document.getElementById(
                            "set_billing_day",
                          ) as HTMLInputElement
                        ).value,
                      );
                      if (day > 0 && day <= 31) {
                        await updateUserProfile({ billingDay: day });
                        setProfile((prev) =>
                          prev ? { ...prev, billingDay: day } : null,
                        );
                        setShowProfileSettings(false);
                      }
                    }}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setShowProfileSettings(false)}
                    className="w-full py-4 text-slate-400 font-bold text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name Prompt Modal */}
      <AnimatePresence>
        {profile && !profile.hasPromptedName && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl border border-slate-100/10 flex flex-col items-center text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-indigo-500/10 blur-[60px] rounded-full -mt-20 pointer-events-none" />
              
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6 font-semibold shadow-inner shadow-indigo-100/30">
                <Sparkles className="w-6 h-6" />
              </div>
              
              <h2 className="text-xl font-black tracking-tight text-slate-900 mb-1.5">
                Welcome to Luca
              </h2>
              <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed px-2">
                What should we call you? We'll use this to personalize your dashboard greetings and insights.
              </p>
              
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const trimmedName = promptedNameValue.trim();
                  if (trimmedName) {
                    const updated = { ...profile, displayName: trimmedName, hasPromptedName: true };
                    setProfile(updated);
                    await updateUserProfile({ displayName: trimmedName, hasPromptedName: true });
                  }
                }}
                className="w-full space-y-4"
              >
                <div className="relative w-full">
                  <input
                    type="text"
                    required
                    maxLength={30}
                    placeholder="Enter your name"
                    value={promptedNameValue || (profile.displayName !== "User" ? profile.displayName : "")}
                    onChange={(e) => setPromptedNameValue(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-center font-semibold text-base transition-all"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl shadow-xl shadow-indigo-600/15 hover:bg-indigo-700 active:scale-98 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recurring Analysis Modal */}
      <AnimatePresence>
        {showRecurringModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-4"
            onClick={() => setShowRecurringModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white max-w-lg w-full max-h-[80vh] flex flex-col rounded-[2.5rem] shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 pb-4 shrink-0 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Recurring Payments
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    We identified these as potential subscriptions.
                  </p>
                </div>
                <button
                  onClick={() => setShowRecurringModal(false)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar space-y-4">
                {recurringCandidates.map((candidate, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div>
                      <div className="font-bold text-slate-800 text-sm">
                        {candidate.merchant}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-indigo-600 tracking-widest">
                        {candidate.occurrences} payments of{" "}
                        {formatCurrency(candidate.amount)}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        setUploadStatus(
                          `Categorizing ${candidate.merchant}...`,
                        );
                        await Promise.all(
                          candidate.txs.map((t) =>
                            updateTransaction(t.id!, {
                              category: "Subscriptions",
                            }),
                          ),
                        );

                        const existingRule = rules.find(
                          (r) =>
                            r.type === "exact" &&
                            r.pattern === candidate.merchant,
                        );
                        if (existingRule && existingRule.id) {
                          await updateRule(existingRule.id, {
                            targetCategory: "Subscriptions",
                          });
                        } else {
                          await saveRule({
                            pattern: candidate.merchant,
                            type: "exact",
                            targetCategory: "Subscriptions",
                            createdAt: new Date().toISOString(),
                          });
                        }

                        await loadData();
                        setUploadStatus(null);
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-white text-indigo-600 border border-indigo-100 shadow-sm rounded-xl text-xs font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Merchant Branding Modal */}
      <AnimatePresence>
        {editingMerchant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingMerchant(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white max-w-sm w-full rounded-[2rem] shadow-2xl overflow-hidden p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Branding</h3>
                <button
                  onClick={() => setEditingMerchant(null)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6 text-center">
                <div className="mx-auto w-24 h-24 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center relative overflow-hidden shadow-inner group">
                  {editingMerchant.customLogo ? (
                    <img
                      src={editingMerchant.customLogo}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-200" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (re) => {
                        const base64 = re.target?.result as string;
                        setEditingMerchant({
                          ...editingMerchant,
                          customLogo: base64,
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <div className="absolute inset-0 bg-indigo-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-lg">
                    {editingMerchant.merchantName}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Upload a custom logo to brand this merchant
                  </p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      if (editingMerchant) {
                        await saveMerchantMetadata(editingMerchant);
                        const merts = await getMerchantMetadata();
                        setMerchantsMetadata(merts);
                        setEditingMerchant(null);
                      }
                    }}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Save Branding
                  </button>
                  <button
                    onClick={() => setEditingMerchant(null)}
                    className="w-full py-4 text-slate-400 font-bold text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Savings Bucket Modal */}
      <AnimatePresence>
        {showBucketForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowBucketForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white max-w-xl w-full rounded-[2.5rem] shadow-2xl p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-slate-800 mb-6">
                {editingBucket ? "Edit Bucket" : "New Savings Bucket"}
              </h3>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      Bucket Name
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100"
                      placeholder="e.g. New Car Fund"
                      defaultValue={editingBucket?.name}
                      id="bucket_name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                        Target Amount (Optional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100"
                        placeholder="e.g. 10000"
                        defaultValue={editingBucket?.target}
                        id="bucket_target"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                        Target Date (Optional)
                      </label>
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 text-slate-700"
                        defaultValue={
                          editingBucket?.targetDate
                            ? editingBucket.targetDate.split("T")[0]
                            : ""
                        }
                        id="bucket_date"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={async () => {
                      const name = (
                        document.getElementById(
                          "bucket_name",
                        ) as HTMLInputElement
                      ).value;
                      const targetStr = (
                        document.getElementById(
                          "bucket_target",
                        ) as HTMLInputElement
                      ).value;
                      const dateStr = (
                        document.getElementById(
                          "bucket_date",
                        ) as HTMLInputElement
                      ).value;

                      if (!name) return;

                      if (profile) {
                        const newConfig = {
                          id: editingBucket?.id || name,
                          name,
                          target: targetStr ? parseFloat(targetStr) : undefined,
                          targetDate: dateStr
                            ? new Date(dateStr).toISOString()
                            : undefined,
                        };

                        const existingConfigs =
                          profile.savingsBucketsConfig ||
                          (profile.savingsBuckets || []).map((n) => ({
                            id: n,
                            name: n,
                          }));

                        let newConfigsArr;
                        if (editingBucket) {
                          newConfigsArr = existingConfigs.map((c) =>
                            c.id === editingBucket.id ? newConfig : c,
                          );
                        } else {
                          newConfigsArr = [...existingConfigs, newConfig];
                        }

                        const newBuckets = newConfigsArr.map((c) => c.name);

                        setProfile({
                          ...profile,
                          savingsBuckets: newBuckets,
                          savingsBucketsConfig: newConfigsArr,
                        });
                        await updateUserProfile({
                          savingsBuckets: newBuckets,
                          savingsBucketsConfig: newConfigsArr,
                        });

                        // If renamed, update transactions
                        if (editingBucket && editingBucket.name !== name) {
                          const txsToUpdate = transactions.filter(
                            (t) => t.subCategory === editingBucket.name,
                          );
                          if (txsToUpdate.length > 0) {
                            await Promise.all(
                              txsToUpdate.map((t) =>
                                updateTransaction(t.id!, { subCategory: name }),
                              ),
                            );
                            loadData();
                          }
                        }
                      }

                      setShowBucketForm(false);
                    }}
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
                  >
                    Save Bucket
                  </button>
                  <button
                    onClick={() => setShowBucketForm(false)}
                    className="px-6 bg-slate-50 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pot Selection Modal */}
      <AnimatePresence>
        {bulkPotTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4"
            onClick={() => setBulkPotTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white max-w-sm w-full rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Assign to Pot</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {bulkPotTarget.transactionIds.length === 1 
                      ? "Choose a pot for this transaction" 
                      : `Assign ${bulkPotTarget.transactionIds.length} transactions to a pot`}
                  </p>
                </div>
              </div>

              {(() => {
                const definedBucketConfigs = profile?.savingsBucketsConfig || [];
                const buckets = Array.from(new Set([
                    ...definedBucketConfigs.map(b => b.name),
                    ...(transactions.filter(t => t.category === "Savings & Investments").map(t => t.subCategory).filter(Boolean) as string[])
                ]));

                return (
                  <div className="space-y-3 mb-8">
                    {buckets.length === 0 && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                        <p className="text-xs font-bold text-slate-400 mb-3">No pots created yet</p>
                        <button
                          onClick={() => {
                            setEditingBucket(null);
                            setShowBucketForm(true);
                          }}
                          className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100"
                        >
                          Create First Pot
                        </button>
                      </div>
                    )}
                    
                    {buckets.map(potName => (
                      <button
                        key={potName}
                        onClick={async () => {
                          setUploadStatus(`Assigning to ${potName}...`);
                          await Promise.all(bulkPotTarget.transactionIds.map(id => 
                            updateTransaction(id, { 
                                category: bulkPotTarget.category,
                                subCategory: potName 
                            })
                          ));
                          setBulkPotTarget(null);
                          setUploadStatus(null);
                          bulkPotTarget.onComplete?.();
                        }}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-2xl transition-all group"
                      >
                        <span className="font-bold text-slate-700 group-hover:text-indigo-600">{potName}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                      </button>
                    ))}

                    {buckets.length > 0 && (
                      <button
                        onClick={async () => {
                          setUploadStatus("Updating category...");
                          await Promise.all(bulkPotTarget.transactionIds.map(id => 
                            updateTransaction(id, { 
                                category: bulkPotTarget.category,
                                subCategory: null
                            })
                          ));
                          setBulkPotTarget(null);
                          setUploadStatus(null);
                          bulkPotTarget.onComplete?.();
                        }}
                        className="w-full p-4 bg-white hover:bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400 hover:text-slate-600 transition-all"
                      >
                        Keep Unallocated
                      </button>
                    )}
                    
                    {buckets.length > 0 && (
                      <button
                        onClick={() => {
                          setEditingBucket(null);
                          setShowBucketForm(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 p-4 text-indigo-600 hover:bg-indigo-50 rounded-2xl text-xs font-bold transition-all"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Create New Pot...
                      </button>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <button
                  onClick={() => setBulkPotTarget(null)}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move Funds Modal */}
      <AnimatePresence>
        {showMoveFunds && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowMoveFunds(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white max-w-xl w-full rounded-[2.5rem] shadow-2xl p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Move Funds</h3>
                  <p className="text-xs text-slate-400 font-medium">Transfer money between your savings pots</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setMoveFundsData({ ...moveFundsData, isDetailed: false })}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                      !moveFundsData.isDetailed ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
                    )}
                  >
                    Simple
                  </button>
                  <button
                    onClick={() => setMoveFundsData({ ...moveFundsData, isDetailed: true })}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                      moveFundsData.isDetailed ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
                    )}
                  >
                    Detailed
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">From Pot</label>
                    <div className="relative">
                      <select
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 appearance-none"
                        value={moveFundsData.from}
                        onChange={e => setMoveFundsData({ ...moveFundsData, from: e.target.value })}
                      >
                        <option value="">-- Main Balance (Outside Savings) --</option>
                        <option value="Unallocated">Unallocated Savings</option>
                        {(profile?.savingsBucketsConfig || []).map(b => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">To Pot</label>
                    <div className="relative">
                      <select
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 appearance-none"
                        value={moveFundsData.to}
                        onChange={e => {
                          if (e.target.value === "NEW_POT") {
                            setShowMoveFunds(false);
                            setEditingBucket(null);
                            setShowBucketForm(true);
                          } else {
                            setMoveFundsData({ ...moveFundsData, to: e.target.value })
                          }
                        }}
                      >
                        <option value="">-- Select Destination --</option>
                        <option value="Unallocated">Unallocated Savings</option>
                        {(profile?.savingsBucketsConfig || []).map(b => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                        <option value="NEW_POT" className="text-indigo-600 font-bold">+ Create New Pot...</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">£</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-8 pr-4 py-4 text-xl font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                      placeholder="0.00"
                      value={moveFundsData.amount}
                      onChange={e => setMoveFundsData({ ...moveFundsData, amount: e.target.value })}
                    />
                  </div>
                </div>

                {moveFundsData.isDetailed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="space-y-4 pt-4 border-t border-slate-50"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Date</label>
                        <input
                          type="datetime-local"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100"
                          value={moveFundsData.date}
                          onChange={e => setMoveFundsData({ ...moveFundsData, date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Notes</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100"
                          value={moveFundsData.notes}
                          onChange={e => setMoveFundsData({ ...moveFundsData, notes: e.target.value })}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-3 pt-6">
                  <button
                    onClick={handleMoveFunds}
                    disabled={!moveFundsData.amount || !moveFundsData.to}
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    Confirm Move
                  </button>
                  <button
                    onClick={() => setShowMoveFunds(false)}
                    className="px-8 bg-slate-50 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Confirm Modal */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setConfirmDialog(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white max-w-sm w-full rounded-[2rem] shadow-2xl p-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Are you sure?</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                {confirmDialog.message}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="flex-1 bg-red-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-red-200 hover:bg-red-700 transition"
                >
                  Yes, confirm
                </button>
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-2xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingCategoryIconFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingCategoryIconFor(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white max-w-sm w-full rounded-[2rem] shadow-2xl overflow-hidden p-8 max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Category Emblem</h3>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">
                    {editingCategoryIconFor} • Customize Icon & Color below
                  </p>
                </div>
                <button
                  onClick={() => setEditingCategoryIconFor(null)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors shrink-0"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div ref={emblemModalScrollRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">
                    Select Emblem
                  </p>
                  <div className="grid grid-cols-7 sm:grid-cols-7 gap-2">
                    {Object.keys(ICON_LIBRARY).map((iconName) => {
                      const LibraryIcon = ICON_LIBRARY[iconName];
                      const cat = editingCategoryIconFor;
                      
                      const isActive = (profile?.categoryIcons?.[cat] === iconName) || (!profile?.categoryIcons?.[cat] && CATEGORY_ICONS[cat] === LibraryIcon);
                      return (
                        <button
                          key={iconName}
                          onClick={async () => {
                            if (profile) {
                              const updatedIcons = { ...profile.categoryIcons, [cat]: iconName };
                              setProfile({ ...profile, categoryIcons: updatedIcons });
                              await updateUserProfile({ categoryIcons: updatedIcons });
                              
                              // Smoothly scroll down to make colors immediately discoverable/visible
                              setTimeout(() => {
                                if (emblemModalScrollRef.current) {
                                  emblemModalScrollRef.current.scrollTo({
                                    top: emblemModalScrollRef.current.scrollHeight,
                                    behavior: "smooth"
                                  });
                                }
                              }, 100);
                            }
                          }}
                          className={cn(
                            "aspect-square rounded-xl flex items-center justify-center transition-all hover:scale-110",
                            isActive
                              ? "bg-indigo-100 text-indigo-600 border border-indigo-200"
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-transparent shadow-sm"
                          )}
                        >
                          <LibraryIcon className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">
                    Select Color
                  </p>
                  <div className="grid grid-cols-6 gap-2 pb-4">
                    {Object.keys(AVAILABLE_COLOR_PALETTES).map(colorKey => {
                      const palette = AVAILABLE_COLOR_PALETTES[colorKey];
                      const cat = editingCategoryIconFor;
                      const isActive = profile?.categoryColors?.[cat] === colorKey;
                      return (
                        <button 
                          key={colorKey}
                          onClick={async () => {
                            if (profile) {
                              const updatedColors = { ...profile.categoryColors, [cat]: colorKey };
                              setProfile({ ...profile, categoryColors: updatedColors });
                              await updateUserProfile({ categoryColors: updatedColors });
                            }
                          }}
                          className={cn(
                            "aspect-square rounded-xl flex items-center justify-center transition-all hover:scale-110 border",
                            isActive ? "border-slate-800 shadow-md ring-2 ring-slate-800 ring-offset-1" : "border-transparent hover:border-slate-200"
                          )}
                        >
                          <div className={cn("w-6 h-6 rounded-lg", palette.bg, palette.text, "border border-black/5 flex items-center justify-center")}>
                            <div className={cn("w-3 h-3 rounded-full bg-current")} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-6 left-6 right-6 h-20 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] flex items-center justify-around z-[55] px-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        {[
          { id: "dashboard", icon: Home, label: "Home" },
          { id: "analytics", icon: PieChart, label: "Spending" },
          { id: "bills", icon: FileText, label: "Bills" },
          { id: "savings", icon: Wallet, label: "Savings" },
          { id: "screenshots", icon: ImageIcon, label: "More", isMore: true },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              resetFilters();
              setActiveTab(tab.id as any);
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 flex-1 py-2 transition-all active:scale-90",
              activeTab === tab.id
                ? "text-white"
                : "text-slate-500 hover:text-slate-300",
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
              activeTab === tab.id ? "bg-indigo-600 shadow-lg shadow-indigo-500/20" : ""
            )}>
              <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "stroke-[2.5px]" : "stroke-[2px]")} />
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              activeTab === tab.id ? "opacity-100" : "opacity-0"
            )}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
