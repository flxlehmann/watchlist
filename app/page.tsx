'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
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
};

type SearchSuggestion = {
  id: number;
  title: string;
  year?: string;
  poster?: string;
  releaseDate?: string;
};

type SortOption = 'added' | 'released' | 'title';

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
  const [lastListId, setLastListId] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null);
  const [selectedRuntime, setSelectedRuntime] = useState<number | null>(null);
  const [selectedReleaseDate, setSelectedReleaseDate] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('added');
  const blurTimeoutRef = useRef<number | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const detailsRequestRef = useRef(0);
  const notificationIdRef = useRef(0);
  const notificationTimeoutsRef = useRef<Map<number, number>>(new Map());

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
      void joinList(queryId);
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

  const sortedItems = useMemo(() => {
    if (!list) return [] as Item[];
    const items = [...list.items];
    switch (sortOption) {
      case 'released': {
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
      case 'title': {
        return items.sort((a, b) => {
          const aTitle = getComparableTitle(a);
          const bTitle = getComparableTitle(b);
          if (aTitle === bTitle) {
            return a.title.localeCompare(b.title);
          }
          return aTitle.localeCompare(bTitle);
        });
      }
      default:
        return items.sort((a, b) => b.createdAt - a.createdAt);
    }
  }, [list, sortOption]);

  const joinList = useCallback(
    async (id: string) => {
      const cleanId = id.trim();
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
        const data = await api<List>(`/api/lists/${cleanId}`);
        setList(data);
        setListName(data.name);
        setLastSynced(Date.now());
        setLastListId(data.id);
        setListIdInput('');
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
      } finally {
        setJoining(false);
      }
    },
    [list, pushNotification]
  );

  const createList = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const data = await api<List>(`/api/lists`, {
        method: 'POST',
        body: JSON.stringify({ name: listName.trim() || 'Watchlist' })
      });
      setList(data);
      setListName(data.name);
      setLastSynced(Date.now());
      setLastListId(data.id);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('listId', data.id);
        const url = new URL(window.location.href);
        url.searchParams.set('list', data.id);
        window.history.replaceState({}, '', url.toString());
      }
    } catch (err) {
      const message = parseError(err);
      setError(message);
      pushNotification('error', message);
    } finally {
      setCreating(false);
    }
  }, [listName, pushNotification]);

  const quickStart = useCallback(async () => {
    if (list) return;
    if (!listName.trim()) setListName('Watchlist');
    await createList();
  }, [createList, list, listName]);

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
      setAdding(true);
      setError(null);
      try {
        const data = await api<List>(`/api/lists/${list.id}`, {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            addedBy: addedBy.trim() || undefined,
            poster: selectedPoster ?? undefined,
            runtimeMinutes: selectedRuntime ?? undefined,
            releaseDate: selectedReleaseDate ?? undefined
          })
        });
        setList(data);
        setTitle('');
        setAddedBy('');
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
    [addedBy, list, pushNotification, selectedPoster, selectedReleaseDate, selectedRuntime, title]
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

  const toggleWatched = useCallback(
    async (item: Item) => {
      if (!list) return;
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
        const data = await api<List>(`/api/lists/${list.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ itemId: item.id, watched: !item.watched })
        });
        setList(data);
        setLastSynced(Date.now());
      } catch (err) {
        const message = parseError(err);
        setError(message);
        pushNotification('error', message);
        await refreshList(list.id, false);
      }
    },
    [list, pushNotification, refreshList]
  );

  const removeItem = useCallback(
    async (item: Item) => {
      if (!list) return;
      try {
        const data = await api<List>(`/api/lists/${list.id}`, {
          method: 'DELETE',
          body: JSON.stringify({ itemId: item.id })
        });
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
    [list, pushNotification, refreshList]
  );

  const refreshList = useCallback(
    async (id?: string, showStatus = true) => {
      const target = id ?? list?.id;
      if (!target) return;
      setRefreshing(true);
      try {
        const data = await api<List>(`/api/lists/${target}`);
        setList(data);
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
    [list?.id, pushNotification]
  );

  const leaveList = useCallback(() => {
    const previousId = list?.id ?? null;
    setList(null);
    setTitle('');
    setAddedBy('');
    setError(null);
    setLastSynced(null);
    setListIdInput(previousId ?? '');
    setLastListId(previousId);
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

  const lastUpdated = list ? formatRelative(list.updatedAt) : null;
  const lastSyncedAgo = formatRelative(lastSynced);

  useEffect(() => {
    setSortOption('added');
  }, [list?.id]);

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
                  <Trash2 size={18} />
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
      {list ? (
        <div className={styles.workspace}>
          <section className={styles.listHeader}>
            <div className={styles.listTitleRow}>
              <h1 className={styles.listTitle}>{list.name}</h1>
              <div className={styles.listActions}>
                <button className={styles.buttonSurface} onClick={copyId}>
                  <Copy size={18} /> Copy ID
                </button>
                <button
                  className={styles.buttonSurface}
                  onClick={() => refreshList(undefined, true)}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
                <button className={styles.buttonGhost} onClick={leaveList}>
                  <LogOut size={18} /> Leave list
                </button>
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
                <button className={styles.buttonPrimary} type="submit" disabled={adding || detailsLoading}>
                  {adding || detailsLoading ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                  {adding ? 'Adding…' : detailsLoading ? 'Fetching details…' : 'Add'}
                </button>
              </form>
            </section>

            {sortedItems.length > 0 ? (
              <section className={styles.posterGrid}>
                {sortedItems.map((item) => {
                  const yearMatch = item.title.match(/\((\d{4})\)$/);
                  const displayTitle = yearMatch
                    ? item.title.replace(/\s*\(\d{4}\)$/, '').trim()
                    : item.title;
                  const displayYear = yearMatch ? yearMatch[1] : null;
                  const releaseYear = item.releaseDate
                    ? item.releaseDate.slice(0, 4)
                    : displayYear;
                  const addedByLabel = item.addedBy?.trim() || 'Unknown';
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
                              <span>Added by {addedByLabel}</span>
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
              <div className={styles.emptyState}>
                <CheckCircle2 size={40} />
                <p>Your watchlist is feeling fresh. Add something to get started!</p>
                <div className={styles.quickLinks}>
                  <button type="button" onClick={() => setTitle('Dune: Part Two')}>
                    Suggest “Dune: Part Two”
                  </button>
                  <button type="button" onClick={() => setTitle('The Bear S03E01')}>
                    Suggest “The Bear S03E01”
                  </button>
                </div>
              </div>
            )}

          </div>

          <aside className={styles.statsColumn} aria-label="Watchlist controls and statistics">
            <div className={styles.sortControls} role="radiogroup" aria-label="Sort watchlist">
              <span className={styles.sortLabel}>Sort titles</span>
              <div className={styles.sortButtons}>
                <button
                  type="button"
                  className={`${styles.sortButton} ${
                    sortOption === 'added' ? styles.sortButtonActive : ''
                  }`}
                  onClick={() => setSortOption('added')}
                  aria-pressed={sortOption === 'added'}
                >
                  Time added
                </button>
                <button
                  type="button"
                  className={`${styles.sortButton} ${
                    sortOption === 'released' ? styles.sortButtonActive : ''
                  }`}
                  onClick={() => setSortOption('released')}
                  aria-pressed={sortOption === 'released'}
                >
                  Release date
                </button>
                <button
                  type="button"
                  className={`${styles.sortButton} ${
                    sortOption === 'title' ? styles.sortButtonActive : ''
                  }`}
                  onClick={() => setSortOption('title')}
                  aria-pressed={sortOption === 'title'}
                >
                  Alphabetical
                </button>
              </div>
            </div>

            <div className={styles.statsPanel} aria-label="Watchlist statistics">
              <header className={styles.statsHeader}>
                <h2>List stats</h2>
                <span className={styles.statsTotal}>
                  {stats.total} title{stats.total === 1 ? '' : 's'}
                </span>
              </header>
              <ul className={styles.statsList}>
                <li className={styles.statsRow}>
                  <div className={styles.statsMetric}>
                    <span className={styles.metricLabel}>Watched</span>
                    <span className={styles.metricValue}>{stats.watched}</span>
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
                    <span className={styles.runtimePercent}>{stats.watchedRuntimePercent}% watched</span>
                  </div>
                  <div className={styles.runtimeSummary}>
                    <span>Watched {formatRuntime(stats.watchedRuntime)}</span>
                    <span>Total {formatRuntime(stats.totalRuntime)}</span>
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
                </div>
              ) : (
                <div className={styles.runtimeEmpty}>
                  Runtime insights will appear when titles include runtime data.
                </div>
              )}
              <div className={styles.statsFootnote}>
                {lastUpdated ? (
                  <span className={styles.statsFootnoteItem}>
                    <Clock size={14} aria-hidden="true" />
                    <span className={styles.visuallyHidden}>Last updated</span>
                    {lastUpdated}
                  </span>
                ) : (
                  <span className={styles.statsFootnoteItem}>No updates yet</span>
                )}
                {lastSyncedAgo && (
                  <span className={styles.statsFootnoteItem}>
                    <RefreshCw size={14} aria-hidden="true" />
                    <span className={styles.visuallyHidden}>Last synced</span>
                    {lastSyncedAgo}
                  </span>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className={styles.content}>
          <section className={styles.hero}>
            <span className={styles.heroBadge}>
              <Sparkles size={16} /> Shared watchlists
            </span>
            <h1 className={styles.heroTitle}>Plan movie nights with zero friction</h1>
            <p className={styles.heroSubtitle}>
              Spin up a watchlist in seconds, invite friends with a single link, and
              keep track of everything you want to stream next.
            </p>
          </section>

          {error && (
            <div className={`${styles.status} ${styles.statusError}`}>
              <Trash2 size={18} /> {error}
            </div>
          )}

          <section className={styles.panels}>
            <article className={styles.panel}>
              <div className={styles.form}>
                <h2 className={styles.panelTitle}>Create a new list</h2>
                <p className={styles.panelSubtitle}>
                  Give it a name, hit create, and start dropping in titles straight away.
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
                <div className={styles.buttonRow}>
                  <button
                    className={styles.buttonPrimary}
                    type="button"
                    onClick={createList}
                    disabled={creating}
                  >
                    {creating ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
                    {creating ? 'Creating…' : 'Create watchlist'}
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
            </article>

            <article className={styles.panel}>
              <div className={styles.form}>
                <h2 className={styles.panelTitle}>Open an existing list</h2>
                <p className={styles.panelSubtitle}>
                  Drop in a list ID to jump back into a shared queue, or continue where
                  you left off.
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
                <div className={styles.buttonRow}>
                  <button
                    className={styles.buttonSurface}
                    type="button"
                    onClick={() => joinList(listIdInput)}
                    disabled={joining}
                  >
                    {joining ? <Loader2 size={18} className="spin" /> : <ArrowRight size={18} />}
                    {joining ? 'Opening…' : 'Open list'}
                  </button>
                  {lastListId && (
                    <button
                      className={styles.buttonGhost}
                      type="button"
                      onClick={() => joinList(lastListId)}
                      disabled={joining}
                    >
                      Continue last list
                    </button>
                  )}
                </div>
              </div>
            </article>
          </section>
        </div>
      )}
    </main>
  );
}
