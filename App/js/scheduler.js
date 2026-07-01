function buildSchedTable() {
  const tbl = document.getElementById('sched-tbl');
  if (!tbl) return;
  document.getElementById('wk-label').textContent = `Tuần ${curWeek}`;

  let html = `<div class="ghd">Ca</div>`;
  DAYS.forEach(d => html += `<div class="ghd dc">${d}</div>`);

  CA_DEF.forEach(ca => {
    html += `<div class="time-hd">${ca.name}<span style="font-size:7px;opacity:.5">${ca.time}</span></div>`;
    DAYS.forEach(day => {
      const key = `${day}|${ca.name}`;
      html += `<div class="scell" id="cell-${key.replace('|','-')}"></div>`;
    });
  });
  tbl.innerHTML = html;

  // Attach drag/click events
  CA_DEF.forEach(ca => {
    DAYS.forEach(day => {
      const key = `${day}|${ca.name}`;
      const cellId = 'cell-' + key.replace('|','-');
      const cell = document.getElementById(cellId);
      if (!cell) return;
      cell.ondragover = e => { e.preventDefault(); cell.classList.add('dh'); };
      cell.ondragleave = () => cell.classList.remove('dh');
      cell.ondrop = e => {
        e.preventDefault(); cell.classList.remove('dh');
        if (dragId2 !== null) { const id=dragId2; dragId2=null; moveSubjectToRight(id); }
      };
      cell.onclick = () => {
        if (selDndId !== null) {
          const id = selDndId;
          selDndId = null;
          moveSubjectToRight(id);
        }
      };
    });
  });

  renderSchedCells();
}

function autoPlaceCourse(courseId) {
  const c = courses.find(x=>x.id===courseId);
  if (!c) return;

  // Xóa placed cũ của cùng môn (toàn bộ nhóm khác của môn này)
  const sameSubjIds = courses.filter(x=>x.maMH===c.maMH).map(x=>x.id);
  Object.keys(placed).forEach(k => {
    placed[k] = (placed[k]||[]).filter(id => !sameSubjIds.includes(id));
    if (!placed[k].length) delete placed[k];
  });

  // Đặt vào tất cả ô theo lịch, chỉ chặn nếu trùng tuần thật sự
  for (const d of c.days) {
    const key = `${d.day}|${d.caName}`;
    const occupants = placed[key] || [];
    const conflictOcc = occupants.map(id => courses.find(x=>x.id===id)).find(occ => {
      if (!occ) return false;
      const occDe = occ.days.find(od=>od.day===d.day && od.caName===d.caName);
      const occWeeks = new Set(occDe?.weeks||[]);
      return (d.weeks||[]).some(w=>occWeeks.has(w));
    });
    if (conflictOcc) {
      toast(`Trùng ${d.day} ${d.caName} (tuần chung) với ${conflictOcc.maMH} Nh.${conflictOcc.nhom}! Không thể xếp.`,'err');
      continue;
    }
    if (!placed[key]) placed[key] = [];
    if (!placed[key].includes(courseId)) placed[key].push(courseId);
  }
}

function selectDnd(id) {
  if (selDndId === id) {
    // Nếu click lại: chuyển sang cột phải
    moveSubjectToRight(id);
    selDndId = null;
  } else {
    selDndId = id;
    renderSidebar();
    toast('Click lại để chuyển môn này sang cột Nhóm đã chọn, hoặc click ô lịch.','warn');
  }
}

function moveSubjectToRight(courseId) {
  const c = courses.find(x=>x.id===courseId);
  if (!c) return;
  movedSubjects.add(c.maMH);
  activeNhomId = courseId;
  activeSub = c.maMH;
  // Tự động đặt vào lịch theo lịch của nhóm đó
  autoPlaceCourse(courseId);
  buildSchedTable();
  renderSidebar();
  renderChosenPanel();
  updateHeader();
}

function removePlaced(maMH) {
  // Gỡ tất cả slot của môn này
  Object.keys(placed).forEach(k => {
    placed[k] = (placed[k]||[]).filter(id => {
      const c = courses.find(x=>x.id===id);
      return !(c && c.maMH===maMH);
    });
    if (!placed[k].length) delete placed[k];
  });
  movedSubjects.delete(maMH);
  if (activeSub===maMH) { activeSub=null; activeNhomId=null; }
  buildSchedTable();
  renderSidebar();
  renderChosenPanel();
  updateHeader();
  toast(`Đã gỡ ${maMH} khỏi lịch.`,'warn');
}

function onDragStart(e, id) {
  dragId2 = id;
  e.dataTransfer.effectAllowed = 'copy';
  document.getElementById('sc-'+id)?.classList.add('dragging');
}

function onDragEnd(e, id) {
  dragId2 = null;
  document.getElementById('sc-'+id)?.classList.remove('dragging');
}

function changeWeek(d) {
  curWeek = Math.max(1, Math.min(40, curWeek + d));
  buildSchedTable();
}

function clearAllPlaced() {
  placed = {}; movedSubjects = new Set(); activeSub=null; activeNhomId=null;
  buildSchedTable(); renderSidebar(); renderChosenPanel(); updateHeader();
  toast('Đã xóa toàn bộ lịch.','warn');
}

window.buildSchedTable = buildSchedTable;
window.autoPlaceCourse = autoPlaceCourse;

window.selectDnd = selectDnd;
window.moveSubjectToRight = moveSubjectToRight;
window.removePlaced = removePlaced;

window.onDragStart = onDragStart;
window.onDragEnd = onDragEnd;