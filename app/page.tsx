'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useAnimatedList } from '@/lib/useAnimatedList';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  KeyRound,
  Binoculars,
  LayoutGrid,
  Link,
  Loader2,
  Menu,
  Pencil,
  Plus,
  List as ListIcon,
  RefreshCw,
  ShieldPlus,
  Shield,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import styles from './page.module.css';

type Item = {
  id: string;
  title: string;
  watched: boolean;
  addedBy?: string;
  poster?: string;
  runtimeMinutes?: number;
  releaseDate?: string;
  createdAt: number;
  updatedAt: number;
};

type List = {
  id: string;
  name: string;
  items: Item[];
  updatedAt: number;
  protected: boolean;
};

type SearchSuggestion = {
  id: number;
  title: string;
  year?: string;
  poster?: string;
  releaseDate?: string;
};

type SortOption =
  | 'addedRecent'
  | 'addedOldest'
  | 'releaseAsc'
  | 'releaseDesc'
  | 'titleAsc'
  | 'titleDesc';

type LayoutSelection = 'grid-4' | 'grid-5' | 'list';

const LAYOUT_OPTIONS: LayoutSelection[] = ['grid-5', 'grid-4', 'list'];
const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'addedRecent', label: 'Latest added' },
  { value: 'addedOldest', label: 'Earliest added' },
  { value: 'releaseAsc', label: 'Oldest release' },
  { value: 'releaseDesc', label: 'Newest release' },
  { value: 'titleAsc', label: 'Title A-Z' },
  { value: 'titleDesc', label: 'Title Z-A' }
];

const RANDOM_COUNTDOWN_DURATION = 5;

const QUICK_START_MOVIES: Array<{
  title: string;
  releaseDate: string;
  poster: string;
  runtimeMinutes: number;
}> = [
  {
    title: 'The Godfather (1972)',
    releaseDate: '1972-03-14',
    poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    runtimeMinutes: 175
  },
  {
    title: 'Casablanca (1942)',
    releaseDate: '1942-11-26',
    poster: 'https://image.tmdb.org/t/p/w500/5K7cOHoay2mZusSLezBOY0Qxh8a.jpg',
    runtimeMinutes: 102
  },
  {
    title: 'Forrest Gump (1994)',
    releaseDate: '1994-07-06',
    poster: 'https://image.tmdb.org/t/p/w500/saHP97rTPS5eLmrLQEcANmKrsFl.jpg',
    runtimeMinutes: 142
  },
  {
    title: 'The Shawshank Redemption (1994)',
    releaseDate: '1994-09-23',
    poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    runtimeMinutes: 142
  },
  {
    title: 'Raiders of the Lost Ark (1981)',
    releaseDate: '1981-06-12',
    poster: 'https://image.tmdb.org/t/p/w500/ceG9VzoRAVGwivFU403Wc3AHRys.jpg',
    runtimeMinutes: 115
  },
  {
    title: 'The Dark Knight (2008)',
    releaseDate: '2008-07-16',
    poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    runtimeMinutes: 152
  },
  {
    title: 'The Lord of the Rings: The Fellowship of the Ring (2001)',
    releaseDate: '2001-12-18',
    poster: 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
    runtimeMinutes: 178
  },
  {
    title: 'Back to the Future (1985)',
    releaseDate: '1985-07-03',
    poster: 'https://image.tmdb.org/t/p/w500/qvktm0BHcnmDpul4Hz01GIazWPr.jpg',
    runtimeMinutes: 116
  }
];

const QUICK_START_DELAY_MS = 500;

function normalizeTitle(value: string): string {
  return value.replace(/\s*\(\d{4}\)$/, '').trim().toLowerCase();
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    cache: 'no-store',
    ...init,
    headers
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text || 'Request failed';
    try {
      const data = JSON.parse(text);
      message = data.error ?? data.message ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.json();
}

function parseError(err: unknown): string {
  if (err instanceof Error) return err.message || 'Something went wrong.';
  if (typeof err === 'string') return err;
  return 'Something went wrong. Please try again.';
}

function formatRelative(timestamp: number | null): string | null {
  if (!timestamp) return null;
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'min' : 'mins'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatRuntime(minutes: number): string {
  if (!minutes) return '0m';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours && remaining) return `${hours}h ${remaining}m`;
  if (hours) return `${hours}h`;
  return `${remaining}m`;
}

function getReleaseTimestamp(item: Item): number | null {
  if (item.releaseDate) {
    const parsed = Date.parse(item.releaseDate);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  const match = item.title.match(/\((\d{4})\)$/);
  if (match) {
    const year = Number(match[1]);
    if (!Number.isNaN(year)) {
      const parsed = Date.parse(`${match[1]}-01-01T00:00:00Z`);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function getComparableTitle(item: Item): string {
  return item.title.replace(/\s*\(\d{4}\)$/, '').trim().toLowerCase();
}

export default function Page() {
  const [list, setList] = useState<List | null>(null);
  const [listName, setListName] = useState('');
  const [listIdInput, setListIdInput] = useState('');
  const [title, setTitle] = useState('');
  const [addedBy, setAddedBy] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<
    Array<{ id: number; type: 'success' | 'error'; message: string }>
  >([]);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [lastListId, setLastListId] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null);
  const [selectedRuntime, setSelectedRuntime] = useState<number | null>(null);
  const [selectedReleaseDate, setSelectedReleaseDate] = useState<string | null>(null);
  const [createPassword, setCreatePassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [activePassword, setActivePassword] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('addedRecent');
  const [showUnwatchedOnly, setShowUnwatchedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridColumns, setGridColumns] = useState<4 | 5>(5);
  const [entryMode, setEntryMode] = useState<'create' | 'join'>('create');
  const [randomPick, setRandomPick] = useState<Item | null>(null);
  const [showRandomOverlay, setShowRandomOverlay] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [countdownSession, setCountdownSession] = useState(0);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [sortMenuState, setSortMenuState] = useState<'closed' | 'open' | 'closing'>('closed');
  const [initialListLoading, setInitialListLoading] = useState(false);
  const [passwordDialogType, setPasswordDialogType] = useState<
    'set' | 'change' | 'remove' | 'delete' | null
  >(null);
  const [passwordDialogNew, setPasswordDialogNew] = useState('');
  const [passwordDialogConfirm, setPasswordDialogConfirm] = useState('');
  const [passwordDialogCurrent, setPasswordDialogCurrent] = useState('');
  const [passwordDialogError, setPasswordDialogError] = useState<string | null>(null);
  const [passwordDialogSubmitting, setPasswordDialogSubmitting] = useState(false);
  const randomTitleId = useId();
  const randomDescriptionId = useId();
  const filterToggleId = useId();
  const sortMenuButtonId = useId();
  const sortMenuListId = useId();
  const countdownGradientId = useId();
  const listMenuDropdownId = useId();
  const listMenuButtonId = useId();
  const protectedTooltipId = useId();
  const passwordDialogTitleId = useId();
  const passwordDialogDescriptionId = useId();
  const passwordDialogCurrentId = useId();
  const passwordDialogPasswordId = useId();
  const passwordDialogConfirmId = useId();
  const blurTimeoutRef = useRef<number | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const detailsRequestRef = useRef(0);
  const notificationIdRef = useRef(0);
  const notificationTimeoutsRef = useRef<Map<number, number>>(new Map());
  const randomCloseRef = useRef<HTMLButtonElement | null>(null);
  const listMenuRef = useRef<HTMLDivElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const sortMenuCloseTimeoutRef = useRef<number | null>(null);
  const passwordDialogFormRef = useRef<HTMLFormElement | null>(null);
  const passwordDialogInputRef = useRef<HTMLInputElement | null>(null);
  const passwordDialogCloseRef = useRef<HTMLButtonElement | null>(null);
  const itemsParent = useAnimatedList<HTMLElement>({
    duration: 260,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    dependencies: [list?.items, sortOption, showUnwatchedOnly, viewMode, gridColumns]
  });
  const currentSortLabel = useMemo(
    () => SORT_OPTIONS.find((option) => option.value === sortOption)?.label ?? 'Sort',
    [sortOption]
  );

  const layoutSelection: LayoutSelection = viewMode === 'list' ? 'list' : gridColumns === 4 ? 'grid-4' : 'grid-5';
  const selectLayout = useCallback(
    (selection: LayoutSelection) => {
      if (selection === 'list') {
        setViewMode('list');
        return;
      }
      setViewMode('grid');
      setGridColumns(selection === 'grid-4' ? 4 : 5);
    },
    [setGridColumns, setViewMode]
  );
  const handleLayoutKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, current: LayoutSelection) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowDown' && event.key !== 'ArrowLeft' && event.key !== 'ArrowUp') {
        return;
      }
      event.preventDefault();
      const index = LAYOUT_OPTIONS.indexOf(current);
      if (index === -1) {
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        const next = LAYOUT_OPTIONS[(index + 1) % LAYOUT_OPTIONS.length];
        selectLayout(next);
      } else {
        const nextIndex = (index - 1 + LAYOUT_OPTIONS.length) % LAYOUT_OPTIONS.length;
        selectLayout(LAYOUT_OPTIONS[nextIndex]);
      }
    },
    [selectLayout]
  );

  const closeSortMenu = useCallback(() => {
    if (sortMenuCloseTimeoutRef.current) {
      window.clearTimeout(sortMenuCloseTimeoutRef.current);
    }
    setSortMenuState('closing');
    sortMenuCloseTimeoutRef.current = window.setTimeout(() => {
      setSortMenuState('closed');
      sortMenuCloseTimeoutRef.current = null;
    }, 180);
  }, []);

  const openSortMenu = useCallback(() => {
    if (sortMenuCloseTimeoutRef.current) {
      window.clearTimeout(sortMenuCloseTimeoutRef.current);
      sortMenuCloseTimeoutRef.current = null;
    }
    setSortMenuState('open');
  }, []);

  const withPassword = useCallback(
    (init: RequestInit = {}, override?: string) => {
      const password = override ?? activePassword;
      if (!password) {
        return init;
      }
      const headers = new Headers(init.headers ?? undefined);
      headers.set('x-list-password', password);
      return { ...init, headers } satisfies RequestInit;
    },
    [activePassword]
  );

  useEffect(() => {
    if (!listMenuOpen) {
      return;
    }
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (!listMenuRef.current) {
        return;
      }
      if (!listMenuRef.current.contains(event.target as Node)) {
        setListMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setListMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [listMenuOpen]);

  useEffect(() => {
    if (sortMenuState === 'closed') {
      return;
    }
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (!sortMenuRef.current) {
        return;
      }
      if (!sortMenuRef.current.contains(event.target as Node)) {
        closeSortMenu();
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSortMenu();
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [closeSortMenu, sortMenuState]);

  useEffect(() => {
    return () => {
      if (sortMenuCloseTimeoutRef.current) {
        window.clearTimeout(sortMenuCloseTimeoutRef.current);
      }
    };
  }, []);

  const dismissNotification = useCallback((id: number) => {
    setNotifications((current) => current.filter((note) => note.id !== id));
    if (typeof window !== 'undefined') {
      const timeout = notificationTimeoutsRef.current.get(id);
      if (timeout) {
        window.clearTimeout(timeout);
        notificationTimeoutsRef.current.delete(id);
      }
    }
  }, []);

  const pushNotification = useCallback(
    (type: 'success' | 'error', message: string) => {
      notificationIdRef.current += 1;
      const id = notificationIdRef.current;
      setNotifications((current) => [...current, { id, type, message }]);
      if (typeof window !== 'undefined') {
        const timeout = window.setTimeout(() => {
          dismissNotification(id);
          notificationTimeoutsRef.current.delete(id);
        }, 4000);
        notificationTimeoutsRef.current.set(id, timeout);
      }
    },
    [dismissNotification]
  );

  const closePasswordDialog = useCallback(() => {
    setPasswordDialogType(null);
    setPasswordDialogNew('');
    setPasswordDialogConfirm('');
    setPasswordDialogCurrent('');
    setPasswordDialogError(null);
    setPasswordDialogSubmitting(false);
  }, []);

  const openPasswordDialog = useCallback((type: 'set' | 'change' | 'remove' | 'delete') => {
    setPasswordDialogType(type);
    setPasswordDialogNew('');
    setPasswordDialogConfirm('');
    setPasswordDialogCurrent('');
    setPasswordDialogError(null);
    setPasswordDialogSubmitting(false);
  }, []);

  const ensurePasswordForChanges = useCallback(() => {
    if (list?.protected && !activePassword) {
      const message = 'Enter the list password to make changes.';
      setError(message);
      pushNotification('error', message);
      return false;
    }
    return true;
  }, [activePassword, list, pushNotification]);

  useEffect(() => {
    if (!passwordDialogType) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePasswordDialog();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, [closePasswordDialog, passwordDialogType]);

  useEffect(() => {
    if (!passwordDialogType) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const timeout = window.setTimeout(() => {
      if (passwordDialogType === 'delete' && !list?.protected) {
        passwordDialogCloseRef.current?.focus();
      } else {
        passwordDialogInputRef.current?.focus();
      }
    }, 40);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [list, passwordDialogType]);

  useEffect(() => {
    if (passwordDialogType && !list) {
      closePasswordDialog();
    }
  }, [closePasswordDialog, list, passwordDialogType]);

  useEffect(() => {
    if (list) {
      setNameDraft(list.name);
    } else {
      setRenaming(false);
      setShowRandomOverlay(false);
      setRandomPick(null);
      setActivePassword(null);
    }
    setListMenuOpen(false);
  }, [list]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        notificationTimeoutsRef.current.forEach((timeout) => {
          window.clearTimeout(timeout);
        });
      }
      notificationTimeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get('list');
    const stored = window.localStorage.getItem('listId');
    if (stored) {
      setLastListId(stored);
      setListIdInput(stored);
    }
    if (queryId) {
      setListIdInput(queryId);
      setInitialListLoading(true);
      void joinList(queryId).finally(() => {
        setInitialListLoading(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    if (!list) {
      return {
        total: 0,
        watched: 0,
        pending: 0,
        watchedPercent: 0,
        pendingPercent: 0,
        totalRuntime: 0,
        watchedRuntime: 0,
        pendingRuntime: 0,
        watchedRuntimePercent: 0,
        watchedRuntimeShare: 0
      };
    }
    const total = list.items.length;
    const watched = list.items.filter((item) => item.watched).length;
    const pending = total - watched;
    const watchedPercent = total ? Math.round((watched / total) * 100) : 0;
    const pendingPercent = total ? Math.round((pending / total) * 100) : 0;
    const totalRuntime = list.items.reduce(
      (sum, item) => sum + (item.runtimeMinutes ? Math.max(item.runtimeMinutes, 0) : 0),
      0
    );
    const watchedRuntime = list.items.reduce((sum, item) => {
      if (!item.watched) return sum;
      return sum + (item.runtimeMinutes ? Math.max(item.runtimeMinutes, 0) : 0);
    }, 0);
    const pendingRuntime = Math.max(totalRuntime - watchedRuntime, 0);
    const watchedRuntimeShare = totalRuntime
      ? Math.min(100, Math.max((watchedRuntime / totalRuntime) * 100, 0))
      : 0;
    const watchedRuntimePercent = Math.round(watchedRuntimeShare);
    return {
      total,
      watched,
      pending,
      watchedPercent,
      pendingPercent,
      totalRuntime,
      watchedRuntime,
      pendingRuntime,
      watchedRuntimePercent,
      watchedRuntimeShare
    };
  }, [list]);

  const trimmedNewPassword = passwordDialogNew.trim();
  const trimmedConfirmPassword = passwordDialogConfirm.trim();
  const trimmedCurrentPassword = passwordDialogCurrent.trim();

  const displayItems = useMemo(() => {
    if (!list) return [] as Item[];
    const items = [...list.items].filter((item) => {
      if (showUnwatchedOnly && item.watched) {
        return false;
      }
      return true;
    });
    switch (sortOption) {
      case 'releaseDesc': {
        return items.sort((a, b) => {
          const aTime = getReleaseTimestamp(a);
          const bTime = getReleaseTimestamp(b);
          if (aTime === null && bTime === null) {
            return b.createdAt - a.createdAt;
          }
          if (aTime === null) return 1;
          if (bTime === null) return -1;
          return bTime - aTime;
        });
      }
      case 'releaseAsc': {
        return items.sort((a, b) => {
          const aTime = getReleaseTimestamp(a);
          const bTime = getReleaseTimestamp(b);
          if (aTime === null && bTime === null) {
            return b.createdAt - a.createdAt;
          }
          if (aTime === null) return 1;
          if (bTime === null) return -1;
          return aTime - bTime;
        });
      }
      case 'titleAsc': {
        return items.sort((a, b) => {
          const aTitle = getComparableTitle(a);
          const bTitle = getComparableTitle(b);
          if (aTitle === bTitle) {
            return a.title.localeCompare(b.title);
          }
          return aTitle.localeCompare(bTitle);
        });
      }
      case 'titleDesc': {
        return items.sort((a, b) => {
          const aTitle = getComparableTitle(a);
          const bTitle = getComparableTitle(b);
          if (aTitle === bTitle) {
            return b.title.localeCompare(a.title);
          }
          return bTitle.localeCompare(aTitle);
        });
      }
      case 'addedRecent':
        return items.sort((a, b) => b.createdAt - a.createdAt);
      case 'addedOldest':
        return items.sort((a, b) => a.createdAt - b.createdAt);
      default:
        return items;
    }
  }, [list, showUnwatchedOnly, sortOption]);

  const joinList = useCallback(
    async (id: string, passwordInput?: string) => {
      const cleanId = id.trim();
      const providedPassword = (passwordInput ?? joinPassword).trim();
      if (!cleanId) {
        const message = 'Enter a list ID to continue.';
        setError(message);
        if (list) {
          pushNotification('error', message);
        }
        return;
      }
      setJoining(true);
      setError(null);
      try {
        const headers = providedPassword
          ? { 'x-list-password': providedPassword }
          : undefined;
        const data = await api<List>(`/api/lists/${cleanId}`, { headers });
        setList(data);
        setListName(data.name);
        setLastSynced(Date.now());
        setLastListId(data.id);
        setListIdInput('');
        setActivePassword(providedPassword ? providedPassword : null);
        setJoinPassword('');
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('listId', data.id);
          const url = new URL(window.location.href);
          url.searchParams.set('list', data.id);
          window.history.replaceState({}, '', url.toString());
        }
      } catch (err) {
        const message = parseError(err);
        setError(message);
        if (list) {
          pushNotification('error', message);
        }
        if (!list || list.id === cleanId) {
          setActivePassword(null);
        }
      } finally {
        setJoining(false);
      }
    },
    [joinPassword, list, pushNotification]
  );

  const createList = useCallback(async (): Promise<List | null> => {
    setCreating(true);
    setError(null);
    try {
      const trimmedPassword = createPassword.trim();
      const data = await api<List>(`/api/lists`, {
        method: 'POST',
        body: JSON.stringify({
          name: listName.trim() || 'Watchlist',
          password: trimmedPassword || undefined
        })
      });
      setList(data);
      setListName(data.name);
      setLastSynced(Date.now());
      setLastListId(data.id);
      setActivePassword(trimmedPassword ? trimmedPassword : null);
      setCreatePassword('');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('listId', data.id);
        const url = new URL(window.location.href);
        url.searchParams.set('list', data.id);
        window.history.replaceState({}, '', url.toString());
      }
      return data;
    } catch (err) {
      const message = parseError(err);
      setError(message);
      pushNotification('error', message);
      return null;
    } finally {
      setCreating(false);
    }
  }, [createPassword, listName, pushNotification]);

  const quickStart = useCallback(async () => {
    if (list) return;
    const passwordOverride = createPassword.trim() || undefined;
    const created = await createList();
    if (!created) {
      return;
    }
    setCreating(true);
    setError(null);
    try {
      let current = created;
      for (const movie of [...QUICK_START_MOVIES].reverse()) {
        current = await api<List>(
          `/api/lists/${created.id}`,
          withPassword(
            {
              method: 'POST',
              body: JSON.stringify({
                title: movie.title,
                poster: movie.poster,
                releaseDate: movie.releaseDate,
                runtimeMinutes: movie.runtimeMinutes
              })
            },
            passwordOverride
          )
        );
        setList(current);
        await new Promise((resolve) => setTimeout(resolve, QUICK_START_DELAY_MS));
      }
      setLastSynced(Date.now());
      pushNotification('success', 'Loaded a starter watchlist with popular movies.');
    } catch (err) {
      const message = parseError(err);
      setError(message);
      pushNotification('error', message);
    } finally {
      setCreating(false);
    }
  }, [createList, createPassword, list, pushNotification, withPassword]);

  const addItem = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!list) return;
      if (!title.trim()) {
        const message = 'Add a title to include an item.';
        setError(message);
        pushNotification('error', message);
        return;
      }
      const normalizedInput = normalizeTitle(title);
      const hasDuplicate = list.items.some((item) => {
        if (normalizeTitle(item.title) !== normalizedInput) {
          return false;
        }
        if (selectedReleaseDate && item.releaseDate) {
          return item.releaseDate === selectedReleaseDate;
        }
        return true;
      });
      if (hasDuplicate) {
        const message = 'That movie is already on your watchlist.';
        setError(message);
        pushNotification('error', message);
        return;
      }
      if (!ensurePasswordForChanges()) {
        return;
      }
      setAdding(true);
      setError(null);
      try {
        const data = await api<List>(`/api/lists/${list.id}`, withPassword({
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            addedBy: addedBy.trim() || undefined,
            poster: selectedPoster ?? undefined,
            runtimeMinutes: selectedRuntime ?? undefined,
            releaseDate: selectedReleaseDate ?? undefined
          })
        }));
        setList(data);
        setTitle('');
        setSelectedPoster(null);
        setSelectedRuntime(null);
        setSelectedReleaseDate(null);
        setLastSynced(Date.now());
        pushNotification('success', 'Item added to your watchlist.');
      } catch (err) {
        const message = parseError(err);
        setError(message);
        pushNotification('error', message);
      } finally {
        setAdding(false);
      }
    },
    [addedBy, ensurePasswordForChanges, list, pushNotification, selectedPoster, selectedReleaseDate, selectedRuntime, title, withPassword]
  );

  const fetchSuggestionDetails = useCallback(async (id: number) => {
    const requestId = detailsRequestRef.current + 1;
    detailsRequestRef.current = requestId;
    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/movies/${id}`);
      if (!response.ok) {
        throw new Error('Unable to fetch details.');
      }
      const data = await response.json();
      if (detailsRequestRef.current !== requestId) return;
      const runtimeValue =
        typeof data?.runtimeMinutes === 'number' && Number.isFinite(data.runtimeMinutes)
          ? data.runtimeMinutes
          : null;
      setSelectedRuntime(runtimeValue);
      setSelectedReleaseDate((previous) => {
        if (typeof data?.releaseDate === 'string' && data.releaseDate) {
          return data.releaseDate;
        }
        return previous;
      });
    } catch (err) {
      if (detailsRequestRef.current !== requestId) return;
      setSelectedRuntime(null);
      console.error(err);
    } finally {
      if (detailsRequestRef.current === requestId) {
        setDetailsLoading(false);
      }
    }
  }, []);

  const handleSelectSuggestion = useCallback(
    (suggestion: SearchSuggestion) => {
      const display = suggestion.year
        ? `${suggestion.title} (${suggestion.year})`
        : suggestion.title;
      setTitle(display);
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      setSelectedPoster(suggestion.poster ?? null);
      setSelectedRuntime(null);
      setSelectedReleaseDate(suggestion.releaseDate ?? null);
      void fetchSuggestionDetails(suggestion.id);
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      titleInputRef.current?.focus();
    },
    [fetchSuggestionDetails]
  );

  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setTitle(value);
      setShowSuggestions(false);
      setSuggestions([]);
      setHighlightedIndex(-1);
      setSelectedPoster(null);
      setSelectedRuntime(null);
      setSelectedReleaseDate(null);
      detailsRequestRef.current += 1;
      setDetailsLoading(false);
    },
    []
  );

  const handleTitleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((index) => (index + 1) % suggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((index) =>
          index <= 0 ? suggestions.length - 1 : index - 1
        );
        return;
      }
      if (event.key === 'Enter') {
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          event.preventDefault();
          handleSelectSuggestion(suggestions[highlightedIndex]);
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    },
    [handleSelectSuggestion, highlightedIndex, showSuggestions, suggestions]
  );

  const refreshList = useCallback(
    async (id?: string, showStatus = true) => {
      const target = id ?? list?.id;
      if (!target) return;
      if (list?.protected && !activePassword) {
        const message = 'Enter the list password to refresh this list.';
        setError(message);
        if (showStatus) {
          pushNotification('error', message);
        }
        return;
      }
      setRefreshing(true);
      try {
        const data = await api<List>(`/api/lists/${target}`, withPassword());
        setList(data);
        if (!data.protected) {
          setActivePassword(null);
        }
        setLastSynced(Date.now());
      } catch (err) {
        const message = parseError(err);
        setError(message);
        if (showStatus) {
          pushNotification('error', message);
        }
      } finally {
        setRefreshing(false);
      }
    },
    [activePassword, list, pushNotification, withPassword]
  );

  const toggleWatched = useCallback(
    async (item: Item) => {
      if (!list) return;
      if (!ensurePasswordForChanges()) return;
      const optimistic = {
        ...list,
        items: list.items.map((i) =>
          i.id === item.id
            ? { ...i, watched: !item.watched, updatedAt: Date.now() }
            : i
        )
      };
      setList(optimistic);
      try {
        const data = await api<List>(`/api/lists/${list.id}`, withPassword({
          method: 'PATCH',
          body: JSON.stringify({ itemId: item.id, watched: !item.watched })
        }));
        setList(data);
        setLastSynced(Date.now());
      } catch (err) {
        const message = parseError(err);
        setError(message);
        pushNotification('error', message);
        await refreshList(list.id, false);
      }
    },
    [ensurePasswordForChanges, list, pushNotification, refreshList, withPassword]
  );

  const removeItem = useCallback(
    async (item: Item) => {
      if (!list) return;
      if (!ensurePasswordForChanges()) return;
      try {
        const data = await api<List>(`/api/lists/${list.id}`, withPassword({
          method: 'DELETE',
          body: JSON.stringify({ itemId: item.id })
        }));
        setList(data);
        setLastSynced(Date.now());
        pushNotification('success', 'Item removed.');
      } catch (err) {
        const message = parseError(err);
        setError(message);
        pushNotification('error', message);
        await refreshList(list.id, false);
      }
    },
    [ensurePasswordForChanges, list, pushNotification, refreshList, withPassword]
  );

  const leaveList = useCallback(() => {
    setListMenuOpen(false);
    const previousId = list?.id ?? null;
    setList(null);
    setListName('');
    setTitle('');
    setAddedBy('');
    setError(null);
    setLastSynced(null);
    setListIdInput(previousId ?? '');
    setLastListId(previousId);
    setActivePassword(null);
    setJoinPassword('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('listId');
      const url = new URL(window.location.href);
      url.searchParams.delete('list');
      window.history.replaceState({}, '', url.toString());
    }
  }, [list]);

  const copyId = useCallback(async () => {
    if (!list) return;
    try {
      await navigator.clipboard.writeText(list.id);
      setError(null);
      pushNotification('success', 'List ID copied to clipboard.');
    } catch (err) {
      const message = 'Unable to copy. Copy it manually instead.';
      setError(message);
      pushNotification('error', message);
    }
  }, [list, pushNotification]);

  const copyLink = useCallback(async () => {
    if (!list) return;
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('list', list.id);
      await navigator.clipboard.writeText(url.toString());
      setError(null);
      pushNotification('success', 'Shareable link copied.');
    } catch (err) {
      const message = 'Unable to copy. Copy it manually instead.';
      setError(message);
      pushNotification('error', message);
    }
  }, [list, pushNotification]);

  const copyPassword = useCallback(async () => {
    if (!list?.protected) return;
    if (!activePassword) {
      const message = 'Enter the list password to copy it.';
      setError(message);
      pushNotification('error', message);
      return;
    }
    try {
      await navigator.clipboard.writeText(activePassword);
      setError(null);
      pushNotification('success', 'Password copied to clipboard.');
    } catch (err) {
      const message = 'Unable to copy. Copy it manually instead.';
      setError(message);
      pushNotification('error', message);
    }
  }, [activePassword, list, pushNotification]);

  const handlePasswordDialogSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!list || !passwordDialogType) {
        return;
      }
      const trimmedNew = passwordDialogNew.trim();
      const trimmedConfirm = passwordDialogConfirm.trim();
      const trimmedCurrent = passwordDialogCurrent.trim();

      if (passwordDialogType === 'set' || passwordDialogType === 'change') {
        if (!trimmedNew) {
          setPasswordDialogError('Enter a password to continue.');
          return;
        }
        if (trimmedConfirm !== trimmedNew) {
          setPasswordDialogError('Passwords do not match.');
          return;
        }
        const authorizationPassword =
          passwordDialogType === 'change'
            ? trimmedCurrent || activePassword || undefined
            : activePassword ?? undefined;
        if (passwordDialogType === 'change' && !authorizationPassword) {
          setPasswordDialogError('Enter the current password to update it.');
          return;
        }
        setPasswordDialogSubmitting(true);
        setPasswordDialogError(null);
        try {
          const data = await api<List>(
            `/api/lists/${list.id}`,
            withPassword(
              {
                method: 'PATCH',
                body: JSON.stringify({ password: trimmedNew })
              },
              authorizationPassword
            )
          );
          setList(data);
          setLastSynced(Date.now());
          setActivePassword(trimmedNew);
          setError(null);
          pushNotification(
            'success',
            passwordDialogType === 'set'
              ? 'Password added to this watchlist.'
              : 'Password updated.'
          );
          closePasswordDialog();
        } catch (err) {
          const message = parseError(err);
          setPasswordDialogError(message);
          setError(message);
        } finally {
          setPasswordDialogSubmitting(false);
        }
        return;
      }

      if (passwordDialogType === 'remove') {
        if (!list.protected) {
          closePasswordDialog();
          return;
        }
        const authorizationPassword = trimmedCurrent || activePassword || undefined;
        if (!authorizationPassword) {
          setPasswordDialogError('Enter the password to remove it.');
          return;
        }
        setPasswordDialogSubmitting(true);
        setPasswordDialogError(null);
        try {
          const data = await api<List>(
            `/api/lists/${list.id}`,
            withPassword(
              {
                method: 'PATCH',
                body: JSON.stringify({ password: null })
              },
              authorizationPassword
            )
          );
          setList(data);
          setLastSynced(Date.now());
          setActivePassword(null);
          setError(null);
          pushNotification('success', 'Password removed.');
          closePasswordDialog();
        } catch (err) {
          const message = parseError(err);
          setPasswordDialogError(message);
          setError(message);
        } finally {
          setPasswordDialogSubmitting(false);
        }
        return;
      }

      if (passwordDialogType === 'delete') {
        const authorizationPassword = list.protected
          ? trimmedCurrent || activePassword || undefined
          : undefined;
        if (list.protected && !authorizationPassword) {
          setPasswordDialogError('Enter the password to confirm deletion.');
          return;
        }
        setPasswordDialogSubmitting(true);
        setPasswordDialogError(null);
        try {
          const requestInit = list.protected
            ? withPassword({ method: 'DELETE' }, authorizationPassword)
            : ({ method: 'DELETE' } satisfies RequestInit);
          await api(`/api/lists/${list.id}`, requestInit);
          setError(null);
          pushNotification('success', 'Watchlist deleted.');
          closePasswordDialog();
          leaveList();
        } catch (err) {
          const message = parseError(err);
          setPasswordDialogError(message);
          setError(message);
        } finally {
          setPasswordDialogSubmitting(false);
        }
      }
    },
    [
      activePassword,
      closePasswordDialog,
      leaveList,
      list,
      passwordDialogConfirm,
      passwordDialogCurrent,
      passwordDialogNew,
      passwordDialogType,
      pushNotification,
      setError,
      setLastSynced,
      setList,
      setActivePassword,
      withPassword
    ]
  );

  const saveListName = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!list) return;
      const trimmed = nameDraft.trim();
      if (!trimmed) {
        const message = 'Give your watchlist a name first.';
        setError(message);
        pushNotification('error', message);
        return;
      }
      if (trimmed === list.name) {
        setRenaming(false);
        return;
      }
      if (!ensurePasswordForChanges()) {
        return;
      }
      setSavingName(true);
      setError(null);
      try {
        const data = await api<List>(`/api/lists/${list.id}`, withPassword({
          method: 'PATCH',
          body: JSON.stringify({ name: trimmed })
        }));
        setList(data);
        setListName(data.name);
        setRenaming(false);
        setLastSynced(Date.now());
        pushNotification('success', 'List name updated.');
      } catch (err) {
        const message = parseError(err);
        setError(message);
        pushNotification('error', message);
      } finally {
        setSavingName(false);
      }
    },
    [ensurePasswordForChanges, list, nameDraft, pushNotification, withPassword]
  );

  const chooseRandomPick = useCallback(() => {
    if (!list) return;
    const unwatched = list.items.filter((item) => !item.watched);
    if (unwatched.length === 0) {
      const message = 'Every movie here has already been watched!';
      setError(message);
      pushNotification('error', message);
      setShowRandomOverlay(false);
      setRandomPick(null);
      setCountdownRemaining(null);
      return;
    }
    const pick = unwatched[Math.floor(Math.random() * unwatched.length)];
    setRandomPick(pick);
    setShowRandomOverlay(true);
    setCountdownSession((value) => value + 1);
    setCountdownRemaining(RANDOM_COUNTDOWN_DURATION);
  }, [list, pushNotification]);

  const confirmRandomPick = useCallback(() => {
    if (!randomPick) return;
    const query = encodeURIComponent(`where to watch ${randomPick.title}`);
    if (typeof window !== 'undefined') {
      window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
    }
    setShowRandomOverlay(false);
    setRandomPick(null);
  }, [randomPick]);

  const lastUpdated = list ? formatRelative(list.updatedAt) : null;
  const lastSyncedAgo = formatRelative(lastSynced);

  const toggleUnwatchedOnly = useCallback(() => {
    setShowUnwatchedOnly((value) => !value);
  }, []);

  useEffect(() => {
    setSortOption('addedRecent');
    setShowUnwatchedOnly(false);
  }, [list?.id]);

  useEffect(() => {
    if (!showRandomOverlay) return undefined;
    randomCloseRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowRandomOverlay(false);
        setCountdownRemaining(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [showRandomOverlay]);

  useEffect(() => {
    if (!showRandomOverlay && countdownRemaining !== null) {
      setCountdownRemaining(null);
    }
  }, [countdownRemaining, showRandomOverlay]);

  useEffect(() => {
    if (countdownRemaining === null) {
      return undefined;
    }
    if (countdownRemaining <= 1) {
      const timer = window.setTimeout(() => {
        setCountdownRemaining(null);
      }, 1000);
      return () => {
        window.clearTimeout(timer);
      };
    }
    const timer = window.setTimeout(() => {
      setCountdownRemaining((value) => (value ? value - 1 : null));
    }, 1000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [countdownRemaining]);

  useEffect(() => {
    if (showRandomOverlay && countdownRemaining === null && randomPick) {
      setCelebrationKey((value) => value + 1);
    }
  }, [countdownRemaining, randomPick, showRandomOverlay]);

  useEffect(() => {
    if (!title.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      return;
    }

    const term = title.trim();
    if (term.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error('Unable to fetch suggestions.');
        }
        const data = await response.json();
        if (controller.signal.aborted) return;
        const results: SearchSuggestion[] = Array.isArray(data?.results)
          ? data.results
              .map((item: any) => ({
                id: Number(item.id ?? 0),
                title: String(item.title ?? ''),
                year: item.year ? String(item.year) : undefined,
                poster: item.poster ? String(item.poster) : undefined,
                releaseDate: item.releaseDate ? String(item.releaseDate) : undefined
              }))
              .filter((item: SearchSuggestion) => Boolean(item.title))
          : [];
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setHighlightedIndex(results.length > 0 ? 0 : -1);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);
        setSuggestions([]);
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [title]);

  return (
    <main className={styles.viewport}>
      <div className={styles.background} aria-hidden="true">
        <div className={styles.backgroundGradient} />
        <div className={styles.backgroundMesh} />
      </div>
      {notifications.length > 0 && (
        <div className={styles.notificationStack} role="status" aria-live="polite">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`${styles.notification} ${
                notification.type === 'success'
                  ? styles.notificationSuccess
                  : styles.notificationError
              }`}
            >
              <div className={styles.notificationIcon} aria-hidden="true">
                {notification.type === 'success' ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
              </div>
              <span className={styles.notificationMessage}>{notification.message}</span>
              <button
                type="button"
                className={styles.notificationDismiss}
                onClick={() => dismissNotification(notification.id)}
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      {passwordDialogType && list && (
        <div
          className={styles.dialogOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby={passwordDialogTitleId}
          aria-describedby={passwordDialogDescriptionId}
        >
          <div
            className={styles.dialogBackdrop}
            aria-hidden="true"
            onClick={closePasswordDialog}
          />
          <form
            ref={passwordDialogFormRef}
            className={`${styles.dialogContent} ${
              passwordDialogType === 'delete' ? styles.dialogContentDanger : ''
            }`}
            onSubmit={handlePasswordDialogSubmit}
          >
            <div className={styles.dialogHeader}>
              <span className={styles.dialogIcon} aria-hidden="true">
                {passwordDialogType === 'delete' ? (
                  <Trash2 size={24} />
                ) : passwordDialogType === 'change' ? (
                  <ShieldCheck size={24} />
                ) : passwordDialogType === 'remove' ? (
                  <ShieldX size={24} />
                ) : (
                  <ShieldPlus size={24} />
                )}
              </span>
              <div className={styles.dialogHeading}>
                <h2 id={passwordDialogTitleId} className={styles.dialogTitle}>
                  {passwordDialogType === 'delete'
                    ? 'Delete this watchlist'
                    : passwordDialogType === 'change'
                    ? 'Change password'
                    : passwordDialogType === 'remove'
                    ? 'Remove password'
                    : 'Protect this watchlist'}
                </h2>
                <p id={passwordDialogDescriptionId} className={styles.dialogDescription}>
                  {passwordDialogType === 'delete'
                    ? list.protected
                      ? 'Enter the password to confirm deletion. This cannot be undone.'
                      : 'This will permanently delete the entire watchlist. This cannot be undone.'
                    : passwordDialogType === 'change'
                    ? 'Update the password that protects this watchlist.'
                    : passwordDialogType === 'remove'
                    ? 'Remove the password protection from this watchlist.'
                    : 'Add a password so only people you share it with can join.'}
                </p>
              </div>
            </div>
            <div className={styles.dialogBody}>
              {passwordDialogType === 'change' && (
                <>
                  <label className={styles.dialogField} htmlFor={passwordDialogCurrentId}>
                    <span className={styles.dialogLabel}>Current password</span>
                    <input
                      id={passwordDialogCurrentId}
                      ref={passwordDialogInputRef}
                      className={styles.dialogInput}
                      type="password"
                      autoComplete="current-password"
                      value={passwordDialogCurrent}
                      onChange={(event) => {
                        setPasswordDialogCurrent(event.target.value);
                        setPasswordDialogError(null);
                      }}
                      placeholder="Enter current password"
                      required
                    />
                  </label>
                  <label className={styles.dialogField} htmlFor={passwordDialogPasswordId}>
                    <span className={styles.dialogLabel}>New password</span>
                    <input
                      id={passwordDialogPasswordId}
                      className={styles.dialogInput}
                      type="password"
                      autoComplete="new-password"
                      value={passwordDialogNew}
                      onChange={(event) => {
                        setPasswordDialogNew(event.target.value);
                        setPasswordDialogError(null);
                      }}
                      placeholder="Create a new password"
                      required
                    />
                  </label>
                  <label className={styles.dialogField} htmlFor={passwordDialogConfirmId}>
                    <span className={styles.dialogLabel}>Confirm password</span>
                    <input
                      id={passwordDialogConfirmId}
                      className={styles.dialogInput}
                      type="password"
                      autoComplete="new-password"
                      value={passwordDialogConfirm}
                      onChange={(event) => {
                        setPasswordDialogConfirm(event.target.value);
                        setPasswordDialogError(null);
                      }}
                      placeholder="Re-enter password"
                      required
                    />
                  </label>
                </>
              )}
              {passwordDialogType === 'set' && (
                <>
                  <label className={styles.dialogField} htmlFor={passwordDialogPasswordId}>
                    <span className={styles.dialogLabel}>Password</span>
                    <input
                      id={passwordDialogPasswordId}
                      ref={passwordDialogInputRef}
                      className={styles.dialogInput}
                      type="password"
                      autoComplete="new-password"
                      value={passwordDialogNew}
                      onChange={(event) => {
                        setPasswordDialogNew(event.target.value);
                        setPasswordDialogError(null);
                      }}
                      placeholder="Create a password"
                      required
                    />
                  </label>
                  <label className={styles.dialogField} htmlFor={passwordDialogConfirmId}>
                    <span className={styles.dialogLabel}>Confirm password</span>
                    <input
                      id={passwordDialogConfirmId}
                      className={styles.dialogInput}
                      type="password"
                      autoComplete="new-password"
                      value={passwordDialogConfirm}
                      onChange={(event) => {
                        setPasswordDialogConfirm(event.target.value);
                        setPasswordDialogError(null);
                      }}
                      placeholder="Re-enter password"
                      required
                    />
                  </label>
                </>
              )}
              {passwordDialogType === 'remove' && list.protected && (
                <label className={styles.dialogField} htmlFor={passwordDialogCurrentId}>
                  <span className={styles.dialogLabel}>Password</span>
                  <input
                    id={passwordDialogCurrentId}
                    ref={passwordDialogInputRef}
                    className={styles.dialogInput}
                    type="password"
                    autoComplete="current-password"
                    value={passwordDialogCurrent}
                    onChange={(event) => {
                      setPasswordDialogCurrent(event.target.value);
                      setPasswordDialogError(null);
                    }}
                    placeholder="Enter password to remove"
                    required
                  />
                </label>
              )}
              {passwordDialogType === 'delete' && list.protected && (
                <label className={styles.dialogField} htmlFor={passwordDialogCurrentId}>
                  <span className={styles.dialogLabel}>Password</span>
                  <input
                    id={passwordDialogCurrentId}
                    ref={passwordDialogInputRef}
                    className={styles.dialogInput}
                    type="password"
                    autoComplete="current-password"
                    value={passwordDialogCurrent}
                    onChange={(event) => {
                      setPasswordDialogCurrent(event.target.value);
                      setPasswordDialogError(null);
                    }}
                    placeholder="Enter password to delete"
                    required
                  />
                </label>
              )}
              {passwordDialogError && (
                <p className={styles.dialogError} role="alert">
                  {passwordDialogError}
                </p>
              )}
            </div>
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.dialogSecondary}
                onClick={closePasswordDialog}
                ref={passwordDialogCloseRef}
                disabled={passwordDialogSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${styles.dialogPrimary} ${
                  passwordDialogType === 'delete' ? styles.dialogPrimaryDanger : ''
                }`}
                disabled={
                  passwordDialogSubmitting ||
                  (passwordDialogType === 'delete'
                    ? list.protected && !trimmedCurrentPassword
                    : passwordDialogType === 'change'
                      ? !trimmedCurrentPassword ||
                        !trimmedNewPassword ||
                        trimmedConfirmPassword !== trimmedNewPassword
                      : passwordDialogType === 'remove'
                      ? !trimmedCurrentPassword
                      : !trimmedNewPassword || trimmedConfirmPassword !== trimmedNewPassword)
                }
              >
                {passwordDialogSubmitting ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span className={styles.dialogSubmitLabel}>Processing…</span>
                  </>
                ) : passwordDialogType === 'delete' ? (
                  'Delete watchlist'
                ) : passwordDialogType === 'change' ? (
                  'Change password'
                ) : passwordDialogType === 'remove' ? (
                  'Remove password'
                ) : (
                  'Add password'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      {list ? (
        <div className={styles.workspace}>
          {showRandomOverlay && randomPick && (
            <div
              className={styles.randomOverlay}
              role="dialog"
              aria-modal="true"
              aria-labelledby={randomTitleId}
              aria-describedby={randomDescriptionId}
            >
              <div className={styles.randomBackdrop} aria-hidden="true" />
              <div
                className={`${styles.randomContent} ${
                  countdownRemaining !== null ? styles.randomContentCountdown : ''
                }`}
              >
                <button
                  type="button"
                  className={styles.randomClose}
                  onClick={() => setShowRandomOverlay(false)}
                  aria-label="Dismiss random pick"
                  ref={randomCloseRef}
                >
                  <X size={20} />
                </button>
                {countdownRemaining === null && (
                  <div
                    key={celebrationKey}
                    className={styles.randomCelebration}
                    aria-hidden="true"
                  >
                    <span className={`${styles.firework} ${styles.fireworkOne}`} />
                    <span className={`${styles.firework} ${styles.fireworkTwo}`} />
                    <span className={`${styles.firework} ${styles.fireworkThree}`} />
                    <span className={`${styles.firework} ${styles.fireworkFour}`} />
                  </div>
                )}
                <div className={styles.randomHeading}>
                  <Sparkles size={28} aria-hidden="true" />
                  <span className={styles.randomBadge}>
                    {countdownRemaining !== null ? "Get ready" : "Tonight's challenge"}
                  </span>
                </div>
                <h2 id={randomTitleId} className={styles.randomTitle}>
                  {countdownRemaining !== null ? 'Your surprise is loading…' : randomPick.title}
                </h2>
                {countdownRemaining !== null ? (
                  <div className={styles.countdownWrapper}>
                    <div className={styles.countdownTimer}>
                      <svg
                        className={styles.countdownSvg}
                        viewBox="0 0 120 120"
                        role="presentation"
                        aria-hidden="true"
                      >
                        <defs>
                          <linearGradient id={countdownGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#78b0ff" />
                            <stop offset="50%" stopColor="#b95cff" />
                            <stop offset="100%" stopColor="#64f4c4" />
                          </linearGradient>
                        </defs>
                        <circle className={styles.countdownTrack} cx="60" cy="60" r="52" />
                        <circle
                          className={styles.countdownProgress}
                          cx="60"
                          cy="60"
                          r="52"
                          stroke={`url(#${countdownGradientId})`}
                          style={{ animationDuration: `${RANDOM_COUNTDOWN_DURATION}s` }}
                          key={countdownSession}
                        />
                      </svg>
                      <span className={styles.countdownNumber} key={countdownRemaining}>
                        {countdownRemaining}
                      </span>
                    </div>
                    <p className={styles.countdownCaption} id={randomDescriptionId}>
                      Picking a movie for you…
                    </p>
                  </div>
                ) : (
                  <>
                    {randomPick.poster ? (
                      <img
                        src={randomPick.poster}
                        alt=""
                        className={styles.randomPoster}
                        aria-hidden="true"
                      />
                    ) : (
                      <div className={styles.randomPosterPlaceholder} aria-hidden="true">
                        🎬
                      </div>
                    )}
                    <p id={randomDescriptionId} className={styles.randomCopy}>
                      Spin up some snacks, dim the lights, and press play. This one's waiting for you!
                    </p>
                    <div className={styles.randomActions}>
                      <button
                        type="button"
                        className={`${styles.randomButton} ${styles.randomConfirm}`}
                        onClick={confirmRandomPick}
                      >
                        <Binoculars size={18} /> Let's watch it
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <section className={styles.listHeader}>
            <div className={styles.listTitleRow}>
              <div className={styles.listTitleGroup}>
                <div className={styles.listTitleDisplay}>
                  {list.protected && (
                    <span
                      className={styles.protectedIndicator}
                      tabIndex={0}
                      aria-describedby={protectedTooltipId}
                      aria-label="Password protected list"
                    >
                      <Shield size={16} aria-hidden="true" />
                      <span className={styles.protectedTooltip} id={protectedTooltipId} role="tooltip">
                        Password protected
                      </span>
                    </span>
                  )}
                  {renaming ? (
                    <form className={styles.renameForm} onSubmit={saveListName}>
                      <label className={styles.visuallyHidden} htmlFor="list-rename">
                        List name
                      </label>
                      <input
                        id="list-rename"
                        className={styles.renameInput}
                        value={nameDraft}
                        onChange={(event) => setNameDraft(event.target.value)}
                        disabled={savingName}
                        autoFocus
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            setRenaming(false);
                            setNameDraft(list.name);
                          }
                        }}
                      />
                      <div className={styles.renameActions}>
                        <button
                          type="submit"
                          className={styles.renameSave}
                          disabled={savingName || !nameDraft.trim()}
                          aria-label="Save new list name"
                        >
                          {savingName ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                        </button>
                        <button
                          type="button"
                          className={styles.renameCancel}
                          onClick={() => {
                            setRenaming(false);
                            setNameDraft(list.name);
                          }}
                          disabled={savingName}
                          aria-label="Cancel renaming"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <h1 className={styles.listTitle}>{list.name}</h1>
                  )}
                </div>
              </div>
              <div className={styles.listActions}>
                <div className={styles.listMeta} aria-live="polite">
                  <span className={styles.listMetaItem}>
                    {lastUpdated ? (
                      <>
                        <Clock size={14} aria-hidden="true" />
                        <span className={styles.visuallyHidden}>Last updated</span>
                        {lastUpdated}
                      </>
                    ) : (
                      'No updates yet'
                    )}
                  </span>
                  {lastSyncedAgo && (
                    <span className={styles.listMetaItem}>
                      <RefreshCw size={14} aria-hidden="true" />
                      <span className={styles.visuallyHidden}>Last synced</span>
                      {lastSyncedAgo}
                    </span>
                  )}
                </div>
                <div className={styles.listMenu} ref={listMenuRef}>
                  <button
                    type="button"
                    id={listMenuButtonId}
                    className={styles.listMenuTrigger}
                    onClick={() => setListMenuOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={listMenuOpen}
                    aria-controls={listMenuOpen ? listMenuDropdownId : undefined}
                    aria-label="List actions"
                  >
                    <Menu size={20} />
                  </button>
                  {listMenuOpen && (
                    <div
                      className={styles.listMenuDropdown}
                      id={listMenuDropdownId}
                      role="menu"
                      aria-labelledby={listMenuButtonId}
                    >
                      <div className={styles.listMenuSection} role="none">
                        <button
                          type="button"
                          className={styles.listMenuItem}
                          role="menuitem"
                          onClick={() => {
                            setListMenuOpen(false);
                            void copyLink();
                          }}
                        >
                          <Link size={16} /> Copy link
                        </button>
                        <button
                          type="button"
                          className={styles.listMenuItem}
                          role="menuitem"
                          onClick={() => {
                            setListMenuOpen(false);
                            void copyId();
                          }}
                        >
                          <Copy size={16} /> Copy ID
                        </button>
                        <button
                          type="button"
                          className={styles.listMenuItem}
                          role="menuitem"
                          onClick={() => {
                            setListMenuOpen(false);
                            void refreshList(undefined, true);
                          }}
                          disabled={refreshing}
                        >
                          {refreshing ? (
                            <Loader2 size={16} className="spin" />
                          ) : (
                            <RefreshCw size={16} />
                          )}{' '}
                          Refresh list
                        </button>
                        <button
                          type="button"
                          className={styles.listMenuItem}
                          role="menuitem"
                          onClick={() => {
                            setListMenuOpen(false);
                            setRenaming(true);
                            setNameDraft(list.name);
                          }}
                        >
                          <Pencil size={16} /> Rename list
                        </button>
                      </div>
                      <div className={styles.listMenuSeparator} role="none" />
                      <div className={styles.listMenuSection} role="none">
                        {list.protected ? (
                          <>
                            <button
                              type="button"
                              className={styles.listMenuItem}
                              role="menuitem"
                              onClick={() => {
                                setListMenuOpen(false);
                                void copyPassword();
                              }}
                            >
                              <KeyRound size={16} /> Copy password
                            </button>
                            <button
                              type="button"
                              className={styles.listMenuItem}
                              role="menuitem"
                              onClick={() => {
                                setListMenuOpen(false);
                                openPasswordDialog('change');
                              }}
                            >
                              <ShieldCheck size={16} /> Change password
                            </button>
                            <button
                              type="button"
                              className={styles.listMenuItem}
                              role="menuitem"
                              onClick={() => {
                                setListMenuOpen(false);
                                openPasswordDialog('remove');
                              }}
                            >
                              <ShieldX size={16} /> Remove password
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className={styles.listMenuItem}
                            role="menuitem"
                            onClick={() => {
                              setListMenuOpen(false);
                              openPasswordDialog('set');
                            }}
                          >
                            <ShieldPlus size={16} /> Set password
                          </button>
                        )}
                      </div>
                      <div className={styles.listMenuSeparator} role="none" />
                      <div className={styles.listMenuSection} role="none">
                        <button
                          type="button"
                          className={styles.listMenuItem}
                          role="menuitem"
                          onClick={() => {
                            setListMenuOpen(false);
                            leaveList();
                          }}
                        >
                          <ArrowRight size={16} /> To start page
                        </button>
                        <button
                          type="button"
                          className={`${styles.listMenuItem} ${styles.listMenuItemDanger}`}
                          role="menuitem"
                          onClick={() => {
                            setListMenuOpen(false);
                            openPasswordDialog('delete');
                          }}
                        >
                          <Trash2 size={16} /> Delete list
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className={styles.primaryColumn}>
            <section className={styles.formCard}>
              <form className={`${styles.form} ${styles.formInline}`} onSubmit={addItem}>
                <div className={styles.autocomplete}>
                  <label className={styles.visuallyHidden} htmlFor="title">
                    Title
                  </label>
                  <input
                    id="title"
                    ref={titleInputRef}
                    className={`${styles.inputField} ${styles.inputCompact} ${styles.titleField}`}
                    placeholder="e.g. Dune: Part Two"
                    value={title}
                    onChange={handleTitleChange}
                    onKeyDown={handleTitleKeyDown}
                    onFocus={() => {
                      if (blurTimeoutRef.current) {
                        window.clearTimeout(blurTimeoutRef.current);
                        blurTimeoutRef.current = null;
                      }
                      if (suggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      blurTimeoutRef.current = window.setTimeout(() => {
                        setShowSuggestions(false);
                      }, 120);
                    }}
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={showSuggestions && suggestions.length > 0}
                    aria-controls="title-suggestions"
                    disabled={adding}
                    required
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <ul
                      id="title-suggestions"
                      className={styles.autocompleteList}
                      role="listbox"
                      aria-label="Suggested titles"
                    >
                      {suggestions.map((suggestion, index) => {
                        const key = `${suggestion.id}-${suggestion.year ?? 'unknown'}-${index}`;
                        return (
                          <li
                            key={key}
                            role="option"
                            aria-selected={index === highlightedIndex}
                            className={`${styles.autocompleteItem} ${
                              index === highlightedIndex ? styles.autocompleteItemActive : ''
                            }`}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleSelectSuggestion(suggestion);
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                          >
                            {suggestion.poster ? (
                              <img
                                src={suggestion.poster}
                                alt=""
                                className={styles.autocompletePoster}
                                aria-hidden="true"
                              />
                            ) : (
                              <div className={styles.autocompletePosterPlaceholder} aria-hidden="true">
                                🎬
                              </div>
                            )}
                            <div className={styles.autocompleteCopy}>
                              <span className={styles.autocompleteTitle}>{suggestion.title}</span>
                              {suggestion.year && (
                                <span className={styles.autocompleteMeta}>{suggestion.year}</span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <label className={styles.visuallyHidden} htmlFor="added-by">
                  Added by (optional)
                </label>
                <input
                  id="added-by"
                  className={`${styles.inputField} ${styles.inputCompact} ${styles.nameField}`}
                  placeholder="Name (optional)"
                  value={addedBy}
                  onChange={(event) => setAddedBy(event.target.value)}
                  disabled={adding}
                />
                <button
                  className={styles.buttonPrimary}
                  type="submit"
                  disabled={adding || detailsLoading}
                  data-loading={adding || detailsLoading ? 'true' : undefined}
                  aria-busy={adding || detailsLoading}
                >
                  {adding || detailsLoading ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                  {adding ? 'Adding…' : detailsLoading ? 'Fetching details…' : 'Add'}
                </button>
              </form>
            </section>

            {displayItems.length > 0 ? (
              viewMode === 'grid' ? (
                <section
                  ref={itemsParent}
                  className={`${styles.posterGrid} ${
                    gridColumns === 4 ? styles.posterGridColumns4 : styles.posterGridColumns5
                  }`}
                >
                  {displayItems.map((item) => {
                    const yearMatch = item.title.match(/\((\d{4})\)$/);
                    const displayTitle = yearMatch
                      ? item.title.replace(/\s*\(\d{4}\)$/, '').trim()
                      : item.title;
                    const displayYear = yearMatch ? yearMatch[1] : null;
                    const releaseYear = item.releaseDate
                      ? item.releaseDate.slice(0, 4)
                      : displayYear;
                    const addedByLabel = item.addedBy?.trim();
                    const showAddedBy = gridColumns === 4 && !!addedByLabel;
                    const initials = item.title
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join('');
                    return (
                      <article
                        key={item.id}
                        className={`${styles.posterCard} ${item.watched ? styles.posterWatched : ''}`}
                      >
                        <div className={styles.posterFrame}>
                          {item.poster ? (
                            <img
                              src={item.poster}
                              alt={`${displayTitle} poster`}
                              className={styles.posterImage}
                            />
                          ) : (
                            <div className={styles.posterFallback} aria-hidden="true">
                              <span>{initials || '🎬'}</span>
                            </div>
                          )}
                          <div className={styles.posterOverlay}>
                            <div className={styles.posterDetails}>
                              <h3 className={styles.posterTitle}>{displayTitle}</h3>
                              <div className={styles.posterMeta}>
                                {releaseYear && <span>{releaseYear}</span>}
                                {showAddedBy && <span>Added by {addedByLabel}</span>}
                              </div>
                            </div>
                            <div className={styles.posterActions}>
                              <button
                                type="button"
                                className={`${styles.posterIconButton} ${
                                  item.watched ? styles.posterIconButtonActive : ''
                                }`}
                                onClick={() => toggleWatched(item)}
                                aria-label={
                                  item.watched
                                    ? `Mark ${displayTitle} as not watched`
                                    : `Mark ${displayTitle} as watched`
                                }
                              >
                                {item.watched ? <Check size={20} /> : <CheckCircle2 size={20} />}
                              </button>
                              <button
                                type="button"
                                className={styles.posterIconButton}
                                onClick={() => removeItem(item)}
                                aria-label={`Remove ${displayTitle} from list`}
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </section>
              ) : (
                <section ref={itemsParent} className={styles.listView}>
                  {displayItems.map((item) => {
                    const yearMatch = item.title.match(/\((\d{4})\)$/);
                    const displayTitle = yearMatch
                      ? item.title.replace(/\s*\(\d{4}\)$/, '').trim()
                      : item.title;
                    const displayYear = yearMatch ? yearMatch[1] : null;
                    const releaseYear = item.releaseDate
                      ? item.releaseDate.slice(0, 4)
                      : displayYear;
                    const runtimeLabel =
                      typeof item.runtimeMinutes === 'number' && item.runtimeMinutes > 0
                        ? formatRuntime(item.runtimeMinutes)
                        : null;
                    const addedByLabel = item.addedBy?.trim();
                    const initials = item.title
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join('');
                    return (
                      <article
                        key={item.id}
                        className={`${styles.listRow} ${item.watched ? styles.listRowWatched : ''}`}
                      >
                        <div className={styles.listRowPoster}>
                          {item.poster ? (
                            <img
                              src={item.poster}
                              alt={`${displayTitle} poster`}
                              className={styles.listRowPosterImage}
                            />
                          ) : (
                            <div className={styles.listRowPosterFallback} aria-hidden="true">
                              <span>{initials || '🎬'}</span>
                            </div>
                          )}
                        </div>
                        <div className={styles.listRowBody}>
                          <div className={styles.listRowHeader}>
                            <h3 className={styles.listRowTitle}>{displayTitle}</h3>
                            {releaseYear && <span className={styles.listRowYear}>{releaseYear}</span>}
                          </div>
                          <div className={styles.listRowMeta}>
                            {runtimeLabel && <span>{runtimeLabel}</span>}
                            {addedByLabel && <span>Added by {addedByLabel}</span>}
                          </div>
                        </div>
                        <div className={styles.listRowActions}>
                          <button
                            type="button"
                            className={`${styles.posterIconButton} ${
                              item.watched ? styles.posterIconButtonActive : ''
                            }`}
                            onClick={() => toggleWatched(item)}
                            aria-label={
                              item.watched
                                ? `Mark ${displayTitle} as not watched`
                                : `Mark ${displayTitle} as watched`
                            }
                          >
                            {item.watched ? <Check size={20} /> : <CheckCircle2 size={20} />}
                          </button>
                          <button
                            type="button"
                            className={styles.posterIconButton}
                            onClick={() => removeItem(item)}
                            aria-label={`Remove ${displayTitle} from list`}
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </section>
              )
            ) : (
              <div className={styles.emptyState}>
                <CheckCircle2 size={40} />
                <p>Your watchlist is feeling fresh. Add something to get started!</p>
                <div className={styles.quickLinks}>
                  <button type="button" onClick={() => setTitle('Inside Out 2')}>
                    Suggest “Inside Out 2”
                  </button>
                  <button type="button" onClick={() => setTitle('Furiosa: A Mad Max Saga')}>
                    Suggest “Furiosa: A Mad Max Saga”
                  </button>
                </div>
              </div>
            )}

          </div>

          <aside className={styles.statsColumn} aria-label="Watchlist controls and statistics">
            <div className={styles.sortControls} aria-label="Organize watchlist">
              {sortMenuState !== 'closed' ? (
                <button
                  type="button"
                  className={styles.sortMenuScrim}
                  data-state={sortMenuState}
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={closeSortMenu}
                />
              ) : null}
              <div
                className={`${styles.organizeGroup} ${
                  sortMenuState !== 'closed' ? styles.sortMenuActive : ''
                }`}
                role="group"
                aria-label="Sort watchlist"
                ref={sortMenuRef}
              >
                <label className={styles.groupLabel} htmlFor={sortMenuButtonId}>
                  Sort
                </label>
                <button
                  id={sortMenuButtonId}
                  type="button"
                  className={styles.sortTrigger}
                  aria-haspopup="listbox"
                  aria-expanded={sortMenuState === 'open'}
                  aria-controls={sortMenuState !== 'closed' ? sortMenuListId : undefined}
                  onClick={() =>
                    sortMenuState === 'open' ? closeSortMenu() : openSortMenu()
                  }
                >
                  <span className={styles.sortTriggerIcon} aria-hidden="true">
                    <ArrowUpDown size={16} />
                  </span>
                  <span className={styles.sortTriggerValue}>{currentSortLabel}</span>
                  <span className={styles.sortTriggerChevron} aria-hidden="true">
                    <ChevronDown size={16} />
                  </span>
                </button>
                {sortMenuState !== 'closed' ? (
                  <div
                    className={styles.sortMenu}
                    role="listbox"
                    id={sortMenuListId}
                    data-state={sortMenuState}
                  >
                    {SORT_OPTIONS.map((option) => {
                      const selected = option.value === sortOption;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`${styles.sortMenuOption} ${
                            selected ? styles.sortMenuOptionActive : ''
                          }`}
                          onClick={() => {
                            setSortOption(option.value);
                            closeSortMenu();
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div
                className={`${styles.organizeGroup} ${styles.filterGroup}`}
                role="group"
                aria-label="Adjust visibility"
              >
                <span className={styles.groupLabel}>Visibility</span>
                <label
                  className={`${styles.toggle} ${
                    showUnwatchedOnly ? styles.toggleActive : ''
                  }`}
                  htmlFor={filterToggleId}
                >
                  <input
                    id={filterToggleId}
                    type="checkbox"
                    className={styles.toggleInput}
                    checked={showUnwatchedOnly}
                    onChange={toggleUnwatchedOnly}
                  />
                  <span className={styles.toggleTrack} aria-hidden="true">
                    <span className={styles.toggleThumb} />
                  </span>
                  <span className={styles.toggleLabel}>Show unwatched only</span>
                </label>
                <div className={styles.layoutSection}>
                  <span className={styles.layoutSectionLabel}>Layout</span>
                  <div
                    className={styles.layoutSwitch}
                    role="radiogroup"
                    aria-label="Choose layout"
                  >
                    <button
                      type="button"
                      role="radio"
                      className={`${styles.layoutOption} ${
                        layoutSelection === 'grid-5' ? styles.layoutOptionActive : ''
                      }`}
                      aria-checked={layoutSelection === 'grid-5'}
                      tabIndex={layoutSelection === 'grid-5' ? 0 : -1}
                      onClick={() => selectLayout('grid-5')}
                      aria-label="Grid layout, five titles per row"
                      onKeyDown={(event) => handleLayoutKeyDown(event, 'grid-5')}
                    >
                      <LayoutGrid size={16} aria-hidden="true" />
                      <span className={styles.layoutBadge}>5</span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      className={`${styles.layoutOption} ${
                        layoutSelection === 'grid-4' ? styles.layoutOptionActive : ''
                      }`}
                      aria-checked={layoutSelection === 'grid-4'}
                      tabIndex={layoutSelection === 'grid-4' ? 0 : -1}
                      onClick={() => selectLayout('grid-4')}
                      aria-label="Grid layout, four titles per row"
                      onKeyDown={(event) => handleLayoutKeyDown(event, 'grid-4')}
                    >
                      <LayoutGrid size={16} aria-hidden="true" />
                      <span className={styles.layoutBadge}>4</span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      className={`${styles.layoutOption} ${styles.layoutOptionSolo} ${
                        layoutSelection === 'list' ? styles.layoutOptionActive : ''
                      }`}
                      aria-checked={layoutSelection === 'list'}
                      tabIndex={layoutSelection === 'list' ? 0 : -1}
                      onClick={() => selectLayout('list')}
                      aria-label="List layout with details"
                      onKeyDown={(event) => handleLayoutKeyDown(event, 'list')}
                    >
                      <ListIcon size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.statsPanel} aria-label="Watchlist statistics">
              <ul className={styles.statsList}>
                <li className={styles.statsRow}>
                  <div className={styles.statsMetric}>
                    <span className={styles.metricLabel}>Watched</span>
                    <span className={styles.metricValue}>
                      {stats.watched} / {stats.total}
                    </span>
                  </div>
                  <div className={styles.metricBar}>
                    <div
                      className={styles.metricFill}
                      style={{ width: `${stats.total ? stats.watchedPercent : 0}%` }}
                    />
                  </div>
                </li>
                <li className={styles.statsRow}>
                  <div className={styles.statsMetric}>
                    <span className={styles.metricLabel}>On deck</span>
                    <span className={styles.metricValue}>{stats.pending}</span>
                  </div>
                  <div className={styles.metricBar}>
                    <div
                      className={styles.metricFillPending}
                      style={{ width: `${stats.total ? stats.pendingPercent : 0}%` }}
                    />
                  </div>
                </li>
              </ul>
              {stats.totalRuntime > 0 ? (
                <div className={styles.runtimeSection}>
                  <div className={styles.runtimeHeader}>
                    <span className={styles.metricLabel}>Runtime</span>
                    <span className={styles.runtimePercent}>
                      <span className={styles.runtimePercentValue} aria-hidden="true">
                        {stats.watchedRuntimePercent}%
                      </span>
                      <span className={styles.visuallyHidden}>
                        {`Watched ${stats.watchedRuntimePercent}% of total runtime`}
                      </span>
                    </span>
                  </div>
                  <div
                    className={styles.runtimeBar}
                    role="img"
                    aria-label={`Watched ${stats.watchedRuntimePercent}% of total runtime`}
                  >
                    <div
                      className={styles.runtimeBarFill}
                      style={{ width: `${stats.watchedRuntimeShare}%` }}
                    />
                  </div>
                  <div className={styles.runtimeSummary}>
                    <span>Watched {formatRuntime(stats.watchedRuntime)}</span>
                    <span>Total {formatRuntime(stats.totalRuntime)}</span>
                  </div>
                </div>
              ) : (
                <div className={styles.runtimeEmpty}>
                  Runtime insights will appear when titles include runtime data.
                </div>
              )}
            </div>

            <button type="button" className={styles.randomButton} onClick={chooseRandomPick}>
              <Sparkles size={18} /> Surprise me
            </button>
          </aside>
        </div>
      ) : initialListLoading ? (
        <div className={styles.loadingState} role="status" aria-live="polite">
          <div className={styles.loadingBackdrop} aria-hidden="true" />
          <div className={styles.loadingContent}>
            <Loader2 size={40} className={styles.loadingSpinner} aria-hidden="true" />
            <p className={styles.loadingMessage}>Loading your watchlist…</p>
          </div>
        </div>
      ) : (
        <div className={styles.content}>
          <section className={styles.hero}>
            <div className={styles.heroLayout}>
              <div className={styles.heroCopy}>
                <h1 className={styles.heroTitle}>Create or open a watchlist fast</h1>
                <p className={styles.heroSubtitle}>
                  Start a new list in seconds or jump back into an existing one with your list ID.
                  Everything syncs automatically.
                </p>
              </div>
              <div className={styles.heroPanel}>
                <div
                  className={styles.heroPanelTabs}
                  role="tablist"
                  aria-label="Choose a flow"
                  data-mode={entryMode}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={entryMode === 'create'}
                    className={`${styles.heroPanelTab} ${
                      entryMode === 'create' ? styles.heroPanelTabActive : ''
                    }`}
                    onClick={() => setEntryMode('create')}
                  >
                    Create a list
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={entryMode === 'join'}
                    className={`${styles.heroPanelTab} ${
                      entryMode === 'join' ? styles.heroPanelTabActive : ''
                    }`}
                    onClick={() => setEntryMode('join')}
                  >
                    Open a list
                  </button>
                </div>
                <div className={styles.heroPanelBody} role="tabpanel">
                  {entryMode === 'create' ? (
                    <div className={styles.form}>
                      <p className={styles.panelSubtitle}>
                        Give it a name, protect it if you want, and start adding movies immediately.
                      </p>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel} htmlFor="list-name">
                          List name
                        </label>
                        <input
                          id="list-name"
                          className={styles.inputField}
                          placeholder="e.g. Friday Movie Club"
                          value={listName}
                          onChange={(event) => setListName(event.target.value)}
                          disabled={creating}
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel} htmlFor="list-password">
                          Password (optional)
                        </label>
                        <input
                          id="list-password"
                          className={styles.inputField}
                          type="password"
                          placeholder="Leave blank to keep it open"
                          value={createPassword}
                          onChange={(event) => setCreatePassword(event.target.value)}
                          disabled={creating}
                        />
                        <p className={styles.inputHint}>
                          Share this password with collaborators to limit access.
                        </p>
                      </div>
                      <div className={styles.buttonRow}>
                        <button
                          className={styles.buttonPrimary}
                          type="button"
                          onClick={createList}
                          disabled={creating}
                          data-loading={creating ? 'true' : undefined}
                          aria-busy={creating}
                        >
                          {creating ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
                          {creating ? 'Creating…' : 'Create list'}
                        </button>
                        <button
                          className={styles.buttonGhost}
                          type="button"
                          onClick={quickStart}
                          disabled={creating}
                        >
                          Quick start
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.form}>
                      <p className={styles.panelSubtitle}>
                        Paste the list ID to reconnect with your crew and pick up where you left off.
                      </p>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel} htmlFor="list-id">
                          List ID
                        </label>
                        <input
                          id="list-id"
                          className={styles.inputField}
                          placeholder="Paste the list ID"
                          value={listIdInput}
                          onChange={(event) => setListIdInput(event.target.value)}
                          disabled={joining}
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel} htmlFor="list-password-open">
                          Password
                        </label>
                        <input
                          id="list-password-open"
                          className={styles.inputField}
                          type="password"
                          placeholder="Only if the list is protected"
                          value={joinPassword}
                          onChange={(event) => setJoinPassword(event.target.value)}
                          disabled={joining}
                        />
                        <p className={styles.inputHint}>Leave blank for public watchlists.</p>
                      </div>
                      <div className={styles.buttonRow}>
                        <button
                          className={styles.buttonPrimary}
                          type="button"
                          onClick={() => joinList(listIdInput, joinPassword)}
                          disabled={joining}
                          data-loading={joining ? 'true' : undefined}
                          aria-busy={joining}
                        >
                          {joining ? <Loader2 size={18} className="spin" /> : <ArrowRight size={18} />}
                          {joining ? 'Opening…' : 'Open list'}
                        </button>
                        {lastListId && (
                          <button
                            className={styles.buttonGhost}
                            type="button"
                            onClick={() => joinList(lastListId, joinPassword)}
                            disabled={joining}
                          >
                            Continue last list
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div className={`${styles.status} ${styles.statusError}`}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

        </div>
      )}
    </main>
  );
}
