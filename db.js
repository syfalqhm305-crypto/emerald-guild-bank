const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const db = new Database(path.join(__dirname, 'guild.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS guild_info (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  guild_name TEXT, bank_name TEXT, tagline TEXT, currency TEXT,
  admin_name TEXT, admin_phone TEXT
);
CREATE TABLE IF NOT EXISTS leaders (
  id TEXT PRIMARY KEY, name TEXT, role TEXT, phone TEXT
);
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY, name TEXT, title TEXT,
  balance INTEGER DEFAULT 0, total_earnings INTEGER DEFAULT 0,
  prizes INTEGER DEFAULT 0, points INTEGER DEFAULT 0,
  level_progress INTEGER DEFAULT 0, level_target INTEGER DEFAULT 5000,
  role TEXT DEFAULT 'member', color TEXT
);
CREATE TABLE IF NOT EXISTS store_items (
  id TEXT PRIMARY KEY, name TEXT, price INTEGER, icon TEXT, desc TEXT
);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY, member_id TEXT, type TEXT, label TEXT, amount INTEGER, date TEXT
);
`);

const AVATAR_COLORS = ['#34d9a0','#6aa6ff','#ffb454','#ff7d94','#c58bff','#5be0c9'];

function seed(){
  const now = Date.now();
  const iso = hoursAgo => new Date(now - hoursAgo * 3600 * 1000).toISOString();

  db.prepare(`INSERT INTO guild_info (id,guild_name,bank_name,tagline,currency,admin_name,admin_phone)
    VALUES (1,?,?,?,?,?,?)`).run(
    'نقابة الزمرد', 'EMERALD BANK', 'ثروتك، تحت حماية الزمرد', 'EMD', 'المسؤول العام', '+966500000000'
  );

  const leaders = [
    ['Yuzoriha', 'قائد النقابة', '+966500000001'],
    ['Isagi', 'نائب القائد', '+966500000002'],
    ['Misi', 'مسؤول المالية', '+966500000003'],
  ];
  const insLeader = db.prepare('INSERT INTO leaders (id,name,role,phone) VALUES (?,?,?,?)');
  leaders.forEach(([name,role,phone]) => insLeader.run(randomUUID(), name, role, phone));

  const members = [
    {id:'m1', name:'Yuzoriha', title:'ليدي أميرالد', balance:12450, totalEarnings:3200, prizes:5, points:8750, levelProgress:6750, levelTarget:10000, role:'owner'},
    {id:'m2', name:'Isagi', title:'فارس الزمرد', balance:9820, totalEarnings:2100, prizes:3, points:6200, levelProgress:4200, levelTarget:8000, role:'leader'},
    {id:'m3', name:'Misi', title:'عضو نشيط', balance:7450, totalEarnings:1500, prizes:2, points:4100, levelProgress:2100, levelTarget:6000, role:'leader'},
    {id:'m4', name:'Rin', title:'عضو', balance:6300, totalEarnings:900, prizes:1, points:3000, levelProgress:1300, levelTarget:6000, role:'member'},
    {id:'m5', name:'Athi', title:'عضو', balance:5980, totalEarnings:700, prizes:1, points:2500, levelProgress:980, levelTarget:6000, role:'member'},
  ];
  const insMember = db.prepare(`INSERT INTO members
    (id,name,title,balance,total_earnings,prizes,points,level_progress,level_target,role,color)
    VALUES (@id,@name,@title,@balance,@totalEarnings,@prizes,@points,@levelProgress,@levelTarget,@role,@color)`);
  members.forEach((m,i) => insMember.run({...m, color: AVATAR_COLORS[i % AVATAR_COLORS.length]}));

  const store = [
    ['رتبة فارس مميزة', 200, '👑', 'رتبة خاصة تظهر بجانب اسمك في النقابة'],
    ['إطار صورة ذهبي', 350, '🖼️', 'إطار مميز لصورتك الشخصية'],
    ['لقب حصري', 500, '🏷️', 'لقب مخصص تختاره بنفسك'],
    ['دعوة صديق VIP', 150, '✉️', 'دعوة مميزة لصديق للانضمام للنقابة'],
    ['بطاقة هدية', 1000, '🎁', 'بطاقة هدية داخل النقابة'],
    ['شارة نشاط', 100, '⭐', 'شارة تظهر بجانب اسمك تدل على نشاطك'],
  ];
  const insStore = db.prepare('INSERT INTO store_items (id,name,price,icon,desc) VALUES (?,?,?,?,?)');
  store.forEach(([name,price,icon,desc]) => insStore.run(randomUUID(), name, price, icon, desc));

  const tx = [
    ['m1','in','جائزة مسابقة',500, iso(3)],
    ['m1','out','شراء رتبة',200, iso(21)],
    ['m1','in','مكافأة نشاط',1000, iso(52)],
    ['m1','in','مساعدة من عضو',300, iso(76)],
    ['m2','in','جائزة مسابقة',400, iso(30)],
    ['m3','in','مكافأة نشاط',250, iso(60)],
  ];
  const insTx = db.prepare('INSERT INTO transactions (id,member_id,type,label,amount,date) VALUES (?,?,?,?,?,?)');
  tx.forEach(([memberId,type,label,amount,date]) => insTx.run(randomUUID(), memberId, type, label, amount, date));
}

function seedIfEmpty(){
  const hasInfo = db.prepare('SELECT COUNT(*) c FROM guild_info').get().c;
  if(!hasInfo) seed();
}
seedIfEmpty();

module.exports = { db, seed };
