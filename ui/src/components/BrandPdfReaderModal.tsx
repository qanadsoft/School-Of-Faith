import { useState, useEffect } from 'react';
import {
  X, BookOpen, Download, CheckCircle2, ChevronLeft, ChevronRight,
  Printer, Sparkles, FileText, Bookmark, Calendar, Share2, Eye, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api, asList } from '@/lib/api';

export interface ReadingItem {
  id: string;
  plan_id?: string;
  day_number: number;
  title: string;
  reference: string;
  key_verse?: string;
  devotional?: string;
  prayer?: string;
  completed?: boolean;
  completedAt?: string;
  completed_at?: string;
}

export interface ReadingPlanData {
  id: string;
  name: string;
  description: string;
  total_days: number;
  pdf_url?: string | null;
  badge_text?: string;
  items?: ReadingItem[];
  progress?: { item_id: string; notes?: string; completed_at?: string; completedAt?: string }[];
}

interface BrandPdfReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  planData?: ReadingPlanData | null;
  initialDay?: number;
  onProgressUpdated?: () => void;
}

export function BrandPdfReaderModal({
  isOpen,
  onClose,
  planData,
  initialDay = 1,
  onProgressUpdated,
}: BrandPdfReaderModalProps) {
  const [internalPlan, setInternalPlan] = useState<ReadingPlanData | null>(planData || null);
  const [currentDay, setCurrentDay] = useState(initialDay);
  const [viewMode, setViewMode] = useState<'journal' | 'pdf'>('journal');
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [completedDates, setCompletedDates] = useState<Record<string, string>>({});
  const [userNotes, setUserNotes] = useState<Record<string, string>>({});
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  // Sync internal plan when prop changes
  useEffect(() => {
    if (planData) {
      setInternalPlan(planData);
    }
  }, [planData]);

  // If plan has no items or empty items array, fetch full plan from API
  useEffect(() => {
    if (isOpen && (!internalPlan?.items || internalPlan.items.length === 0)) {
      api.getReadingPlan()
        .then((res: any) => {
          if (res && res.items && res.items.length > 0) {
            setInternalPlan(res);
          } else {
            return api.getFeaturedReadingPlan();
          }
        })
        .then((res2: any) => {
          if (res2) setInternalPlan(res2);
        })
        .catch((err) => console.error('Failed to load full reading plan:', err));
    }
  }, [isOpen, internalPlan]);

  const activePlan = internalPlan || planData;
  const totalDays = activePlan?.total_days || 30;

  // Fallback items if items array is not populated yet
  const items: ReadingItem[] =
    activePlan?.items && activePlan.items.length > 0
      ? activePlan.items
      : Array.from({ length: totalDays }, (_, i) => {
          const dayNum = i + 1;
          return {
            id: `day-item-${dayNum}`,
            day_number: dayNum,
            title: `Day ${dayNum}`,
            reference: dayNum <= 8 ? `Matthew ${dayNum}` : `Mark ${dayNum - 8}`,
            key_verse: 'Your word is a lamp for my feet, a light on my path.',
            devotional: `Take time today on Day ${dayNum} to meditate on God's living Word. Allow His peace to guard your heart and mind with divine confidence.`,
            prayer: `Heavenly Father, thank You for Your love and truth today. Guide my steps and grant me wisdom. In Jesus' name, Amen.`,
          };
        });

  const activeItem = items.find((it) => it.day_number === currentDay) || items[0];

  // Initialize progress and dates
  useEffect(() => {
    const map: Record<string, boolean> = {};
    const noteMap: Record<string, string> = {};
    const dateMap: Record<string, string> = {};

    if (activePlan?.progress) {
      activePlan.progress.forEach((p: any) => {
        map[p.item_id] = true;
        if (p.notes) noteMap[p.item_id] = p.notes;
        if (p.completed_at || p.completedAt) dateMap[p.item_id] = p.completed_at || p.completedAt;
      });
    }

    if (activePlan?.items) {
      activePlan.items.forEach((it: any) => {
        if (it.completed) {
          map[it.id] = true;
          if (it.completedAt || it.completed_at) {
            dateMap[it.id] = it.completedAt || it.completed_at;
          }
        }
      });
    }

    setCompletedItems(map);
    setUserNotes(noteMap);
    setCompletedDates(dateMap);
  }, [activePlan]);

  const isDateToday = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const hasCompletedToday = Object.entries(completedItems).some(([itemId, done]) => {
    if (!done) return false;
    return isDateToday(completedDates[itemId]);
  });

  // Check if a day can be read (unlocked):
  // - Day 1 is always unlocked.
  // - Past completed days are always unlocked.
  // - Day N is ONLY unlocked if Day N-1 was completed on a previous calendar date (before today).
  // - If Day N-1 was completed TODAY, Day N is LOCKED until tomorrow when date changes!
  const isDayUnlocked = (dayNum: number): boolean => {
    if (dayNum === 1) return true;
    const thisItem = items.find((it) => it.day_number === dayNum);
    if (thisItem && completedItems[thisItem.id]) return true;

    const prevItem = items.find((it) => it.day_number === dayNum - 1);
    if (!prevItem || !completedItems[prevItem.id]) return false;

    const prevDate = completedDates[prevItem.id];
    if (isDateToday(prevDate)) {
      return false;
    }

    return true;
  };

  const isDayCompletableToday = (dayNum: number): boolean => {
    return isDayUnlocked(dayNum) && !hasCompletedToday;
  };

  // Ensure current day never points to a locked day
  useEffect(() => {
    if (!isDayUnlocked(currentDay)) {
      let maxUnlocked = 1;
      items.forEach((it) => {
        if (isDayUnlocked(it.day_number)) {
          maxUnlocked = Math.max(maxUnlocked, it.day_number);
        }
      });
      setCurrentDay(maxUnlocked);
    }
  }, [completedItems, completedDates, items]);

  if (!isOpen) return null;

  const isCurrentCompleted = activeItem ? !!completedItems[activeItem.id] : false;
  const isCurrentCompletable = activeItem ? isDayCompletableToday(activeItem.day_number) : false;

  const handleSelectDay = (dayNum: number) => {
    if (!isDayUnlocked(dayNum)) {
      const prevItem = items.find((it) => it.day_number === dayNum - 1);
      const prevDoneToday = prevItem && completedItems[prevItem.id] && isDateToday(completedDates[prevItem.id]);
      if (prevDoneToday) {
        setLockMessage(`Day ${dayNum} will unlock tomorrow when the date changes. You have already completed today's reading.`);
      } else {
        setLockMessage(`Please complete Day ${dayNum - 1} first to unlock Day ${dayNum}.`);
      }
      setTimeout(() => setLockMessage(null), 3500);
      return;
    }
    setLockMessage(null);
    setCurrentDay(dayNum);
    setViewMode('journal');
    setSidebarOpen(false);
  };

  const handleToggleCompleted = async () => {
    if (!activeItem || !activePlan) return;
    const currentCompleted = completedItems[activeItem.id];

    if (!currentCompleted && !isCurrentCompletable) {
      setLockMessage(`You have already completed today's daily reading. Day ${activeItem.day_number} will unlock tomorrow when the date changes.`);
      setTimeout(() => setLockMessage(null), 4000);
      return;
    }

    const newCompleted = !currentCompleted;
    setCompletedItems((prev) => ({ ...prev, [activeItem.id]: newCompleted }));
    if (newCompleted) {
      setCompletedDates((prev) => ({ ...prev, [activeItem.id]: new Date().toISOString() }));
    } else {
      setCompletedDates((prev) => {
        const copy = { ...prev };
        delete copy[activeItem.id];
        return copy;
      });
    }

    try {
      await api.toggleReadingPlanProgress(
        activePlan.id,
        activeItem.id,
        userNotes[activeItem.id]
      );
      if (onProgressUpdated) onProgressUpdated();
    } catch (err: any) {
      console.error('Failed to toggle item progress:', err);
      setCompletedItems((prev) => ({ ...prev, [activeItem.id]: currentCompleted }));
      const msg = err?.message || "Failed to update daily reading progress.";
      setLockMessage(msg);
      setTimeout(() => setLockMessage(null), 4000);
    }
  };

  const handleSaveNote = async () => {
    if (!activeItem || !activePlan) return;
    setIsSavingNote(true);
    try {
      await api.toggleReadingPlanProgress(
        activePlan.id,
        activeItem.id,
        userNotes[activeItem.id] || ''
      );
      alert('Your journal reflection note has been saved!');
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const completedCount = Object.values(completedItems).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / totalDays) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-md">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#E8DFC8] bg-[#FDFBF7] shadow-2xl dark:bg-card dark:border-border">
        {/* ─── Top Bar ──────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between border-b border-[#E8DFC8]/70 bg-white/80 px-5 py-3.5 backdrop-blur-md dark:bg-card dark:border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C59B46] text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-semibold text-[#1A1A1A] dark:text-foreground">
                  {activePlan?.name || '30-Day Scripture Journal'}
                </h3>
                <span className="hidden sm:inline-block rounded-full bg-[#C59B46]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#C59B46]">
                  {activePlan?.badge_text || 'Official Guide'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-light">
                Day {currentDay} of {totalDays} • {completedCount} Completed ({progressPercent}%)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            {activePlan?.pdf_url && (
              <div className="hidden sm:flex items-center rounded-full bg-[#F5EFE6] p-1 text-xs font-medium dark:bg-muted">
                <button
                  onClick={() => setViewMode('journal')}
                  className={`rounded-full px-3 py-1 transition-all ${
                    viewMode === 'journal'
                      ? 'bg-[#C59B46] text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" /> Journal
                  </span>
                </button>
                <button
                  onClick={() => setViewMode('pdf')}
                  className={`rounded-full px-3 py-1 transition-all ${
                    viewMode === 'pdf'
                      ? 'bg-[#C59B46] text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> PDF View
                  </span>
                </button>
              </div>
            )}

            {/* Print / Download Button */}
            <button
              onClick={handlePrint}
              className="flex h-9 items-center gap-1.5 rounded-full border border-[#E8DFC8] bg-white px-3.5 text-xs font-medium text-foreground shadow-sm hover:bg-[#FAF5EB] transition-all dark:bg-card dark:border-border"
              title="Print / Save as PDF"
            >
              <Printer className="h-4 w-4 text-[#C59B46]" />
              <span className="hidden md:inline">Print / Download</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* ─── Main Content Area ────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar / Days Navigation */}
          <aside
            className={`w-64 shrink-0 border-r border-[#E8DFC8]/70 bg-white/60 p-4 overflow-y-auto dark:bg-card/40 dark:border-border ${
              sidebarOpen ? 'block' : 'hidden md:block'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                30-Day Tracker
              </span>
              <span className="text-xs font-semibold text-[#C59B46]">
                {completedCount}/{totalDays}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-4 h-1.5 w-full rounded-full bg-[#E8DFC8]/60 overflow-hidden dark:bg-muted">
              <div
                className="h-full bg-[#C59B46] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Days List */}
            <div className="space-y-1.5">
              {items.map((it) => {
                const isSelected = it.day_number === currentDay;
                const isDone = !!completedItems[it.id];
                const unlocked = isDayUnlocked(it.day_number);

                return (
                  <button
                    key={it.id}
                    onClick={() => handleSelectDay(it.day_number)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[#C59B46] text-white shadow-sm'
                        : unlocked
                        ? 'text-foreground/80 hover:bg-[#FAF5EB] dark:hover:bg-muted/40'
                        : 'text-muted-foreground/50 opacity-60 hover:bg-muted/30 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-5 shrink-0 text-center font-serif font-bold ${isSelected ? 'text-white' : unlocked ? 'text-[#C59B46]' : 'text-muted-foreground/60'}`}>
                        {it.day_number}
                      </span>
                      <span className="truncate">{it.title || `Day ${it.day_number}`}</span>
                    </div>

                    {isDone ? (
                      <CheckCircle2
                        className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600'}`}
                      />
                    ) : !unlocked ? (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Reading Center Screen */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#FDFBF7] dark:bg-background relative">
            {/* Lock Guidance Banner */}
            {lockMessage && (
              <div className="sticky top-0 z-20 mb-4 flex items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 shadow-sm dark:bg-amber-950/40 dark:border-amber-700/50 dark:text-amber-200 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#C59B46] shrink-0" />
                  <span>{lockMessage}</span>
                </div>
                <button onClick={() => setLockMessage(null)} className="text-amber-700 hover:text-amber-900 dark:text-amber-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {viewMode === 'pdf' && activePlan?.pdf_url ? (
              /* PDF Embedded Viewer */
              <div className="h-full w-full rounded-2xl overflow-hidden border border-[#E8DFC8] bg-white shadow-sm dark:bg-card dark:border-border flex flex-col">
                <div className="flex items-center justify-between border-b border-border p-3 bg-muted/20">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-[#C59B46]" />
                    Official PDF Document
                  </span>
                  <a
                    href={activePlan.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#C59B46] hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Original File
                  </a>
                </div>
                <iframe
                  src={activePlan.pdf_url}
                  title="PDF Reader"
                  className="w-full flex-1 border-0"
                />
              </div>
            ) : activeItem ? (
              /* Interactive Luxury Journal Reading View */
              <div className="mx-auto max-w-2xl space-y-6">
                {/* Day Header Badge */}
                <div className="text-center space-y-2 pb-2 border-b border-[#E8DFC8]/60 dark:border-border">
                  <span className="inline-block font-serif text-sm font-semibold tracking-widest uppercase text-[#C59B46]">
                    DAY {activeItem.day_number}
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-normal text-foreground leading-tight">
                    {activeItem.title}
                  </h2>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF5EB] px-3.5 py-1 text-xs font-medium text-[#8C7138] border border-[#E8DFC8]/80 dark:bg-muted dark:text-muted-foreground dark:border-transparent">
                    <BookOpen className="h-3.5 w-3.5 text-[#C59B46]" />
                    <span>Scripture Reading: {activeItem.reference}</span>
                  </div>
                </div>

                {/* Key Scripture Highlight Box */}
                {activeItem.key_verse && (
                  <div className="relative overflow-hidden rounded-2xl border border-[#C59B46]/30 bg-[#FAF5EB] p-6 shadow-sm dark:bg-[#C59B46]/5 dark:border-[#C59B46]/20">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#C59B46]">
                        KEY SCRIPTURE VERSE
                      </span>
                      <blockquote className="font-serif text-base sm:text-lg italic text-[#2A2A2A] dark:text-foreground/90 leading-relaxed">
                        "{activeItem.key_verse}"
                      </blockquote>
                      <p className="text-right text-xs font-medium text-[#8C7138] dark:text-[#C59B46]">
                        — {activeItem.reference}
                      </p>
                    </div>
                  </div>
                )}

                {/* Devotional Reflection Reading */}
                <div className="space-y-3">
                  <h4 className="font-serif text-lg font-medium text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#C59B46]" />
                    Devotional Meditation
                  </h4>
                  <p className="font-light text-sm sm:text-base text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {activeItem.devotional ||
                      `Take time today to meditate on the living truth of ${activeItem.reference}. Allow God's peace to govern your thoughts, establishing your heart with divine confidence and spiritual authority.`}
                  </p>
                </div>

                {/* Guided Daily Prayer */}
                <div className="rounded-2xl border border-[#E8DFC8] bg-white p-5 space-y-2 shadow-sm dark:bg-card dark:border-border">
                  <h4 className="font-serif text-sm font-semibold uppercase tracking-wider text-[#C59B46]">
                    Today's Prayer Declaration
                  </h4>
                  <p className="font-serif italic text-sm text-foreground/90 leading-relaxed">
                    "{activeItem.prayer ||
                      `Lord, thank You for Your word in ${activeItem.reference}. Guide my steps today, fill my heart with Your wisdom, and grant me the grace to walk in obedience and peace. In Jesus' name, Amen.`}"
                  </p>
                </div>

                {/* Personal Notes & Reflections Area */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Personal Journal & Reflection Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Write what the Holy Spirit is speaking to you today..."
                    value={userNotes[activeItem.id] || ''}
                    onChange={(e) =>
                      setUserNotes((prev) => ({ ...prev, [activeItem.id]: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-[#E8DFC8] bg-white p-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-[#C59B46] focus:outline-none dark:bg-card dark:border-border resize-none leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNote}
                      disabled={isSavingNote}
                      className="text-xs font-semibold text-[#C59B46] hover:underline"
                    >
                      {isSavingNote ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                </div>

                {/* Mark as Completed & Navigation Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E8DFC8]/70 pt-6 dark:border-border">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentDay(Math.max(1, currentDay - 1))}
                      disabled={currentDay <= 1}
                      className="flex h-10 items-center gap-1 rounded-full border border-[#E8DFC8] bg-white px-4 text-xs font-medium text-foreground disabled:opacity-40 hover:bg-[#FAF5EB] transition-all dark:bg-card dark:border-border"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous Day
                    </button>
                    <button
                      onClick={() => handleSelectDay(currentDay + 1)}
                      disabled={currentDay >= totalDays}
                      className="flex h-10 items-center gap-1 rounded-full border border-[#E8DFC8] bg-white px-4 text-xs font-medium text-foreground disabled:opacity-40 hover:bg-[#FAF5EB] transition-all dark:bg-card dark:border-border"
                    >
                      Next Day <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Mark Day Complete Button */}
                  <button
                    onClick={handleToggleCompleted}
                    disabled={!isCurrentCompleted && !isCurrentCompletable}
                    className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                      isCurrentCompleted
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : !isCurrentCompletable
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                        : 'bg-[#C59B46] text-white hover:bg-[#b0873a]'
                    }`}
                  >
                    {isCurrentCompleted ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Completed ✓</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Mark Day Completed</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
