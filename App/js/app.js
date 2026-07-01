// ===================== STATE =====================
let courses = [];
// courses[i] = {id, maMH, ten, tc, nhom, days:[{day,caName,caTime,weeks:[]}]}

let chosenSubjects = new Set(); // maMH của môn được chọn ở tab 2
// activeSub: maMH đang "active" trong cột Nhóm đã chọn (để nổi bật)
// activeNhom: id của nhóm đang được highlight trong cột Nhóm đã chọn
let activeSub = null;   // maMH
let activeNhomId = null; // course.id

// placed: key = "day|caName" → courseId
// Mỗi ô lịch chỉ chứa 1 môn
let placed = {};

let curWeek = 1;
let selDndId = null;  // id đang chờ click ô lịch
let dragId = null;
let editingId = null;
let editDayIdx = 0;

// ===================== COLORS =====================
const COLORS = [
  ['#00f2fe','#050b14'],['#7f5af0','#fff'],['#0affb2','#050b14'],
  ['#ff2d78','#fff'],['#ffc93c','#050b14'],['#3a86ff','#fff'],
  ['#f7a440','#050b14'],['#ff6b6b','#fff'],['#c77dff','#050b14'],
  ['#4cc9f0','#050b14'],['#f72585','#fff'],['#b5e48c','#050b14'],
  ['#e63946','#fff'],['#2ec4b6','#050b14'],['#ffbe0b','#050b14'],
  ['#8338ec','#fff'],['#06d6a0','#050b14'],['#ef476f','#fff'],
];
let colorMap = {}; // maMH -> index

function getColor(maMH) {
  if (!(maMH in colorMap)) colorMap[maMH] = Object.keys(colorMap).length % COLORS.length;
  return COLORS[colorMap[maMH]];
}

// ===================== CA =====================
const CA_DEF = [
  {name:'Ca 1', time:'06:50–09:20', tiets:[1,2,3]},
  {name:'Ca 2', time:'09:30–12:00', tiets:[4,5,6]},
  {name:'Ca 3', time:'12:45–15:15', tiets:[7,8,9]},
  {name:'Ca 4', time:'15:25–17:55', tiets:[10,11,12]},
  {name:'Ca 5', time:'18:05–20:35', tiets:[13,14,15]},
];
const DAYS = ['T2','T3','T4','T5','T6','T7','CN'];
const DAY_MAP = {'2':'T2','3':'T3','4':'T4','5':'T5','6':'T6','7':'T7','CN':'CN'};

function tietToCa(t) {
  return CA_DEF.find(ca => ca.tiets.includes(t)) || null;
}

// ===================== PARSE =====================
// Tiet string: "---456----------" → pos 0-based → tiets 1-based
// pos i có char!='-' → tiết i+1


// Week string: "-2345678-0123..." → pos 0-based → week i+1
// pos i có char!='-' → tuần i+1




let _uidCounter = 0;
function uid() { return 'c' + (Date.now()) + '_' + (_uidCounter++); }



function clearAllData() {
  if (!confirm('Xóa toàn bộ dữ liệu môn học và lịch đã xếp?')) return;
  courses = []; chosenSubjects = new Set(); placed = {}; colorMap = {};
  activeSub = null; activeNhomId = null; selDndId = null;
  renderAll();
  toast('Đã xóa.', 'warn');
}

// ===================== RENDER ALL =====================


function allPlacedIds() {
  const s = new Set();
  Object.values(placed).forEach(arr => (arr||[]).forEach(id => s.add(id)));
  return s;
}



// ===================== TAB 1: DANH SÁCH =====================


// Nếu tên môn quá dài (>18 ký tự) -> viết tắt chữ cái đầu mỗi từ, in hoa
function abbreviateName(name, maxLen = 18) {
  if (!name) return '';
  if (name.length <= maxLen) return name;
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.map(w => w[0]).join('').toUpperCase();
  return letters;
}

function weeksToStr(weeks) {
  if (!weeks || !weeks.length) return '—';
  const ranges = []; let s = weeks[0], e = weeks[0];
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i] === e+1) { e = weeks[i]; }
    else { ranges.push(s===e?`${s}`:`${s}-${e}`); s = e = weeks[i]; }
  }
  ranges.push(s===e?`${s}`:`${s}-${e}`);
  return 'W' + ranges.join(',');
}

// Gộp các buổi học cùng Thứ + cùng Tuần lại với nhau, gộp số Ca
// VD: T2 Ca1 W3-W4 và T2 Ca2 W3-W4 -> "T2 Ca 1,2 (W3-W4)"
function groupDaysForDisplay(days) {
  // group key = day + weeksSignature
  const groups = {};
  days.forEach(d => {
    const wSig = (d.weeks||[]).join(',');
    const key = d.day + '||' + wSig;
    if (!groups[key]) groups[key] = { day: d.day, weeks: d.weeks, caNums: [] };
    const caNum = CA_DEF.findIndex(ca => ca.name === d.caName) + 1;
    if (caNum && !groups[key].caNums.includes(caNum)) groups[key].caNums.push(caNum);
  });
  return Object.values(groups).map(g => {
    g.caNums.sort((a,b)=>a-b);
    const caStr = g.caNums.length > 1 ? `Ca ${g.caNums.join(',')}` : `Ca ${g.caNums[0]}`;
    return { day: g.day, caStr, weeksStr: weeksToStr(g.weeks) };
  });
}



// ===================== TAB 2: CHỌN MÔN =====================








// ===================== TAB 3: XẾP LỊCH =====================


// --- Kiểm tra conflict: một nhóm (id) có bị trùng tuần+thứ+ca với nhóm khác đã xếp không ---
function conflictWith(courseId) {
  const c = courses.find(x=>x.id===courseId);
  if (!c) return null;
  for (const d of c.days) {
    const key = `${d.day}|${d.caName}`;
    const occupants = placed[key] || [];
    for (const occupantId of occupants) {
      if (occupantId === courseId) continue;
      const occ = courses.find(x=>x.id===occupantId);
      if (!occ) continue;
      // Chỉ là conflict thật nếu trùng ít nhất 1 tuần
      const occDe = occ.days.find(od=>od.day===d.day && od.caName===d.caName);
      const occWeeks = new Set(occDe?.weeks || []);
      const overlap = (d.weeks||[]).some(w => occWeeks.has(w));
      if (overlap) return `${occ.maMH} Nh.${occ.nhom}`;
    }
  }
  return null;
}

// Nhóm nào của cùng môn đang được đặt vào lịch (có trong placed)?
function getPlacedNhomForSubj(maMH) {
  const ids = courses.filter(c=>c.maMH===maMH).map(c=>c.id);
  const placedSet = allPlacedIds();
  return ids.find(id => placedSet.has(id)) || null;
}





// movedSubjects: Set của maMH đã được kéo sang cột phải
let movedSubjects = new Set();

// Kéo một nhóm (id) → toàn bộ môn đó nhảy sang cột phải, nổi bật nhóm đó


function setActiveNhom(courseId, ma) {
  activeNhomId = courseId;
  activeSub = ma;
  autoPlaceCourse(courseId);
  buildSchedTable();
  renderChosenPanel();
  renderSidebar();
  updateHeader();
}

// Tự động đặt nhóm vào tất cả ô lịch tương ứng
// placed[key] = mảng các courseId (cho phép nhiều môn khác tuần cùng ô)


// ===================== DRAG & DROP =====================
let dragId2 = null;






// ===================== SCHEDULE TABLE =====================










// ===================== EDIT / ADD MODAL =====================




function addEditDay(ex) {
  const idx = editDayIdx++;
  const w = document.getElementById('edit-days-wrap');
  const d2 = document.createElement('div');
  d2.id=`edd-${idx}`;
  d2.style.cssText='display:grid;grid-template-columns:85px 130px 1fr 28px;gap:6px;margin-bottom:6px;align-items:end';
  d2.innerHTML=`
    <div class="fg"><label class="fl">Thứ</label>
      <select id="edd-${idx}-d">${DAYS.map(d=>`<option ${ex?.day===d?'selected':''}>${d}</option>`).join('')}</select></div>
    <div class="fg"><label class="fl">Ca</label>
      <select id="edd-${idx}-ca">${CA_DEF.map(ca=>`<option value="${ca.name}" ${ex?.caName===ca.name?'selected':''}>${ca.name} ${ca.time}</option>`).join('')}</select></div>
    <div class="fg"><label class="fl">Tuần (VD: 1,2,3-10)</label>
      <input id="edd-${idx}-w" placeholder="2-8,10-13" value="${ex?weeksManual(ex.weeks):''}"/></div>
    <button class="btn btn-d btn-sm" style="padding:6px 8px;align-self:flex-end" onclick="document.getElementById('edd-${idx}').remove()">✕</button>`;
  w.appendChild(d2);
}

function weeksManual(weeks) {
  if (!weeks||!weeks.length) return '';
  const r=[]; let s=weeks[0],e=weeks[0];
  for (let i=1;i<weeks.length;i++){if(weeks[i]===e+1){e=weeks[i];}else{r.push(s===e?`${s}`:`${s}-${e}`);s=e=weeks[i];}}
  r.push(s===e?`${s}`:`${s}-${e}`);
  return r.join(',');
}



function saveEdit() {
  const maMH=document.getElementById('em-ma').value.trim().toUpperCase();
  const ten=document.getElementById('em-ten').value.trim();
  const tc=parseInt(document.getElementById('em-tc').value)||0;
  const nhom=document.getElementById('em-nhom').value.trim();
  if (!maMH||!ten||!nhom) {toast('Điền đủ Mã MH, Tên, Nhóm.','err');return;}

  const days=[];
  document.querySelectorAll('[id^="edd-"][id$="-d"]').forEach(sel=>{
    const base=sel.id.replace('-d','');
    const ca=CA_DEF.find(c=>c.name===document.getElementById(base+'-ca').value);
    const wks=parseManualWeeks(document.getElementById(base+'-w').value);
    days.push({day:sel.value,caName:ca?.name||'Ca 1',caTime:ca?.time||'',weeks:wks});
  });

  if (editingId!==null) {
    const c=courses.find(x=>x.id===editingId);
    if(c){c.maMH=maMH;c.ten=ten;c.tc=tc;c.nhom=nhom;c.days=days;}
  } else {
    if(courses.find(c=>c.maMH===maMH&&c.nhom===nhom)){toast(`${maMH} Nhóm ${nhom} đã tồn tại.`,'err');return;}
    courses.push({id:uid(),maMH,ten,tc,nhom,days});
  }
  closeModal('edit-modal');
  renderAll();
  toast(editingId?'Đã cập nhật.':'Đã thêm môn.');
  editingId=null;
}



// ===================== TABS =====================


// ===================== TOAST =====================
let _tt=null;
function toast(msg,type=''){
  const el=document.getElementById('toast');
  el.textContent=msg; el.className='toast on'+(type?' '+type:'');
  if(_tt)clearTimeout(_tt);
  _tt=setTimeout(()=>el.classList.remove('on'),3000);
}

// ===================== INIT =====================
buildSchedTable();