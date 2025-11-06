'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Trash2, Plus, RefreshCw, LogOut, LayoutGrid, List as ListIcon } from 'lucide-react';

type Item = { id: string; title: string; watched: boolean; addedBy?: string; poster?: string; createdAt: number; updatedAt: number };
type List = { id: string; name: string; items: Item[]; updatedAt: number };
type Suggestion = { id: number; title: string; year?: string; poster?: string };

async function api<T>(path: string, opts?: RequestInit): Promise<T>{
  const res = await fetch(path, { cache: 'no-store', ...opts });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}


function getHiResPoster(url?: string): string | undefined {
  if(!url) return url as any;
  try{
    return url.replace(/\/image\.tmdb\.org\/t\/p\/w(92|154|185|342|500|780)\//, '/image.tmdb.org/t/p/w500/');
  }catch{ return url as any; }
}
const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

export default function Page(){
  const [list, setList] = useState<List | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [who, setWho] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [sugs, setSugs] = useState<Suggestion[]>([]);
  const [showSugs, setShowSugs] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [posterForNextAdd, setPosterForNextAdd] = useState<string | undefined>(undefined);
  const [view, setView] = useState<'list'|'grid'>(() => (typeof window !== 'undefined' ? (localStorage.getItem('view') as 'list'|'grid' | null) : null) || 'list');
  const pollRef = useRef<number | null>(null);
  const acTimer = useRef<number | null>(null);
  const acAbort = useRef<AbortController | null>(null);

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
      setLastSynced(Date.now());
      startPolling(id);
    } catch(e: any){ setError(parseErr(e)); }
  }, []);

  const leave = useCallback(() => {
    if(pollRef.current) window.clearInterval(pollRef.current);
    localStorage.removeItem('listId');
    setList(null);
    setTitle('');
    const url = new URL(window.location.href);
    url.searchParams.delete('list');
    history.replaceState({}, '', url.toString());
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
      setLastSynced(Date.now());
      startPolling(data.id);
    } catch(e: any){ setError(parseErr(e)); }
    finally { setLoading(false); }
  }, [name]);

  const quickStart = useCallback(async () => {
    if(list) return;
    setName(n => n || 'Watchlist');
    await create();
  }, [create, list]);

  // Hourly auto-sync
  const startPolling = (id: string) => {
    const interval = 60 * 60 * 1000;
    if(pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      await refresh(id);
    }, interval);
  };
  useEffect(() => () => { if(pollRef.current) window.clearInterval(pollRef.current); }, []);

  const refresh = useCallback(async (id?: string) => {
    const targetId = id ?? list?.id;
    if(!targetId) return;
    try {
      const data = await api<List>(`/api/lists/${targetId}`);
      setList(prev => (prev?.updatedAt !== data.updatedAt ? data : prev));
      setLastSynced(Date.now());
    } catch(e:any){
      setError(parseErr(e));
    }
  }, [list?.id]);

  // Autocomplete
  const onTitleChange = (v: string) => {
    setTitle(v);
    setPosterForNextAdd(undefined);
    if(acTimer.current) window.clearTimeout(acTimer.current);
    if(acAbort.current){ acAbort.current.abort(); acAbort.current = null; }
    if(!v.trim()){
      setSugs([]); setShowSugs(false); return;
    }
    acTimer.current = window.setTimeout(async () => {
      try{
        acAbort.current = new AbortController();
        const r = await fetch(`/api/search?q=${encodeURIComponent(v.trim())}`, { signal: acAbort.current.signal });
        if(!r.ok) throw new Error(await r.text());
        const j = await r.json();
        setSugs(j.results || []);
        setShowSugs(true);
        setActiveIdx(-1);
      }catch(_){}
      finally{ acAbort.current = null; }
    }, 250);
  };

  const pick = (s: Suggestion) => {
    const t = s.year ? `${s.title} (${s.year})` : s.title;
    setTitle(t);
    setPosterForNextAdd(s.poster);
    setShowSugs(false);
    setActiveIdx(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if(!showSugs || sugs.length === 0) return;
    if(e.key === 'ArrowDown'){ e.preventDefault(); setActiveIdx(i => Math.min(i+1, sugs.length-1)); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); setActiveIdx(i => Math.max(i-1, 0)); }
    else if(e.key === 'Enter'){
      if(activeIdx >= 0){ e.preventDefault(); pick(sugs[activeIdx]); }
    } else if(e.key === 'Escape'){ setShowSugs(false); setActiveIdx(-1); }
  };

  const add = useCallback(async () => {
    if(!list) return;
    const titleClean = title.trim();
    if(!titleClean) return;
    const poster = posterForNextAdd;
    setTitle(''); setPosterForNextAdd(undefined); setSugs([]); setShowSugs(false); setActiveIdx(-1);
    try{
      const data = await api<List>(`/api/lists/${list.id}`,{ method:'POST', body: JSON.stringify({ title: titleClean, addedBy: who, poster }) });
      setList(data);
      setLastSynced(Date.now());
    }catch(e:any){ setError(parseErr(e)); }
  }, [list, title, who, posterForNextAdd]);

  const update = useCallback(async (itemId: string, patch: Partial<Pick<Item, 'title'|'watched'|'poster'>>) => {
    if(!list) return;
    try{
      const data = await api<List>(`/api/lists/${list.id}`, { method:'PATCH', body: JSON.stringify({ itemId, ...patch }) });
      setList(data);
      setLastSynced(Date.now());
    }catch(e:any){ setError(parseErr(e)); }
  }, [list]);

  const remove = useCallback(async (itemId: string) => {
    if(!list) return;
    try{
      const data = await api<List>(`/api/lists/${list.id}`, { method:'DELETE', body: JSON.stringify({ itemId }) });
      setList(data);
      setLastSynced(Date.now());
    }catch(e:any){ setError(parseErr(e)); }
  }, [list]);

  const shareUrl = useMemo(() => list ? `${location.origin}?list=${encodeURIComponent(list.id)}` : '', [list]);

  const stats = useMemo(() => {
    const total = list?.items.length ?? 0;
    const watched = list ? list.items.filter(i => i.watched).length : 0;
    const pct = total ? Math.round((watched / total) * 1000) / 10 : 0;
    return { total, watched, pct };
  }, [list]);

  useEffect(() => {
    localStorage.setItem('view', view);
  }, [view]);

  return (
    <main className="card" role="main">
      <header className="header" role="banner">
        <div className="h1">🎬 Watchlists</div>
        <div className="sep" />
        {list && (
          <>
            <div className="stats">
              <span className="badge">Stats: {stats.total} total • {stats.watched} watched • {stats.pct}%</span>
              <div className="progress" role="progressbar" aria-label="Watched percentage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.pct}><span style={{ width: `${stats.pct}%` }} /></div>
            </header>
            <div className="sep" />
            <button className="iconbtn blue" onClick={()=>setView(v=> v==='list'?'grid':'list')} aria-label="Toggle view">
              {view==='list' ? <LayoutGrid size={18}/> : <ListIcon size={18}/>}
            </button>
            <button className="iconbtn blue" onClick={()=>refresh()} aria-label="Sync"><RefreshCw size={18}/></button>
            <button className="iconbtn red" onClick={leave} aria-label="Leave list"><LogOut size={18}/></button>
          </>
        )}
      </div>

      {!list && (
        <section className="hero" aria-labelledby="hero-title">
          <h1 id="hero-title">Create a shared watchlist</h1>
          <p className="lead">Start a new list and share the link with friends — lightweight and instant.</p>
<ul className="features" role="list"><li>Shared editing in real time</li><li>Posters & autocomplete by TMDB</li><li>One-click watched tracking & stats</li></ul>
          <div className="cta">
            <input className="input" placeholder="List name (optional)" value={name} onChange={e=>setName(e.target.value)} style={{maxWidth:320}} />
            <button className="iconbtn green lg" onClick={quickStart} aria-label="Create"><Plus size={18}/></button>
          </section>
          <div style={{marginTop:16}}>or join an existing list:</div>
          <div className="cta" style={{marginTop:10}}>
            <input className="input" placeholder="Enter list ID…" onKeyDown={(e)=>{ if(e.key==='Enter'){ const id=(e.target as HTMLInputElement).value.trim(); if(id) join(id);} }} style={{maxWidth:320}} />
            <button className="iconbtn blue" onClick={()=>{
              const el = document.querySelector<HTMLInputElement>('input[placeholder^="Enter list ID"]');
              if(el){ const id=el.value.trim(); if(id) join(id); }
            }} aria-label="Join"><RefreshCw size={18}/></button>
          </div>
          {lastId && (
            <div className="cta" style={{marginTop:20}}>
              <button className="iconbtn blue" onClick={()=>join(lastId!)} aria-label="Resume"><RefreshCw size={18}/></button>
            </div>
          )}
        </div>
      )}

      {list && (
        <>
          <div className="toolbar">
            <div className="ac-anchor">
              <input
                className="input grow"
                placeholder="Add a movie or show…"
                value={title}
                onChange={e=>onTitleChange(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={()=>{ if(sugs.length>0) setShowSugs(true);} }
              />
              {showSugs && (
                <div className="ac">
                  {sugs.length === 0 && <div className="ac-empty">No matches</div>}
                  {sugs.map((s, i) => (
                    <div
                      key={s.id}
                      className={`ac-item ${i===activeIdx ? 'active' : ''}`}
                      onMouseDown={(e)=>{ e.preventDefault(); pick(s); }}
                      onMouseEnter={()=>setActiveIdx(i)}
                    >
                      <span>{s.title}</span>
                      <span className="sub">{s.year || ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input className="input" style={{maxWidth:220, flex:'0 0 220px'}} placeholder="Your name (optional)" value={who} onChange={e=>setWho(e.target.value)} />
            <button className="iconbtn green lg" onClick={add} aria-label="Add movie">
              <Plus size={18} />
            </button>
          </div>

          {error && <div role='status' aria-live='polite' style={{padding:'8px 20px', color:'var(--danger)'}}>{error}</div>}

          {view==='list' ? (
            <div className="list">
              {list.items.length === 0 && (
                <div className="empty">No items yet. Use the form above to add your first title 👆</div>
              )}
              {list.items.map(item => (
                <div className={`item ${item.watched ? 'watched' : ''}`} key={item.id}>
                  <div className="thumb">
                    {item.poster ? <img src={getHiResPoster(item.poster)} alt="" loading="lazy" decoding="async" /> : <span>🎬</span>}
                  </div>
                  <div className="title" title={item.title}>{item.title}</div>
                  <div className="sub">{item.addedBy ? `by ${item.addedBy}` : ''}</div>
                  <div className="actions">
                    <button
                      className="iconbtn green"
                      aria-label="Toggle watched"
                      onClick={()=>update(item.id, { watched: !item.watched })}
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      className="iconbtn red"
                      aria-label="Remove movie"
                      onClick={()=>remove(item.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            
            <div className="grid">
              {list.items.length === 0 && (
                <div className="empty" style={{gridColumn:'1 / -1'}}>No items yet. Use the form above to add your first title 👆</div>
              )}
              {list.items.map(item => (
                <div className={`poster-card ${item.watched ? 'watched' : ''}`} key={item.id}>
                  <div className="poster">
                    {item.poster ? (
                      <img src={getHiResPoster(item.poster)} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <div className="poster-fallback">🎬</div>
                    )}
                    <div className="hover">
                      <div className="meta">
                        <div className="title" title={item.title}>{item.title}</div>
                        {item.addedBy ? <div className="sub">by {item.addedBy}</div> : null}
                      </div>
                      <div className="actions">
                        <button
                          className="iconbtn green"
                          aria-label="Toggle watched"
                          onClick={()=>update(item.id, { watched: !item.watched })}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          className="iconbtn red"
                          aria-label="Remove movie"
                          onClick={()=>remove(item.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <footer className="footer" role="contentinfo">
            <span className="sub">Share this link:</span>
            <span className="badge copy" onClick={()=>{ navigator.clipboard?.writeText(shareUrl); }} title="Click to copy">{shareUrl}</span>
            <span className="badge">list: <span className="copy">{list.id}</span></span>
            <div className="sep" />
            <span className="sub">Updated: {new Date(list.updatedAt).toLocaleTimeString([], timeOpts)}</span>
            {lastSynced && <span className="sub" style={{marginLeft:8}}>Last synced: {new Date(lastSynced).toLocaleTimeString([], timeOpts)}</span>}
          </footer>
        </>
      )}
    </div>
  );
}

function parseErr(e: any){
  try{ const j = JSON.parse(String(e?.message ?? e)); return j.error || String(e); }catch{ return String(e?.message ?? e); }
}
