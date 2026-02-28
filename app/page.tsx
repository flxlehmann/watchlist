'use client';

import { FormEvent, useState } from 'react';
import styles from './page.module.css';

type Item = {
  id: string;
  title: string;
  watched: boolean;
  createdAt: number;
};

type SingleList = {
  id: string;
  items: Item[];
  updatedAt: number;
};

async function requestList(password: string): Promise<SingleList> {
  const response = await fetch('/api/list', {
    headers: {
      'x-list-password': password
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Access denied.' }));
    throw new Error(payload.error ?? 'Access denied.');
  }

  return response.json();
}

export default function Home() {
  const [password, setPassword] = useState('');
  const [accessError, setAccessError] = useState<string | null>(null);
  const [authPassword, setAuthPassword] = useState<string | null>(null);
  const [list, setList] = useState<SingleList | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setAccessError(null);
    try {
      const nextList = await requestList(password);
      setAuthPassword(password);
      setList(nextList);
    } catch (error) {
      setAuthPassword(null);
      setList(null);
      setAccessError(error instanceof Error ? error.message : 'Access denied.');
    } finally {
      setSubmitting(false);
    }
  };

  const runAuthorizedRequest = async (init?: RequestInit) => {
    if (!authPassword) return;
    const response = await fetch('/api/list', {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-list-password': authPassword,
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) {
      throw new Error('Request failed.');
    }

    const nextList: SingleList = await response.json();
    setList(nextList);
  };

  const addItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setSubmitting(true);
    try {
      await runAuthorizedRequest({
        method: 'POST',
        body: JSON.stringify({ title })
      });
      setNewTitle('');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleItem = async (itemId: string, watched: boolean) => {
    await runAuthorizedRequest({
      method: 'PATCH',
      body: JSON.stringify({ itemId, watched })
    });
  };

  const removeItem = async (itemId: string) => {
    await runAuthorizedRequest({
      method: 'DELETE',
      body: JSON.stringify({ itemId })
    });
  };

  if (!list) {
    return (
      <main className={styles.viewport}>
        <section className={styles.panel}>
          <h1 className={styles.title}>Enter password</h1>
          <p className={styles.subtitle}>This website contains a single protected list.</p>
          <form onSubmit={submitPassword} className={styles.form}>
            <input
              className={styles.input}
              type="password"
              autoFocus
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Password"
              required
            />
            <button className={styles.button} type="submit" disabled={submitting}>
              {submitting ? 'Checking…' : 'Unlock list'}
            </button>
          </form>
          {accessError ? <p className={styles.error}>{accessError}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className={styles.viewport}>
      <section className={styles.panel}>
        <h1 className={styles.title}>Single watchlist</h1>
        <form onSubmit={addItem} className={styles.formInline}>
          <input
            className={styles.input}
            value={newTitle}
            onChange={event => setNewTitle(event.target.value)}
            placeholder="Add a movie"
            required
          />
          <button className={styles.button} type="submit" disabled={submitting}>
            Add
          </button>
        </form>

        <ul className={styles.list}>
          {list.items.map(item => (
            <li key={item.id} className={styles.item}>
              <label className={styles.itemLabel}>
                <input
                  type="checkbox"
                  checked={item.watched}
                  onChange={event => toggleItem(item.id, event.target.checked)}
                />
                <span className={item.watched ? styles.watched : undefined}>{item.title}</span>
              </label>
              <button className={styles.textButton} onClick={() => removeItem(item.id)} type="button">
                Remove
              </button>
            </li>
          ))}
          {list.items.length === 0 ? <li className={styles.empty}>No items yet.</li> : null}
        </ul>
      </section>
    </main>
  );
}
