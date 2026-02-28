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
  { value: 'addedRecent', label: 'Zuletzt hinzugefügt' },
  { value: 'addedOldest', label: 'Zuerst hinzugefügt' },
  { value: 'releaseAsc', label: 'Ältester Release' },
  { value: 'releaseDesc', label: 'Neuester Release' },
  { value: 'titleAsc', label: 'Titel A-Z' },
  { value: 'titleDesc', label: 'Titel Z-A' }
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

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((payload as { error?: string }).error ?? 'Anfrage fehlgeschlagen.');
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
    if (!authPassword) throw new Error('Authentifizierung fehlt.');
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
      setError(err instanceof Error ? err.message : 'Zugriff verweigert.');
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
      setShowSuggestions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hinzufügen fehlgeschlagen.');
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
    if (!list) {
      return {
        total: 0,
        watched: 0,
        unwatched: 0,
        runtimeTotal: 0,
        runtimeWatched: 0,
        watchedPercent: 0,
        unwatchedPercent: 0,
        runtimeWatchedPercent: 0
      };
    }

    const watched = list.items.filter(item => item.watched).length;
    const runtimeTotal = list.items.reduce((sum, item) => sum + (item.runtimeMinutes ?? 0), 0);
    const runtimeWatched = list.items.filter(item => item.watched).reduce((sum, item) => sum + (item.runtimeMinutes ?? 0), 0);
    const total = list.items.length;
    const unwatched = total - watched;

    const watchedPercent = total > 0 ? (watched / total) * 100 : 0;
    const unwatchedPercent = total > 0 ? (unwatched / total) * 100 : 0;
    const runtimeWatchedPercent = runtimeTotal > 0 ? (runtimeWatched / runtimeTotal) * 100 : 0;

    return {
      total,
      watched,
      unwatched,
      runtimeTotal,
      runtimeWatched,
      watchedPercent,
      unwatchedPercent,
      runtimeWatchedPercent
    };
  }, [list]);

  if (!list) {
    return (
      <main className={`${styles.viewport} ${styles.centeredViewport}`}>
        <section className={styles.loginContent}>
          <h1 className={styles.title}>Watchlist Neon Edition</h1>
          <p className={styles.subtitle}>Passwort eingeben, um die gemeinsame Liste freizuschalten.</p>
          <form onSubmit={unlockList} className={styles.form}>
            <label className={styles.fieldLabel} htmlFor="password-input">
              Passwort
            </label>
            <input
              id="password-input"
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
      <section className={styles.content}>
        <h1 className={styles.title}>{list.name}</h1>

        <div className={styles.statsGrid}>
          <article className={styles.statCard}>
            <span className={styles.statEmoji}>🎬</span>
            <p className={styles.statLabel}>Gesamtfilme</p>
            <p className={styles.statValue}>{stats.total}</p>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statEmoji}>📊</span>
            <p className={styles.statLabel}>Fortschritt</p>
            <div className={styles.progressHeader}>
              <span>Gesehen {formatPercent(stats.watchedPercent)}</span>
              <span>Offen {formatPercent(stats.unwatchedPercent)}</span>
            </div>
            <div className={styles.progressTrack} aria-label="Gesehen vs offen">
              <span className={styles.progressWatched} style={{ width: `${stats.watchedPercent}%` }} />
              <span className={styles.progressUnwatched} style={{ width: `${stats.unwatchedPercent}%` }} />
            </div>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statEmoji}>⏱️</span>
            <p className={styles.statLabel}>Laufzeit gesamt</p>
            <p className={styles.statValue}>{formatRuntime(stats.runtimeTotal)}</p>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statEmoji}>✅</span>
            <p className={styles.statLabel}>Laufzeit gesehen</p>
            <p className={styles.statValue}>{formatRuntime(stats.runtimeWatched)}</p>
            <div className={styles.progressTrack} aria-label="Gesehene Laufzeit">
              <span className={styles.progressWatched} style={{ width: `${stats.runtimeWatchedPercent}%` }} />
            </div>
            <p className={styles.progressFooter}>{formatPercent(stats.runtimeWatchedPercent)} der Gesamtlaufzeit</p>
          </article>
        </div>

        <form className={styles.form} onSubmit={addItem}>
          <div className={styles.row}>
            <div className={styles.flyoutAnchor}>
              <input
                className={styles.input}
                value={title}
                onFocus={() => setShowSuggestions(true)}
                onChange={event => {
                  setTitle(event.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Filmtitel suchen"
                required
              />
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
            </div>

            <input
              className={styles.input}
              value={addedBy}
              onChange={event => setAddedBy(event.target.value)}
              placeholder="Hinzugefügt von"
            />
            <button className={styles.button} disabled={loading} type="submit">
              Hinzufügen
            </button>
          </div>
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
            Nur ungesehene
          </label>
          <div className={styles.viewButtons}>
            <button className={viewMode === 'grid' ? styles.activeButton : styles.textButton} type="button" onClick={() => setViewMode('grid')}>
              Raster
            </button>
            <button className={viewMode === 'list' ? styles.activeButton : styles.textButton} type="button" onClick={() => setViewMode('list')}>
              Liste
            </button>
            {viewMode === 'grid' ? (
              <button className={styles.textButton} type="button" onClick={() => setGridColumns(current => (current === 5 ? 4 : 5))}>
                {gridColumns} Spalten
              </button>
            ) : null}
          </div>
        </div>

        <ul className={viewMode === 'grid' ? (gridColumns === 5 ? styles.grid5 : styles.grid4) : styles.list}>
          {filteredSortedItems.map(item => (
            <li key={item.id} className={styles.itemCard}>
              <div className={styles.posterWrap}>
                {item.poster ? <img className={styles.poster} src={item.poster} alt={item.title} /> : <div className={styles.posterFallback}>Kein Cover</div>}
              </div>
              <div className={styles.itemBody}>
                <p className={item.watched ? styles.watchedTitle : styles.itemTitle}>{item.title}</p>
                <p className={styles.meta}>
                  {releaseYear(item)} • {formatRuntime(item.runtimeMinutes)}
                </p>
                <p className={styles.meta}>Von: {item.addedBy || '—'}</p>
                <div className={styles.itemActions}>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={item.watched}
                      onChange={event => void toggleWatched(item.id, event.target.checked)}
                    />
                    Gesehen
                  </label>
                  <button className={styles.dangerButton} type="button" onClick={() => void removeItem(item.id)}>
                    Entfernen
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {filteredSortedItems.length === 0 ? <p className={styles.empty}>Noch keine Einträge sichtbar.</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
}
