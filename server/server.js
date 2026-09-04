require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { randomUUID } = require('crypto');
const { db, seed } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

/* Serve the frontend (index.html, css/, js/) from the project root.
   Only these specific paths are exposed — the server/ folder itself is not. */
const ROOT = path.join(__dirname, '..');
app.use('/css', express.static(path.join(ROOT, 'css')));
app.use('/js', express.static(path.join(ROOT, 'js')));
app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));

/* ---------- helpers ---------- */
function getState(){
  const info = db.prepare('SELECT * FROM guild_info WHERE id=1').get();
  const leaders = db.prepare('SELECT * FROM leaders').all();
  const members = db.prepare('SELECT * FROM members').all();
  const store = db.prepare('SELECT * FROM store_items').all();
  const transactions = db.prepare('SELECT * FROM transactions ORDER BY date DESC').all();
  return {
    info: info ? {
      guildName: info.guild_name, bankName: info.bank_name, tagline: info.tagline,
      currency: info.currency, adminName: info.admin_name, adminPhone: info.admin_phone
    } : {},
    leaders,
    members: members.map(m => ({
      id:m.id, name:m.name, title:m.title, balance:m.balance, totalEarnings:m.total_earnings,
      prizes:m.prizes, points:m.points, levelProgress:m.level_progress, levelTarget:m.level_target,
      role:m.role, color:m.color
    })),
    store: store.map(s => ({id:s.id, name:s.name, price:s.price, icon:s.icon, desc:s.desc})),
    transactions: transactions.map(t => ({id:t.id, memberId:t.member_id, type:t.type, label:t.label, amount:t.amount, date:t.date}))
  };
}
function getMember(id){ return db.prepare('SELECT * FROM members WHERE id=?').get(id); }

/* ---------- routes ---------- */
app.get('/api/state', (req, res) => {
  res.json(getState());
});

app.put('/api/info', (req, res) => {
  const {guildName, bankName, tagline, currency, adminName, adminPhone} = req.body || {};
  db.prepare(`UPDATE guild_info SET guild_name=?, bank_name=?, tagline=?, currency=?, admin_name=?, admin_phone=? WHERE id=1`)
    .run(guildName || '', bankName || '', tagline || '', currency || 'EMD', adminName || '', adminPhone || '');
  res.json(getState());
});

app.post('/api/leaders', (req, res) => {
  const {name, role, phone} = req.body || {};
  if(!name || !phone) return res.status(400).json({error:'الاسم ورقم الجوال مطلوبان'});
  db.prepare('INSERT INTO leaders (id,name,role,phone) VALUES (?,?,?,?)').run(randomUUID(), name, role || 'قائد', phone);
  res.json(getState());
});
app.delete('/api/leaders/:id', (req, res) => {
  db.prepare('DELETE FROM leaders WHERE id=?').run(req.params.id);
  res.json(getState());
});

app.post('/api/members', (req, res) => {
  const {name} = req.body || {};
  if(!name) return res.status(400).json({error:'الاسم مطلوب'});
  const colors = ['#34d9a0','#6aa6ff','#ffb454','#ff7d94','#c58bff','#5be0c9'];
  const count = db.prepare('SELECT COUNT(*) c FROM members').get().c;
  db.prepare(`INSERT INTO members (id,name,title,balance,total_earnings,prizes,points,level_progress,level_target,role,color)
    VALUES (?,?,?,0,0,0,0,0,5000,'member',?)`).run(randomUUID(), name, 'عضو جديد', colors[count % colors.length]);
  res.json(getState());
});

app.post('/api/members/:id/adjust', (req, res) => {
  const {type, amount, reason} = req.body || {};
  const amt = Number(amount);
  if(!amt || amt <= 0) return res.status(400).json({error:'مبلغ غير صالح'});
  const member = getMember(req.params.id);
  if(!member) return res.status(404).json({error:'العضو غير موجود'});
  if(type === 'out' && member.balance < amt) return res.status(400).json({error:'الرصيد غير كافٍ'});
  const delta = type === 'in' ? amt : -amt;
  const run = db.transaction(() => {
    db.prepare('UPDATE members SET balance = balance + ?, total_earnings = total_earnings + ? WHERE id=?')
      .run(delta, type === 'in' ? amt : 0, member.id);
    db.prepare('INSERT INTO transactions (id,member_id,type,label,amount,date) VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), member.id, type, reason || 'تعديل إداري', amt, new Date().toISOString());
  });
  run();
  res.json(getState());
});

app.post('/api/store', (req, res) => {
  const {name, price, icon, desc} = req.body || {};
  const p = Number(price);
  if(!name || !p || p <= 0) return res.status(400).json({error:'بيانات المنتج غير مكتملة'});
  db.prepare('INSERT INTO store_items (id,name,price,icon,desc) VALUES (?,?,?,?,?)')
    .run(randomUUID(), name, p, icon || '🎁', desc || '');
  res.json(getState());
});
app.delete('/api/store/:id', (req, res) => {
  db.prepare('DELETE FROM store_items WHERE id=?').run(req.params.id);
  res.json(getState());
});

app.post('/api/store/purchase', (req, res) => {
  const {memberId, items} = req.body || {};
  const member = getMember(memberId);
  if(!member) return res.status(404).json({error:'العضو غير موجود'});
  if(!Array.isArray(items) || !items.length) return res.status(400).json({error:'السلة فارغة'});

  let total = 0; const names = [];
  for(const it of items){
    const p = db.prepare('SELECT * FROM store_items WHERE id=?').get(it.id);
    if(!p) return res.status(400).json({error:'منتج غير موجود'});
    const qty = Math.max(1, Number(it.qty) || 1);
    total += p.price * qty;
    names.push(p.name + (qty > 1 ? (' ×' + qty) : ''));
  }
  if(total > member.balance) return res.status(400).json({error:'الرصيد غير كافٍ لإتمام الشراء'});

  const run = db.transaction(() => {
    db.prepare('UPDATE members SET balance = balance - ? WHERE id=?').run(total, memberId);
    db.prepare('INSERT INTO transactions (id,member_id,type,label,amount,date) VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), memberId, 'out', 'شراء: ' + names.join('، '), total, new Date().toISOString());
  });
  run();
  res.json(getState());
});

app.post('/api/transfer', (req, res) => {
  const {fromId, toId, amount, note} = req.body || {};
  const amt = Number(amount);
  if(!amt || amt <= 0) return res.status(400).json({error:'مبلغ غير صالح'});
  if(fromId === toId) return res.status(400).json({error:'لا يمكن التحويل لنفس العضو'});
  const from = getMember(fromId), to = getMember(toId);
  if(!from || !to) return res.status(404).json({error:'عضو غير موجود'});
  if(from.balance < amt) return res.status(400).json({error:'رصيدك غير كافٍ'});

  const now = new Date().toISOString();
  const run = db.transaction(() => {
    db.prepare('UPDATE members SET balance = balance - ? WHERE id=?').run(amt, fromId);
    db.prepare('UPDATE members SET balance = balance + ?, total_earnings = total_earnings + ? WHERE id=?').run(amt, amt, toId);
    db.prepare('INSERT INTO transactions (id,member_id,type,label,amount,date) VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), fromId, 'out', 'تحويل إلى ' + to.name + (note ? (' — ' + note) : ''), amt, now);
    db.prepare('INSERT INTO transactions (id,member_id,type,label,amount,date) VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), toId, 'in', 'تحويل من ' + from.name + (note ? (' — ' + note) : ''), amt, now);
  });
  run();
  res.json(getState());
});

app.post('/api/prizes', (req, res) => {
  const {memberId, label, amount} = req.body || {};
  const amt = Number(amount);
  const member = getMember(memberId);
  if(!member) return res.status(404).json({error:'العضو غير موجود'});
  if(!amt || amt <= 0) return res.status(400).json({error:'قيمة غير صالحة'});
  const run = db.transaction(() => {
    db.prepare('UPDATE members SET balance = balance + ?, total_earnings = total_earnings + ?, prizes = prizes + 1 WHERE id=?')
      .run(amt, amt, memberId);
    db.prepare('INSERT INTO transactions (id,member_id,type,label,amount,date) VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), memberId, 'in', 'جائزة مسابقة: ' + (label || 'مسابقة'), amt, new Date().toISOString());
  });
  run();
  res.json(getState());
});

app.post('/api/reset', (req, res) => {
  db.exec('DELETE FROM leaders; DELETE FROM members; DELETE FROM store_items; DELETE FROM transactions; DELETE FROM guild_info;');
  seed();
  res.json(getState());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Emerald Guild Bank server running on http://localhost:' + PORT));
