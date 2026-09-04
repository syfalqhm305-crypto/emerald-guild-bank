/* =========================================================
   API layer — talks to the real backend (see /server).
   Leave API_BASE empty ('') if you serve the frontend from the
   SAME Express server (recommended, simplest — just run the
   server and open its URL). If you host the frontend somewhere
   else (GitHub Pages, Netlify, etc.) set API_BASE to your
   deployed backend's full URL, e.g.:
   const API_BASE = 'https://your-backend.onrender.com';
   ========================================================= */
const API_BASE = '';

async function apiGet(path){
  const res = await fetch(API_BASE + path);
  if(!res.ok) throw await apiError(res);
  return res.json();
}
async function apiSend(method, path, body){
  const res = await fetch(API_BASE + path, {
    method,
    headers: {'Content-Type': 'application/json'},
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if(!res.ok) throw await apiError(res);
  return res.json();
}
async function apiError(res){
  try{
    const j = await res.json();
    return new Error(j.error || ('خطأ في الخادم (' + res.status + ')'));
  }catch(e){
    return new Error('تعذر الاتصال بالخادم (' + res.status + ')');
  }
}

const Api = {
  getState:       ()                          => apiGet('/api/state'),
  updateInfo:     (info)                       => apiSend('PUT',    '/api/info', info),
  addLeader:      (leader)                     => apiSend('POST',   '/api/leaders', leader),
  removeLeader:   (id)                         => apiSend('DELETE', '/api/leaders/' + encodeURIComponent(id)),
  addMember:      (member)                     => apiSend('POST',   '/api/members', member),
  adjustMember:   (id, payload)                => apiSend('POST',   '/api/members/' + encodeURIComponent(id) + '/adjust', payload),
  addStoreItem:   (item)                       => apiSend('POST',   '/api/store', item),
  removeStoreItem:(id)                         => apiSend('DELETE', '/api/store/' + encodeURIComponent(id)),
  purchase:       (memberId, items)            => apiSend('POST',   '/api/store/purchase', {memberId, items}),
  transfer:       (fromId, toId, amount, note) => apiSend('POST',   '/api/transfer', {fromId, toId, amount, note}),
  grantPrize:     (memberId, label, amount)    => apiSend('POST',   '/api/prizes', {memberId, label, amount}),
  resetData:      ()                           => apiSend('POST',   '/api/reset'),
};
