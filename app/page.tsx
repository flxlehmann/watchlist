'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Trash2, Plus, RefreshCw, LayoutGrid, List as ListIcon, Share2 } from 'lucide-react';

type Item = { id: string; title: string; watched: boolean; addedBy?: string; poster?: string; releaseYear?: number; createdAt: number; updatedAt: number };
type List = { id: string; name: string; items: Item[]; updatedAt: number };
type Suggestion = { id: number; title: string; year?: string; poster?: string };

async function api<T>(path: string, opts?: RequestInit): Promise<T>{
  const res = await fetch(path, { cache: 'no-store', ...opts });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}

const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

export default function Home(){
  const [list, setList] = useState<List | null>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [view, setView] = useState<'grid'|'list'>('list') => (typeof localStorage !== 'undefined' && (localStorage.getItem('view') as any)) || 'list');
  const [watchedFilter, setWatchedFilter] = useState<'all'|'watched'|'unwatched'>('all') => (localStorage.getItem('watchedFilter') as any) || 'all');
  const [sortBy, setSortBy] = useState<'added'|'release'>('added') => (localStorage.getItem('sortBy') as any) || 'added');
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  // create or load list
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get('list') || localStorage.getItem('listId');
    (async () => {
      try{
        let current: List | null = null;
        if(id){
          current = await api<List>(`/api/lists/${id}`);
        } else {
          current = await api<List>('/api/lists', { method:'POST' });
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.set('list', current.id);
          window.history.replaceState({}, '', nextUrl.toString());
          localStorage.setItem('listId', current.id);
        }
        setList(current);
      }catch(e: any){ setError(parseErr(e)); }
    })();
  }, []);

  // hydrate client-only prefs
  const [isClient, setIsClient] = useState(false);
  const [baseOrigin, setBaseOrigin] = useState('');
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const v = (localStorage.getItem('view') as any) as ('grid'|'list') | null;
      if (v === 'grid' || v === 'list') setView(v);
      const wf = (localStorage.getItem('watchedFilter') as any) as ('all'|'watched'|'unwatched') | null;
      if (wf === 'all' || wf === 'watched' || wf === 'unwatched') setWatchedFilter(wf);
      const sb = (localStorage.getItem('sortBy') as any) as ('added'|'release') | null;
      if (sb === 'added' || sb === 'release') setSortBy(sb);
      setBaseOrigin(window.location.origin);
    }
  }, []);

  // autosync hourly
  useEffect(() => {
    const t = setInterval(async () => {
      if(!list) return;
      try{
        const fresh = await api<List>(`/api/lists/${list.id}`);
        setList(fresh);
        setLastSynced(Date.now());
      }catch(e:any){ /* ignore transient */ }
    }, 60 * 60 * 1000);
    return () => clearInterval(t);
  }, [list?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // search suggestions
  useEffect(() => {
    const ctrl = new AbortController();
    const q = input.trim();
    if(!q){ setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try{
        const s = await api<{results:Suggestion[]}>(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        setSuggestions(s.results || []);
      }catch{ /* ignore */ }
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [input]);

  const add = useCallback(async (payload: { title: string; poster?: string; releaseYear?: number }) => {
    if(!list) return;
    try{
      const data = await api<List>(`/api/lists/${list.id}`, { method:'POST', body: JSON.stringify(payload) });
      setList(data);
      setInput('');
      setSuggestions([]);
      setShowSuggest(false);
    }catch(e:any){ setError(parseErr(e)); }
  }, [list]);

  const toggle = useCallback(async (itemId: string, watched: boolean) => {
    if(!list) return;
    try{
      const data = await api<List>(`/api/lists/${list.id}`, { method:'PATCH', body: JSON.stringify({ itemId, watched }) });
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

  const shareUrl = useMemo(() => (isClient && list) ? `${baseOrigin}?list=${encodeURIComponent(list.id)}` : '', [isClient, baseOrigin, list]);

  // Stats & derived items
  const filtered = useMemo(() => {
    let items = list?.items || [];
    if (watchedFilter === 'watched') items = items.filter(i => i.watched);
    if (watchedFilter === 'unwatched') items = items.filter(i => !i.watched);
    if (sortBy === 'added') {
      items = [...items].sort((a,b) => b.createdAt - a.createdAt);
    } else {
      items = [...items].sort((a,b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0));
    }
    return items;
  }, [list, watchedFilter, sortBy]);

  const stats = useMemo(() => {
    const total = list?.items.length || 0;
    const wat = list?.items.filter(i => i.watched).length || 0;
    return { total, wat, unw: total - wat };
  }, [list]);

  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('view', view); }, [view]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('watchedFilter', watchedFilter); }, [watchedFilter]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('sortBy', sortBy); }, [sortBy]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = input.trim();
    if(title) add({ title });
  };

  const onSelectSuggestion = (s: Suggestion) => {
    add({ title: s.title, poster: s.poster, releaseYear: s.year ? Number(s.year) : undefined });
  };

  const manualSync = async () => {
    if(!list) return;
    try{
      const fresh = await api<List>(`/api/lists/${list.id}`);
      setList(fresh);
      setLastSynced(Date.now());
    }catch(e:any){ setError(parseErr(e)); }
  };

  return (
    <div className="wrap">
      <h1 className="title">Watchlists</h1>
      {error && <div className="error">{error}</div>}

      {/* Add form */}
      <form className="add" onSubmit={onSubmit}>
        <div className="inputWrap">
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setShowSuggest(true); }}
            placeholder="Add a movie or show…"
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
          />
          <button type="submit" className="iconBtn"><Plus size={18} /></button>
        </div>
        {showSuggest && suggestions.length > 0 && (
          <div className="suggestMenu">
            {suggestions.map(s => (
              <button key={s.id} type="button" className="suggestItem" onMouseDown={() => onSelectSuggestion(s)}>
                {s.poster && <img src={s.poster} alt="" width={32} height={48} />}
                <div className="suggestMeta">
                  <div className="suggestTitle">{s.title}</div>
                  {s.year && <div className="suggestYear">{s.year}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Filter row */}
      <div className="filters">
        <div className="chipRow">
          <button className={`chip ${watchedFilter==='all'?'active':''}`} onClick={() => setWatchedFilter('all')}>All</button>
          <button className={`chip ${watchedFilter==='unwatched'?'active':''}`} onClick={() => setWatchedFilter('unwatched')}>Unwatched</button>
          <button className={`chip ${watchedFilter==='watched'?'active':''}`} onClick={() => setWatchedFilter('watched')}>Watched</button>
        </div>
        <div className="rightControls">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="added">Sort: Date added</option>
            <option value="release">Sort: Release year</option>
          </select>
          <div className="viewToggles">
            <button className={`iconBtn ${view==='list'?'active':''}`} onClick={() => setView('list')} title="List view"><ListIcon size={18}/></button>
            <button className={`iconBtn ${view==='grid'?'active':''}`} onClick={() => setView('grid')} title="Grid view"><LayoutGrid size={18}/></button>
          </div>
          <button className="iconBtn" onClick={manualSync} title="Sync"><RefreshCw size={18}/></button>
        </div>
      </div>

      {/* Items */}
      {!list ? (
        <div className="loading">Loading…</div>
      ) : (
        <>
          <div className="stats">
            <span className="sub">Total: {stats.total}</span>
            <span className="sep" />
            <span className="sub">Watched: {stats.wat}</span>
            <span className="sep" />
            <span className="sub">Unwatched: {stats.unw}</span>
          </div>

          <div className={view === 'grid' ? 'grid' : 'list'}>
            {filtered.map(item => (
              <div key={item.id} className={view==='grid'?'card':'row'}>
                {item.poster ? (
                  <img className="poster" src={item.poster} alt="" width={view==='grid'?160:48} height={view==='grid'?240:72} />
                ) : (
                  <div className={view==='grid'?'poster placeholder':'poster placeholder small'} />
                )}
                <div className="meta">
                  <div className="titleRow">
                    <div className="itemTitle">{item.title}</div>
                    {item.releaseYear && <div className="year">{item.releaseYear}</div>}
                  </div>
                  <div className="subRow">
                    <span className="sub">{new Date(item.createdAt).toLocaleTimeString([], timeOpts)}</span>
                    {item.addedBy && <><span className="sep" /><span className="sub">by {item.addedBy}</span></>}
                  </div>
                </div>
                <div className="actions">
                  <button className="iconBtn" onClick={() => toggle(item.id, !item.watched)} title={item.watched?'Mark unwatched':'Mark watched'}>
                    {item.watched ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                  <button className="iconBtn danger" onClick={() => remove(item.id)} title="Remove"><Trash2 size={18}/></button>
                </div>
              </div>
            ))}
          </div>

          <div className="footer">
            <span className="badge">list: <span className="copy">{list.id}</span></span>
            <div className="sep" />
            <span className="sub">Updated: {new Date(list.updatedAt).toLocaleTimeString([], timeOpts)}</span>
            {lastSynced && <span className="sub" style={{marginLeft:8}}>Synced: {new Date(lastSynced).toLocaleTimeString([], timeOpts)}</span>}
            <div className="spacer" />
            {shareUrl && (
              <button className="iconBtn" onClick={() => navigator.clipboard.writeText(shareUrl)} title="Copy share link">
                <Share2 size={18}/>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function parseErr(e: any){
  try{ const j = JSON.parse(String(e?.message ?? e)); return j.error || String(e); }catch{ return String(e?.message ?? e); }
}