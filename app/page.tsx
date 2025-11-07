'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Trash2
} from 'lucide-react';
import styles from './page.module.css';

type Item = {
  id: string;
  title: string;
  watched: boolean;
  addedBy?: string;
  poster?: string;
  createdAt: number;
  updatedAt: number;
};

type List = {
  id: string;
  name: string;
  items: Item[];
  updatedAt: number;
};

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
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
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
  const [status, setStatus] = useState<string | null>(null);
  const [lastListId, setLastListId] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<number | null>(null);

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
    if (!list) return { total: 0, watched: 0, pending: 0 };
    const total = list.items.length;
    const watched = list.items.filter((item) => item.watched).length;
    return { total, watched, pending: total - watched };
  }, [list]);

  const joinList = useCallback(
    async (id: string) => {
      const cleanId = id.trim();
      if (!cleanId) {
        setError('Enter a list ID to continue.');
        return;
      }
      setJoining(true);
      setError(null);
      setStatus(null);
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
        setError(parseError(err));
      } finally {
        setJoining(false);
      }
    },
    []
  );

  const createList = useCallback(async () => {
    setCreating(true);
    setError(null);
    setStatus(null);
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
      setError(parseError(err));
    } finally {
      setCreating(false);
    }
  }, [listName]);

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
        setError('Add a title to include an item.');
        setStatus(null);
        return;
      }
      setAdding(true);
      setError(null);
      setStatus(null);
      try {
        const data = await api<List>(`/api/lists/${list.id}`, {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            addedBy: addedBy.trim() || undefined
          })
        });
        setList(data);
        setTitle('');
        setAddedBy('');
        setLastSynced(Date.now());
        setStatus('Item added to your watchlist.');
      } catch (err) {
        setError(parseError(err));
      } finally {
        setAdding(false);
      }
    },
    [addedBy, list, title]
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
      setStatus(null);
      try {
        const data = await api<List>(`/api/lists/${list.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ itemId: item.id, watched: !item.watched })
        });
        setList(data);
        setLastSynced(Date.now());
      } catch (err) {
        setError(parseError(err));
        await refreshList(list.id, false);
      }
    },
    [list]
  );

  const removeItem = useCallback(
    async (item: Item) => {
      if (!list) return;
      setStatus(null);
      try {
        const data = await api<List>(`/api/lists/${list.id}`, {
          method: 'DELETE',
          body: JSON.stringify({ itemId: item.id })
        });
        setList(data);
        setLastSynced(Date.now());
        setStatus('Item removed.');
      } catch (err) {
        setError(parseError(err));
        await refreshList(list.id, false);
      }
    },
    [list]
  );

  const refreshList = useCallback(
    async (id?: string, showStatus = true) => {
      const target = id ?? list?.id;
      if (!target) return;
      setRefreshing(true);
      if (showStatus) {
        setStatus('Syncing latest changes…');
      }
      try {
        const data = await api<List>(`/api/lists/${target}`);
        setList(data);
        setLastSynced(Date.now());
      } catch (err) {
        setError(parseError(err));
      } finally {
        setRefreshing(false);
        if (showStatus) {
          setStatus(null);
        }
      }
    },
    [list?.id]
  );

  const leaveList = useCallback(() => {
    const previousId = list?.id ?? null;
    setList(null);
    setTitle('');
    setAddedBy('');
    setStatus(null);
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
      setStatus('List ID copied to clipboard.');
      setError(null);
    } catch (err) {
      setError('Unable to copy. Copy it manually instead.');
    }
  }, [list]);

  const lastUpdated = list ? formatRelative(list.updatedAt) : null;
  const lastSyncedAgo = formatRelative(lastSynced);

  return (
    <main className={styles.viewport}>
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
            <div className={styles.stats}>
              <span>{stats.total} total titles</span>
              <span>{stats.pending} on deck</span>
              <span>{stats.watched} watched</span>
            </div>
          </section>

          {(error || status) && (
            <div className={`${styles.status} ${error ? styles.statusError : styles.statusSuccess}`}>
              {error ? <Trash2 size={18} /> : <CheckCircle2 size={18} />}
              {error ?? status}
            </div>
          )}

          <section className={styles.formCard}>
            <form className={`${styles.form} ${styles.formInline}`} onSubmit={addItem}>
              <label className={styles.visuallyHidden} htmlFor="title">
                Title
              </label>
              <input
                id="title"
                className={`${styles.inputField} ${styles.inputCompact}`}
                placeholder="e.g. Dune: Part Two"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={adding}
                required
              />
              <label className={styles.visuallyHidden} htmlFor="added-by">
                Added by (optional)
              </label>
              <input
                id="added-by"
                className={`${styles.inputField} ${styles.inputCompact}`}
                placeholder="Name or initials (optional)"
                value={addedBy}
                onChange={(event) => setAddedBy(event.target.value)}
                disabled={adding}
              />
              <button className={styles.buttonPrimary} type="submit" disabled={adding}>
                {adding ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
                {adding ? 'Adding…' : 'Add to list'}
              </button>
            </form>
          </section>

          {list.items.length > 0 ? (
            <section className={styles.itemGrid}>
              {list.items.map((item) => {
                const meta = [
                  item.addedBy ? `Added by ${item.addedBy}` : null,
                  `Created ${formatDate(item.createdAt)}`
                ].filter(Boolean);
                return (
                  <article
                    key={item.id}
                    className={`${styles.itemCard} ${item.watched ? styles.itemWatched : ''}`}
                  >
                    <h3 className={styles.itemTitle}>{item.title}</h3>
                    <div className={styles.itemMeta}>
                      {meta.map((entry) => (
                        <span key={entry}>{entry}</span>
                      ))}
                    </div>
                    <div className={styles.itemActions}>
                      <button type="button" onClick={() => toggleWatched(item)}>
                        {item.watched ? <Check size={16} /> : <CheckCircle2 size={16} />}
                        {item.watched ? 'Watched' : 'Mark watched'}
                      </button>
                      <button type="button" onClick={() => removeItem(item)}>
                        <Trash2 size={16} /> Remove
                      </button>
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

          <footer className={styles.listFooter}>
            <div className={styles.footerItem}>
              <span className={styles.footerLabel}>ID</span>
              <code>{list.id}</code>
            </div>
            {lastUpdated && (
              <div className={styles.footerItem}>
                <span className={styles.footerLabel}>Updated</span>
                <span>
                  <Clock size={16} /> {lastUpdated}
                </span>
              </div>
            )}
            {lastSyncedAgo && (
              <div className={styles.footerItem}>
                <span className={styles.footerLabel}>Synced</span>
                <span>
                  <RefreshCw size={16} /> {lastSyncedAgo}
                </span>
              </div>
            )}
          </footer>
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
