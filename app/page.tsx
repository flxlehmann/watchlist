'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
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

type SingleList = {
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

type SortOption = 'addedRecent' | 'addedOldest' | 'releaseAsc' | 'releaseDesc' | 'titleAsc' | 'titleDesc';

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'addedRecent', label: 'Latest added' },
  { value: 'addedOldest', label: 'Earliest added' },
  { value: 'releaseAsc', label: 'Oldest release' },
  { value: 'releaseDesc', label: 'Newest release' },
  { value: 'titleAsc', label: 'Title A-Z' },
  { value: 'titleDesc', label: 'Title Z-A' }
];

function formatRuntime(minutes?: number): string {
  if (!minutes) return '—';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours && remaining) return `${hours}h ${remaining}m`;
  if (hours) return `${hours}h`;
  return `${remaining}m`;
}

function releaseYear(item: Item): string {
  if (item.releaseDate) return item.releaseDate.slice(0, 4);
  const match = item.title.match(/\((\d{4})\)$/);
  return match?.[1] ?? '—';
}

function releaseTimestamp(item: Item): number {
  const date = item.releaseDate ? Date.parse(item.releaseDate) : NaN;
  return Number.isNaN(date) ? 0 : date;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((payload as { error?: string }).error ?? 'Request failed');
  }
  return payload as T;
}

export default function Home() {
  const [password, setPassword] = useState('');
  const [authPassword, setAuthPassword] = useState<string | null>(null);
  const [list, setList] = useState<SingleList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [addedBy, setAddedBy] = useState('');
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null);
  const [selectedRuntime, setSelectedRuntime] = useState<number | null>(null);
  const [selectedReleaseDate, setSelectedReleaseDate] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [sortOption, setSortOption] = useState<SortOption>('addedRecent');
  const [showUnwatchedOnly, setShowUnwatchedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridColumns, setGridColumns] = useState<4 | 5>(5);

  const authorizedFetch = async <T,>(init?: RequestInit): Promise<T> => {
    if (!authPassword) throw new Error('Missing auth');
    return fetchJson<T>('/api/list', {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-list-password': authPassword,
        ...(init?.headers ?? {})
      },
      cache: 'no-store'
    });
  };

  const unlockList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const next = await fetchJson<SingleList>('/api/list', {
        headers: { 'x-list-password': password },
        cache: 'no-store'
      });
      setAuthPassword(password);
      setList(next);
    } catch (err) {
      setAuthPassword(null);
      setList(null);
      setError(err instanceof Error ? err.message : 'Access denied.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authPassword || title.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const result = await fetchJson<{ results: SearchSuggestion[] }>(`/api/search?q=${encodeURIComponent(title.trim())}`, {
          headers: { 'x-list-password': authPassword },
          cache: 'no-store'
        });
        setSuggestions(result.results ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [title, authPassword]);

  const pickSuggestion = async (suggestion: SearchSuggestion) => {
    const withYear = suggestion.year ? `${suggestion.title} (${suggestion.year})` : suggestion.title;
    setTitle(withYear);
    setSelectedPoster(suggestion.poster ?? null);
    setSelectedReleaseDate(suggestion.releaseDate ?? null);
    setShowSuggestions(false);

    try {
      const details = await fetchJson<{ runtimeMinutes: number | null; releaseDate: string | null }>(
        `/api/movies/${suggestion.id}`,
        { cache: 'no-store' }
      );
      setSelectedRuntime(details.runtimeMinutes ?? null);
      if (details.releaseDate) setSelectedReleaseDate(details.releaseDate);
    } catch {
      setSelectedRuntime(null);
    }
  };

  const addItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const next = await authorizedFetch<SingleList>({
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          addedBy: addedBy.trim(),
          poster: selectedPoster,
          runtimeMinutes: selectedRuntime,
          releaseDate: selectedReleaseDate
        })
      });
      setList(next);
      setTitle('');
      setAddedBy('');
      setSelectedPoster(null);
      setSelectedRuntime(null);
      setSelectedReleaseDate(null);
      setSuggestions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleWatched = async (itemId: string, watched: boolean) => {
    const next = await authorizedFetch<SingleList>({
      method: 'PATCH',
      body: JSON.stringify({ itemId, watched })
    });
    setList(next);
  };

  const removeItem = async (itemId: string) => {
    const next = await authorizedFetch<SingleList>({
      method: 'DELETE',
      body: JSON.stringify({ itemId })
    });
    setList(next);
  };

  const filteredSortedItems = useMemo(() => {
    if (!list) return [];
    const filtered = showUnwatchedOnly ? list.items.filter(item => !item.watched) : [...list.items];

    switch (sortOption) {
      case 'addedOldest':
        return filtered.sort((a, b) => a.createdAt - b.createdAt);
      case 'releaseAsc':
        return filtered.sort((a, b) => releaseTimestamp(a) - releaseTimestamp(b));
      case 'releaseDesc':
        return filtered.sort((a, b) => releaseTimestamp(b) - releaseTimestamp(a));
      case 'titleAsc':
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
      case 'titleDesc':
        return filtered.sort((a, b) => b.title.localeCompare(a.title));
      case 'addedRecent':
      default:
        return filtered.sort((a, b) => b.createdAt - a.createdAt);
    }
  }, [list, showUnwatchedOnly, sortOption]);

  const stats = useMemo(() => {
    if (!list) return { total: 0, watched: 0, unwatched: 0, runtime: 0 };
    const watched = list.items.filter(item => item.watched).length;
    const runtime = list.items.reduce((sum, item) => sum + (item.runtimeMinutes ?? 0), 0);
    return { total: list.items.length, watched, unwatched: list.items.length - watched, runtime };
  }, [list]);

  if (!list) {
    return (
      <main className={styles.viewport}>
        <section className={styles.panel}>
          <h1 className={styles.title}>Unified Watchlist</h1>
          <p className={styles.subtitle}>Passwort eingeben, um die gemeinsame Liste zu öffnen.</p>
          <form onSubmit={unlockList} className={styles.form}>
            <input
              className={styles.input}
              type="password"
              autoFocus
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Passwort"
              required
            />
            <button className={styles.button} disabled={loading} type="submit">
              {loading ? 'Prüfe…' : 'Liste öffnen'}
            </button>
          </form>
          {error ? <p className={styles.error}>{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className={styles.viewport}>
      <section className={styles.panel}>
        <h1 className={styles.title}>{list.name}</h1>

        <div className={styles.statsRow}>
          <span>{stats.total} total</span>
          <span>{stats.watched} watched</span>
          <span>{stats.unwatched} unwatched</span>
          <span>{formatRuntime(stats.runtime)} runtime</span>
        </div>

        <form className={styles.form} onSubmit={addItem}>
          <div className={styles.row}>
            <input
              className={styles.input}
              value={title}
              onChange={event => {
                setTitle(event.target.value);
                setShowSuggestions(true);
              }}
              placeholder="Movie title"
              required
            />
            <input
              className={styles.input}
              value={addedBy}
              onChange={event => setAddedBy(event.target.value)}
              placeholder="Added by"
            />
            <button className={styles.button} disabled={loading} type="submit">
              Add
            </button>
          </div>
          {showSuggestions && suggestions.length > 0 ? (
            <ul className={styles.suggestions}>
              {suggestions.map(suggestion => (
                <li key={suggestion.id}>
                  <button className={styles.suggestionButton} type="button" onClick={() => void pickSuggestion(suggestion)}>
                    {suggestion.title} {suggestion.year ? `(${suggestion.year})` : ''}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>

        <div className={styles.controls}>
          <select className={styles.select} value={sortOption} onChange={event => setSortOption(event.target.value as SortOption)}>
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showUnwatchedOnly}
              onChange={event => setShowUnwatchedOnly(event.target.checked)}
            />
            Unwatched only
          </label>
          <div className={styles.viewButtons}>
            <button className={viewMode === 'grid' ? styles.activeButton : styles.textButton} type="button" onClick={() => setViewMode('grid')}>
              Grid
            </button>
            <button className={viewMode === 'list' ? styles.activeButton : styles.textButton} type="button" onClick={() => setViewMode('list')}>
              List
            </button>
            {viewMode === 'grid' ? (
              <button className={styles.textButton} type="button" onClick={() => setGridColumns(current => (current === 5 ? 4 : 5))}>
                {gridColumns} columns
              </button>
            ) : null}
          </div>
        </div>

        <ul className={viewMode === 'grid' ? (gridColumns === 5 ? styles.grid5 : styles.grid4) : styles.list}>
          {filteredSortedItems.map(item => (
            <li key={item.id} className={styles.itemCard}>
              <div className={styles.posterWrap}>
                {item.poster ? <img className={styles.poster} src={item.poster} alt={item.title} /> : <div className={styles.posterFallback}>No Cover</div>}
              </div>
              <div className={styles.itemBody}>
                <p className={item.watched ? styles.watchedTitle : styles.itemTitle}>{item.title}</p>
                <p className={styles.meta}>
                  {releaseYear(item)} • {formatRuntime(item.runtimeMinutes)}
                </p>
                <p className={styles.meta}>By: {item.addedBy || '—'}</p>
                <div className={styles.itemActions}>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={item.watched}
                      onChange={event => void toggleWatched(item.id, event.target.checked)}
                    />
                    Watched
                  </label>
                  <button className={styles.dangerButton} type="button" onClick={() => void removeItem(item.id)}>
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {filteredSortedItems.length === 0 ? <p className={styles.empty}>No items to show.</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
}
