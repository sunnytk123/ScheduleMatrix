function parseTietStr(str) {
  const s = str.trim();
  const tiets = [];
  for (let i = 0; i < Math.min(s.length, 16); i++) {
    if (s[i] !== '-' && s[i] !== ' ') tiets.push(i + 1);
  }
  return tiets;
}

function parseWeekStr(str) {
  const s = str.trim();
  const weeks = [];
  for (let i = 0; i < Math.min(s.length, 40); i++) {
    if (s[i] !== '-' && s[i] !== ' ') weeks.push(i + 1);
  }
  return weeks;
}

function parseDay(str) {
  const m = str.match(/Th[uứ]\s*(\d+|CN)/i);
  if (!m) return null;
  const v = m[1].toUpperCase();
  return DAY_MAP[v] || ('T' + v);
}

function parseInput() {
  const raw = document.getElementById('raw-input').value;
  if (!raw.trim()) { toast('Chưa có dữ liệu.', 'err'); return; }

  const lines = raw.split('\n').map(l => l.trimEnd());
  const newCourses = [];
  const CODE_RE = /^([A-Z]{1,5}\d{3,6}|[A-Z]\d{5}|\d{6}|[A-Z]{1,8}\d{2,8})$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const parts = line.split('\t').map(s => s.trim());

    // Tìm cột maMH: chuỗi có dạng mã môn, cột kế là tên (không phải số thuần)
    let idx = -1;
    for (let j = 0; j < parts.length - 3; j++) {
      if (CODE_RE.test(parts[j]) && parts[j+1] && !/^\d+$/.test(parts[j+1]) && parts[j+1].length > 2) {
        idx = j; break;
      }
    }
    if (idx < 0 || parts.length < idx + 5) continue;

    const maMH = parts[idx];
    const ten  = parts[idx+1];
    const tc   = parseInt(parts[idx+2]) || 0;
    const nhom = parts[idx+3];
    // idx+4 = SL/Max, idx+5 = DK, idx+6... = sched
    const dayEntries = [];

    // Thu thập tất cả dòng lịch của nhóm này
    const schedLines = [];
    const firstSched = parts.slice(idx + 6).join('\t').trim();
    if (firstSched) schedLines.push(firstSched);

    let j = i + 1;
    while (j < lines.length) {
      const nl = lines[j].trim();
      if (!nl) { j++; continue; }
      const np = nl.split('\t').map(s => s.trim());
      // Dừng nếu có mã môn mới
      let hasCode = false;
      for (let k = 0; k < np.length - 1; k++) {
        if (CODE_RE.test(np[k]) && np[k+1] && !/^\d+$/.test(np[k+1]) && np[k+1].length > 2) { hasCode = true; break; }
      }
      if (hasCode) break;
      // Tiếp tục nếu có dạng lịch (có dấu gạch ngang dài hoặc chứa "Thứ")
      if (nl.includes('Thứ') || nl.includes('Thu') || /^[-0-9A-Za-z,\s]{5,}/.test(nl)) {
        schedLines.push(nl); j++;
      } else break;
    }
    i = j - 1;

    // Parse từng dòng lịch
    for (const sl of schedLines) {
      const segs = sl.split(',');
      if (segs.length < 2) continue;
      const tietPart = segs[0].trim();
      const dayPart  = segs[1].trim();
      const weekPart = segs.length >= 4 ? segs[3].trim() : (segs[2]?.trim() || '');

      const tiets = parseTietStr(tietPart);
      const day   = parseDay(dayPart);
      const weeks = parseWeekStr(weekPart);
      if (!day || !tiets.length) continue;

      // Nhóm tiết → Ca
      const caSet = {};
      tiets.forEach(t => {
        const ca = tietToCa(t);
        if (ca && !caSet[ca.name]) caSet[ca.name] = ca;
      });
      Object.values(caSet).forEach(ca => {
        dayEntries.push({ day, caName: ca.name, caTime: ca.time, weeks });
      });
    }

    if (!maMH || !ten) continue;
    const existing = newCourses.find(c => c.maMH === maMH && c.nhom === nhom);
    if (existing) { existing.days.push(...dayEntries); }
    else { newCourses.push({ id: uid(), maMH, ten, tc, nhom, days: dayEntries }); }
  }

  if (!newCourses.length) { toast('Không phân tích được. Kiểm tra định dạng.', 'err'); return; }

  let added = 0;
  newCourses.forEach(nc => {
    if (!courses.find(c => c.maMH === nc.maMH && c.nhom === nc.nhom)) {
      courses.push(nc); added++;
    }
  });

  renderAll();
  toast(`Đã phân tích ${newCourses.length} nhóm (${added} mới thêm).`);
}

function parseManualWeeks(str) {
  const ws=new Set();
  str.split(',').forEach(seg=>{
    seg=seg.trim();
    const r=seg.match(/^(\d+)-(\d+)$/);
    if(r){for(let w=+r[1];w<=+r[2];w++)ws.add(w);}
    else if(/^\d+$/.test(seg))ws.add(+seg);
  });
  return [...ws].sort((a,b)=>a-b);
}

window.parseInput = parseInput;
window.parseDay = parseDay;
window.parseWeekStr = parseWeekStr;
window.parseTietStr = parseTietStr;
window.parseManualWeeks = parseManualWeeks;