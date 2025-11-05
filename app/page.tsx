'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Item = { id: string; title: string; rating?: number; watched: boolean; addedBy?: string; createdAt: number; updatedAt: number };
type List = { id: string; name: string; items: Item[]; updatedAt: number };

async function api<T>(path: string, opts?: RequestInit): Promise<T>{
  const res = await fetch(path, { cache: 'no-store', ...opts });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function Page(){
  const [list, setList] = useState<List | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [who, setWho] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // Only auto-join if the URL has ?list=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('list');
    const stored = localStorage.getItem('listId');
    setLastId(stored || null);
    if(urlId) join(urlId);
  }, []);

  const join = useCallback(async (id: string) => {
    setError(null);
    try {
      const data = await api<List>(`/api/lists/${id}`);
      setList(data);
      setName(data.name);
      localStorage.setItem('listId', id);
      const url = new URL(window.location.href);
      url.searchParams.set('list', id);
      history.replaceState({}, '', url.toString());
      startPolling(id);
    } catch(e: any){ setError(parseErr(e)); }
  }, []);

  const leave = useCallback(() => {
    if(pollRef.current) window.clearInterval(pollRef.current);
    localStorage.removeItem('listId');
    setList(null);
    setTitle('');
    // Remove ?list param
    const url = new URL(window.location.href);
    url.searchParams.delete('list');
    history.replaceState({}, '', url.toString());
    // Update lastId for "Resume" button (will be null now)
    const stored = localStorage.getItem('listId');
    setLastId(stored || null);
  }, []);

  const create = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await api<List>(`/api/lists`, { method: 'POST', body: JSON.stringify({ name }) });
      setList(data);
      setName(data.name);
      localStorage.setItem('listId', data.id);
      const url = new URL(window.location.href);
      url.searchParams.set('list', data.id);
      history.replaceState({}, '', url.toString());
      startPolling(data.id);
    } catch(e: any){ setError(parseErr(e)); }
    finally { setLoading(false); }
  }, [name]);

  const quickStart = useCallback(async () => {
    if(list) return;
    setName(n => n || 'Watchlist');
    await create();
  }, [create, list]);

  const startPolling = (id: string) => {
    if(pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const data = await api<List>(`/api/lists/${id}`);
        setList(prev => (prev?.updatedAt !== data.updatedAt ? data : prev));
      } catch {}
    }, 1500);
  };

  useEffect(() => () => { if(pollRef.current) window.clearInterval(pollRef.current); }, []);

  const add = useCallback(async () => {
    if(!list) return;
    const titleClean = title.trim();
    if(!titleClean) return;
    setTitle('');
    try{
      const data = await api<List>(`/api/lists/${list.id}`,{ method:'POST', body: JSON.stringify({ title: titleClean, addedBy: who }) });
      setList(data);
    }catch(e:any){ setError(parseErr(e)); }
  }, [list, title, who]);

  const update = useCallback(async (itemId: string, patch: Partial<Pick<Item, 'title'|'rating'|'watched'>>) => {
    if(!list) return;
    try{
      const data = await api<List>(`/api/lists/${list.id}`, { method:'PATCH', body: JSON.stringify({ itemId, ...patch }) });
      setList(data);
    }catch(e:any){ setError(parseErr(e)); }
  }, [list]);

  const remove = useCallback(async (itemId: string) => {
    if(!list) return;
    try{
      const data = await api<List>(`/api/lists/${list.id}`, { method:'DELETE', body: JSON.stringify({ itemId }) });
      setList(data);
    }catch(e:any){ setError(parseErr(e)); }
  }, [list]);

  const shareUrl = useMemo(() => list ? `${location.origin}?list=${encodeURIComponent(list.id)}` : '', [list]);

  return (
    <div className="card">
      <div className="header">
        <div className="h1">🎬 Watchlists</div>
        <div className="sep" />
        {list ? (
          <>
            <span className="badge">list: <span className="copy">{list.id}</span></span>
            <button className="btn secondary" onClick={leave} title="Leave this list">Leave</button>
          </>
        ) : null}
      </div>

      {!list && (
        <div className="hero">
          <h2>Create a shared watchlist</h2>
          <p>Start a new list and share the link with friends.</p>
          <div className="cta">
            <input className="input" placeholder="List name (optional)" value={name} onChange={e=>setName(e.target.value)} style={{maxWidth:320}} />
            <button className="btn" onClick={quickStart}>Create watchlist</button>
          </div>
          <div style={{marginTop:16}}>or join an existing list:</div>
          <div className="cta" style={{marginTop:10}}>
            <input className="input" placeholder="Enter list ID…" onKeyDown={(e)=>{ if(e.key==='Enter'){ const id=(e.target as HTMLInputElement).value.trim(); if(id) join(id);} }} style={{maxWidth:320}} />
            <button className="btn secondary" onClick={()=>{
              const el = document.querySelector<HTMLInputElement>('input[placeholder^="Enter list ID"]');
              if(el){ const id=el.value.trim(); if(id) join(id); }
            }}>Join</button>
          </div>
          {lastId && (
            <div className="cta" style={{marginTop:20}}>
              <button className="btn secondary" onClick={()=>join(lastId!)}>Resume last list ({lastId})</button>
            </div>
          )}
        </div>
      )}

      {list && (
        <>
          <div className="toolbar">
            <input className="input" placeholder="Add a movie or show…" value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') add(); }} />
            <input className="input" style={{maxWidth:180}} placeholder="Your name (optional)" value={who} onChange={e=>setWho(e.target.value)} />
            <button className="btn" onClick={add}>Add</button>
          </div>

          {error && <div style={{padding:'8px 20px', color:'var(--danger)'}}>{error}</div>}

          <div className="list">
            {list.items.length === 0 && (
              <div className="empty">No items yet. Use the form above to add your first title 👆</div>
            )}

            {list.items.map(item => (
              <div className="item" key={item.id}>
                <label className="checkbox">
                  <input type="checkbox" checked={item.watched} onChange={e=>update(item.id, { watched: e.target.checked })} />
                  <span>{item.watched ? '✓' : ''}</span>
                </label>

                <input type="text" value={item.title} onChange={e=>update(item.id, { title: e.target.value })} />

                <div className="rating">
                  {Array.from({length:5}).map((_,i)=>{
                    const val = i+1; const on = (item.rating ?? 0) >= val;
                    return (
                      <span key={val} className={`star ${on?'':'off'}`} onClick={()=>update(item.id,{ rating: val })}>★</span>
                    );
                  })}
                  <span className="sub" style={{marginLeft:8}}>{item.rating ?? 0}/5</span>
                </div>

                <div className="sub">{item.addedBy ? `by ${item.addedBy}` : ''}</div>

                <button className="btn danger" title="Remove item" onClick={()=>remove(item.id)}>Remove</button>
              </div>
            ))}
          </div>

          <div className="footer">
            <span className="sub">Share this link:</span>
            <span className="badge copy" onClick={()=>{ navigator.clipboard?.writeText(shareUrl); }} title="Click to copy">{shareUrl}</span>
            <div className="sep" />
            <span className="sub">Updated: {new Date(list.updatedAt).toLocaleTimeString()}</span>
          </div>
        </>
      )}
    </div>
  );
}

function parseErr(e: any){
  try{ const j = JSON.parse(String(e?.message ?? e)); return j.error || String(e); }catch{ return String(e?.message ?? e); }
}
