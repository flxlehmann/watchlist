/* Watchlist v6 — Vercel (Upstash Redis) + Custom Autocomplete (iTunes) */

// ---------- Config ----------
const API = {
  roomUrl: (id)=> `/api/rooms/${encodeURIComponent(id)}`
};

// ---------- State ----------
let items = loadLocal() || [];
let room = '';
let version = 0;
let pollingTimer = null;

// ---------- DOM ----------
const listEl = document.getElementById('list');
const emptyEl = document.getElementById('emptyState');
const addForm = document.getElementById('addForm');
const titleInput = document.getElementById('titleInput');
const showWatched = document.getElementById('showWatched');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const clearAllBtn = document.getElementById('clearAllBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn  = document.getElementById('joinRoomBtn');
const roomIdInput  = document.getElementById('roomIdInput');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const roomShare = document.getElementById('roomShare');
const syncNowBtn = document.getElementById('syncNowBtn');
const connInfo   = document.getElementById('connInfo');
const diagEl     = document.getElementById('diag');
const acList     = document.getElementById('acList');

const qs = new URLSearchParams(location.search);
const prefilledRoom = (qs.get('room')||'').trim();
if (prefilledRoom) roomIdInput.value = prefilledRoom;

// ---------- Helpers ----------
function uid(){ return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4); }
function saveLocal(){ localStorage.setItem('watchlist.v1', JSON.stringify(items)); }
function loadLocal(){ try{ return JSON.parse(localStorage.getItem('watchlist.v1')||'[]'); }catch(e){ return []; } }

function setStatus(text, connected=false){
  statusDot.className = 'dot ' + (connected ? 'green' : 'gray');
  statusText.textContent = text;
}

function setShareLink(){
  if (!room){ roomShare.innerHTML = ''; return; }
  const url = new URL(location.href);
  url.searchParams.set('room', room);
  roomShare.innerHTML = `Share: <a href="${url.toString()}" target="_blank" rel="noopener">${url.toString()}</a>`;
}

function humanId(){
  const words = ["mint","otter","hazel","maple","violet","raven","cobalt","prairie","lotus","ember","willow","fjord","pepper","orchid","tulip","bamboo","pebble","saffron","cloud","teal","yuzu","quartz","valley","glacier"];
  const w1 = words[Math.floor(Math.random()*words.length)];
  const w2 = words[Math.floor(Math.random()*words.length)];
  const n  = Math.floor(Math.random()*90)+10;
  return `${w1}-${w2}-${n}`;
}

function sanitizeRoomId(id){
  id = (id||'').trim().toLowerCase().replace(/[^a-z0-9-_]+/g,'-').replace(/^-+|-+$/g,'');
  return id || humanId();
}

function logDiag(msg){ console.log('[diag]', msg); if (diagEl) diagEl.textContent = ' | ' + msg; }

function sortItems(arr){
  const mode = sortSelect.value;
  const copy = [...arr];
  if (mode === 'title') copy.sort((a,b)=>a.title.localeCompare(b.title));
  else if (mode === 'rating') copy.sort((a,b)=> (b.rating||0)-(a.rating||0));
  else if (mode === 'watched') copy.sort((a,b)=> (a.watched===b.watched?0:(a.watched?1:-1)));
  else copy.sort((a,b)=> (b.addedAt||0)-(a.addedAt||0));
  return copy;
}

function filteredItems(){
  const showW = showWatched.checked;
  const q = searchInput.value.trim().toLowerCase();
  return sortItems(items).filter(it=>{
    const okW = showW || !it.watched;
    const okQ = !q || it.title.toLowerCase().includes(q);
    return okW && okQ;
  });
}

// ---------- Autocomplete (Custom, iTunes) ----------
let acIndex = -1;
let lastSuggestions = [];
let lastQuery = "";

function toHiRes(url){
  if(!url) return "";
  return url.replace(/\/\d+x\d+bb(?:-\d+)?\.(jpg|png)$/i, "/600x600bb.$1");
}

async function fetchMovieSuggestions(q){
  const url = `https://itunes.apple.com/search?entity=movie&limit=8&term=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  const data = await res.json();
  const results = (data.results || []).map(r=>{
    const raw = r.artworkUrl100 || r.artworkUrl60 || "";
    const hi  = toHiRes(raw);
    const year = r.releaseDate ? new Date(r.releaseDate).getFullYear() : '';
    const title = r.trackName || r.collectionName || r.artistName || 'Untitled';
    return { title, year, posterHi: hi, posterLo: raw, sourceId: String(r.trackId || r.collectionId || ''), source: 'itunes' };
  });
  return results;
}

function renderAc(items){
  acList.innerHTML = '';
  acIndex = -1;
  if (!items.length){
    const div = document.createElement('div');
    div.className = 'ac-empty';
    div.textContent = lastQuery.length < 2 ? 'Type at least 2 letters…' : 'No matches';
    acList.appendChild(div);
    acList.hidden = false;
    return;
  }
  for (const s of items){
    const row = document.createElement('div');
    row.className = 'ac-item';
    const poster = document.createElement('div');
    poster.className = 'ac-poster';
    if (s.posterLo || s.posterHi){
      const img = document.createElement('img');
      img.src = s.posterLo || s.posterHi;
      img.alt = '';
      poster.appendChild(img);
    }
    const text = document.createElement('div');
    const t = document.createElement('div');
    t.className = 'ac-title';
    t.textContent = s.title;
    const sub = document.createElement('div');
    sub.className = 'ac-sub';
    sub.textContent = s.year ? String(s.year) : '';
    text.appendChild(t);
    if (s.year) text.appendChild(sub);

    row.appendChild(poster);
    row.appendChild(text);
    row.addEventListener('mousedown', (e)=>{
      addItemObj(s);
      acList.hidden = true;
      titleInput.value='';
      titleInput.focus();
    });
    acList.appendChild(row);
  }
  acList.hidden = false;
}

const debounce = (fn, ms=220)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

const doSuggest = debounce(async ()=>{
  lastQuery = titleInput.value.trim();
  if (lastQuery.length < 2){ acList.hidden = true; return; }
  try{
    lastSuggestions = await fetchMovieSuggestions(lastQuery);
    renderAc(lastSuggestions);
  }catch(e){
    console.error('Autocomplete fetch failed', e);
    acList.innerHTML = '<div class="ac-empty">Error fetching suggestions</div>';
    acList.hidden = false;
  }
}, 220);

titleInput.addEventListener('input', doSuggest);
titleInput.addEventListener('focus', ()=>{
  if (titleInput.value.trim().length >= 2) doSuggest();
});
titleInput.addEventListener('keydown', (e)=>{
  const rows = Array.from(acList.querySelectorAll('.ac-item'));
  if (e.key === 'ArrowDown'){
    if (acList.hidden){ doSuggest(); return; }
    acIndex = (acIndex + 1) % (rows.length || 1);
    rows.forEach((r,i)=> r.classList.toggle('active', i===acIndex));
    e.preventDefault();
  } else if (e.key === 'ArrowUp'){
    if (acList.hidden){ doSuggest(); return; }
    acIndex = (acIndex - 1 + (rows.length || 1)) % (rows.length || 1);
    rows.forEach((r,i)=> r.classList.toggle('active', i===acIndex));
    e.preventDefault();
  } else if (e.key === 'Enter'){
    if (!acList.hidden && rows.length){
      const pick = rows[Math.max(0, acIndex)];
      if (pick){
        pick.dispatchEvent(new Event('mousedown'));
        e.preventDefault();
      }
    }
  } else if (e.key === 'Escape'){
    acList.hidden = true;
  }
});

document.addEventListener('click', (e)=>{
  if (!acList.contains(e.target) && e.target !== titleInput){
    acList.hidden = true;
  }
});

// ---------- Rendering ----------
function render(){
  saveLocal();
  const data = filteredItems();
  listEl.innerHTML = '';
  emptyEl.style.display = data.length ? 'none' : 'block';

  for (const it of data){
    const li = document.createElement('li');
    li.className = 'item';
    li.dataset.id = it.id;

    const chk = document.createElement('input');
    chk.type='checkbox';
    chk.checked = !!it.watched;
    chk.title = 'Mark watched';
    chk.addEventListener('change', ()=>updateItem(it.id,{watched:chk.checked}));

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const hi = it.posterHi || it.poster || '';
    const lo = it.posterLo || it.poster || '';
    if (hi || lo){
      const img = document.createElement('img');
      img.src = hi || lo;
      img.alt = `${it.title} poster`;
      img.loading = 'lazy';
      img.onerror = ()=>{
        if (img.dataset.triedLo !== '1' && lo && img.src !== lo){
          img.dataset.triedLo = '1';
          img.src = lo;
        } else {
          thumb.innerHTML = '<div class="placeholder">🎞️</div>';
        }
      };
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = '<div class="placeholder">🎞️</div>';
    }

    const meta = document.createElement('div');
    meta.className = 'meta';

    const title = document.createElement('div');
    title.className = 'title'+(it.watched?' watched':'');
    const titleSpan = document.createElement('span');
    titleSpan.textContent = it.title;
    titleSpan.title = 'Double-click to rename';
    titleSpan.addEventListener('dblclick', ()=>{
      const n = prompt('Rename movie:', it.title);
      if (n && n.trim() && n.trim()!==it.title) updateItem(it.id,{title:n.trim()});
    });
    title.appendChild(titleSpan);

    const sub = document.createElement('div');
    sub.className = 'subtle';
    sub.textContent = [it.year, it.source==='itunes' ? 'iTunes' : ''].filter(Boolean).join(' · ');

    meta.appendChild(title);
    if (sub.textContent) meta.appendChild(sub);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const starbar = document.createElement('div');
    starbar.className = 'starbar';
    for (let s=1; s<=5; s++){
      const st = document.createElement('span');
      st.className = 'star' + ((it.rating||0)>=s ? ' filled':'' );
      st.textContent = '★';
      st.setAttribute('role','button');
      st.setAttribute('aria-label',`Rate ${s} star${s>1?'s':''}`);
      st.addEventListener('click', ()=> updateItem(it.id,{rating:s}));
      st.addEventListener('contextmenu', (e)=>{ e.preventDefault(); updateItem(it.id,{rating:0}); });
      starbar.appendChild(st);
    }

    const del = document.createElement('button');
    del.className = 'btn danger outline';
    del.textContent = 'Remove';
    del.addEventListener('click', ()=>{
      if (confirm(`Remove "${it.title}"?`)) removeItem(it.id);
    });

    actions.appendChild(starbar);
    actions.appendChild(del);

    li.appendChild(chk);
    li.appendChild(thumb);
    li.appendChild(meta);
    li.appendChild(actions);
    listEl.appendChild(li);
  }
}

// ---------- CRUD ----------
function addItemObj(obj){
  const newItem = {
    id: uid(),
    title: (obj.title || '').trim() || 'Untitled',
    year: obj.year || '',
    posterHi: obj.posterHi || obj.poster || '',
    posterLo: obj.posterLo || obj.poster || '',
    watched: false,
    rating: 0,
    sourceId: obj.sourceId || '',
    source: obj.source || 'manual',
    addedAt: Date.now()
  };
  items.unshift(newItem);
  render();
  queueServerMutation({op:'add', item:newItem});
}

function removeItem(id){
  items = items.filter(x=>x.id!==id);
  render();
  queueServerMutation({op:'remove', id});
}

function updateItem(id, patch){
  items = items.map(x=> x.id===id ? {...x, ...patch} : x);
  render();
  queueServerMutation({op:'update', id, patch});
}

clearAllBtn.addEventListener('click', ()=>{
  if (!items.length) return;
  if (confirm('Clear the entire list?')) {
    items = [];
    render();
    queueServerMutation({op:'full', items:[]});
  }
});

// ---------- API (polling sync) ----------
async function apiFetch(method, body){
  const url = API.roomUrl(room);
  const res = await fetch(url, {
    method,
    headers: {'Content-Type':'application/json'},
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function pullState(){
  if (!room) return;
  try{
    const data = await apiFetch('GET');
    if (typeof data.version === 'number' && data.version !== version){
      version = data.version;
      items = data.items || [];
      render();
      logDiag(`Pulled v${version}`);
    }
    setStatus(`Room ${room} (v${version})`, true);
  }catch(e){
    logDiag('Pull error: ' + e.message);
    setStatus('Disconnected', false);
  }
}

async function pushMutation(mut){
  if (!room) return;
  try{
    const data = await apiFetch('POST', {mutation: mut, baseVersion: version});
    version = data.version;
    items = data.items || items;
    render();
    logDiag(`Pushed -> v${version}`);
  }catch(e){
    logDiag('Push error: ' + e.message);
  }
}

function queueServerMutation(mut){
  pushMutation(mut);
}

function startPolling(){
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(pullState, 2000);
  pullState();
}

// Manual sync
syncNowBtn.addEventListener('click', pullState);

// ---------- Events ----------
addForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const raw = titleInput.value.trim();
  if (!raw) return;

  const metaList = lastSuggestions;
  let pick = null;
  if (metaList && metaList.length){
    // If the first is exactly equal (case-insensitive), prefer it
    pick = metaList.find(m => m.title.toLowerCase() === raw.toLowerCase()) || metaList[0];
  }
  addItemObj(pick || { title: raw });

  titleInput.value='';
  acList.hidden = true;
  lastSuggestions = [];
  titleInput.focus();
});

showWatched.addEventListener('change', render);
searchInput.addEventListener('input', render);
sortSelect.addEventListener('change', render);

createRoomBtn.addEventListener('click', ()=>{
  room = sanitizeRoomId(roomIdInput.value || humanId());
  roomIdInput.value = room;
  setShareLink();
  setStatus(`Room ${room}`, true);
  startPolling();
});

joinRoomBtn.addEventListener('click', ()=>{
  room = sanitizeRoomId(roomIdInput.value || humanId());
  roomIdInput.value = room;
  setShareLink();
  setStatus(`Room ${room}`, true);
  startPolling();
});

// Auto-join via ?room=
if (prefilledRoom){
  room = sanitizeRoomId(prefilledRoom);
  roomIdInput.value = room;
  setShareLink();
  startPolling();
}else{
  setStatus('Local mode', false);
}

// Initial paint
render();
