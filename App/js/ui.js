function renderAll() {
  renderList();
  renderChooseTab();
  renderDnd();
  updateHeader();
}

function renderList() {
  const wrap = document.getElementById('course-list');
  const leg  = document.getElementById('legend');
  if (!courses.length) {
    wrap.innerHTML = `<div class="empty"><div class="empty-ico">📋</div>Chưa có dữ liệu.</div>`;
    leg.innerHTML = ''; return;
  }

  const uniqMa = [...new Set(courses.map(c=>c.maMH))];
  leg.innerHTML = uniqMa.map(ma => {
    const [bg] = getColor(ma);
    const ten = courses.find(c=>c.maMH===ma)?.ten||ma;
    return `<div class="leg"><div class="leg-dot" style="background:${bg}"></div>${ma} — ${ten.length>22?ten.slice(0,20)+'…':ten}</div>`;
  }).join('');

  const rows = courses.map(c => {
    const [bg] = getColor(c.maMH);
    const dHtml = c.days.map(d => {
      const ws = weeksToStr(d.weeks);
      return `<span style="display:inline-flex;align-items:center;gap:2px;margin:1px 4px 1px 0">
        <span style="padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;background:${bg}18;border:1px solid ${bg}33;color:${bg}">${d.day}</span>
        <span class="ca-tag">${d.caName}</span>
        <span style="font-size:9px;color:var(--violet)">${ws}</span>
      </span>`;
    }).join('');
    return `<tr class="crow">
      <td><span class="cbadge" style="color:${bg};border-color:${bg}33;background:${bg}12">${c.maMH}</span></td>
      <td style="font-weight:700;max-width:200px;font-size:12px">${c.ten}</td>
      <td style="text-align:center"><b style="color:var(--cyan)">${c.tc||'—'}</b></td>
      <td style="font-weight:700">${c.nhom}</td>
      <td>${dHtml||'<span style="color:var(--muted)">—</span>'}</td>
      <td>
        <div class="fr">
          <button class="btn btn-e btn-sm" onclick="openEditModal('${c.id}')">✏ Sửa</button>
          <button class="btn btn-d btn-sm" onclick="deleteCourse('${c.id}')">🗑</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `<table class="ptbl">
    <thead><tr><th>Mã MH</th><th>Tên môn</th><th>TC</th><th>Nhóm</th><th>Lịch học</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderChooseTab() {
  const wrap = document.getElementById('choose-wrap');
  document.getElementById('chosen-count-lbl').textContent = `Đã chọn: ${chosenSubjects.size} môn`;

  const uniqMa = [...new Set(courses.map(c=>c.maMH))];
  if (!uniqMa.length) {
    wrap.innerHTML = `<div class="empty"><div class="empty-ico">☑</div>Chưa có môn học. Nhập dữ liệu ở Tab 1.</div>`;
    return;
  }

  wrap.innerHTML = `<div class="subject-grid">` + uniqMa.map(ma => {
    const [bg] = getColor(ma);
    const ten = courses.find(c=>c.maMH===ma)?.ten||ma;
    const nhomCount = courses.filter(c=>c.maMH===ma).length;
    const isCh = chosenSubjects.has(ma);
    return `<div class="subj-card ${isCh?'chosen':''}" style="border-left-color:${bg}" onclick="toggleSubject('${ma}')">
      ${isCh?'<span class="chosen-tick">✔</span>':''}
      <div class="subj-code" style="color:${bg}">${ma}</div>
      <div class="subj-name">${ten}</div>
      <div class="subj-count">${nhomCount} nhóm</div>
    </div>`;
  }).join('') + `</div>`;
}

function renderDnd() {
  buildSchedTable();
  renderSidebar();
  renderChosenPanel();
}

function renderSidebar() {
  const wrap = document.getElementById('sidebar');
  // Chỉ hiện môn đã chọn
  const maMHList = [...chosenSubjects];
  if (!maMHList.length) {
    wrap.innerHTML = `<div style="color:var(--muted);font-size:10px;text-align:center;padding:16px">Chọn môn học ở Tab 2 trước.</div>`;
    return;
  }

  // Mỗi thẻ = 1 nhóm, hiển thị tất cả nhóm của các môn đã chọn
  // Nếu môn đã có nhóm được kéo sang cột phải → không còn hiển thị ở đây
  wrap.innerHTML = maMHList.map(ma => {
    const [bg] = getColor(ma);
    const nhoms = courses.filter(c => c.maMH===ma);
    const movedToRight = movedSubjects.has(ma);
    if (movedToRight) return '';

    // Nhóm nào đã được đặt vào lịch (có placed)?
    const placedNhomId = getPlacedNhomForSubj(ma);

    return nhoms.map(c => {
      const conflict = conflictWith(c.id);
      const isOk = !conflict;
      const isSel = selDndId === c.id;
      const grouped = groupDaysForDisplay(c.days);
      const schedStr = grouped.map(g => `${g.day} ${g.caStr} (${g.weeksStr})`).join(' / ') || '—';

      return `<div class="sb-card ${isSel?'active-sel':''}" id="sc-${c.id}"
        style="border-left-color:${bg}"
        draggable="true"
        ondragstart="onDragStart(event,'${c.id}')"
        ondragend="onDragEnd(event,'${c.id}')"
        onclick="selectDnd('${c.id}')">
        ${isOk?'<span class="tick-ok">✔</span>':''}
        <div class="sb-code" style="color:${bg}">${c.maMH} — Nh.${c.nhom}</div>
        <div class="sb-name">${c.ten}</div>
        <div class="sb-meta">${schedStr}</div>
        ${conflict?`<div style="font-size:9px;color:var(--pink);margin-top:2px">⚠ Trùng: ${conflict}</div>`:''}
      </div>`;
    }).join('');
  }).join('');
}

function renderChosenPanel() {
  const wrap = document.getElementById('chosen-panel');
  // Hiện tất cả môn đã active (đã được kéo sang)
  const activeMas = [...chosenSubjects].filter(ma => activeSub === ma || getPlacedNhomForSubj(ma));
  // Thực ra: cột phải hiện tất cả môn mà người dùng đã "drop" (activeSub tracking)
  // Ta dùng mảng movedSubjects để track
  const toShow = [...movedSubjects].filter(ma => chosenSubjects.has(ma));

  if (!toShow.length) {
    wrap.innerHTML = `<div style="color:var(--muted);font-size:10px;text-align:center;padding:16px">Kéo thẻ nhóm từ cột Môn học sang đây.</div>`;
    return;
  }

  wrap.innerHTML = toShow.map(ma => {
    const [bg] = getColor(ma);
    const nhoms = courses.filter(c=>c.maMH===ma);
    const ten = nhoms[0]?.ten || ma;
    const placedId = getPlacedNhomForSubj(ma);

    const nhomRows = nhoms.map(c => {
      const isActive = c.id === activeNhomId;
      const isPlaced = allPlacedIds().has(c.id);
      const grouped = groupDaysForDisplay(c.days);
      const schedStr = grouped.map(g => `${g.day} ${g.caStr} (${g.weeksStr})`).join('<br>') || '—';
      return `<div class="cp-nhom-row ${isActive?'active-nhom':''}" onclick="setActiveNhom('${c.id}','${ma}')">
        <div class="cp-nhom-code" style="color:${bg}">Nhóm ${c.nhom} ${isPlaced?'<span style="color:var(--green);font-size:9px">✔ Đã xếp</span>':''}</div>
        <div class="cp-nhom-sched">${schedStr}</div>
      </div>`;
    }).join('');

    return `<div class="cp-subj" style="border-left-color:${bg}">
      <div class="cp-subj-hd" style="color:${bg}">${ma} — ${ten}</div>
      ${nhomRows}
    </div>`;
  }).join('');
}

function renderSchedCells() {
  // Clear
  document.querySelectorAll('.scell').forEach(c => { c.innerHTML = ''; });

  Object.entries(placed).forEach(([key, courseIds]) => {
    const cellKey = key.replace('|','-');
    const cell = document.getElementById('cell-' + cellKey);
    if (!cell) return;

    const pipeIdx = key.indexOf('|');
    const day = key.slice(0, pipeIdx);
    const caName = key.slice(pipeIdx+1);

    (courseIds||[]).forEach(courseId => {
      const c = courses.find(x=>x.id===courseId);
      if (!c) return;
      const de = c.days.find(d=>d.day===day && d.caName===caName);
      const weeks = de?.weeks || [];
      if (!weeks.includes(curWeek)) return;
      const [bg, fg] = getColor(c.maMH);
      const ws = weeksToStr(weeks);
      const isHighlight = c.id === activeNhomId;

      const chip = document.createElement('div');
      chip.className = 'placed-chip';
      chip.style.background = bg;
      chip.style.color = fg;
      chip.style.flex = '1';
      if (isHighlight) chip.style.outline = `2px solid ${fg === '#050b14' ? 'rgba(0,0,0,.6)' : 'rgba(255,255,255,.7)'}`;
      chip.title = `${c.maMH} Nhóm ${c.nhom} — ${c.ten}\n${ws}\nClick để gỡ`;
      chip.innerHTML = `<span class="pc-code">${c.maMH} - Nh.${c.nhom}</span><span class="pc-name">${abbreviateName(c.ten)}</span><span class="pc-weeks">${ws}</span>`;
      chip.onclick = e => { e.stopPropagation(); removePlaced(c.maMH); };
      cell.appendChild(chip);
    });
  });
}

function openAddModal() {
  editingId = null;
  document.getElementById('edit-title').textContent = 'Thêm môn học thủ công';
  document.getElementById('em-ma').value='';
  document.getElementById('em-ten').value='';
  document.getElementById('em-tc').value='';
  document.getElementById('em-nhom').value='';
  editDayIdx=0; document.getElementById('edit-days-wrap').innerHTML='';
  addEditDay();
  document.getElementById('edit-modal').classList.add('open');
}

function openEditModal(id) {
  const c = courses.find(x=>x.id===id);
  if (!c) return;
  editingId = id;
  document.getElementById('edit-title').textContent = `Sửa: ${c.maMH} Nhóm ${c.nhom}`;
  document.getElementById('em-ma').value=c.maMH;
  document.getElementById('em-ten').value=c.ten;
  document.getElementById('em-tc').value=c.tc||'';
  document.getElementById('em-nhom').value=c.nhom;
  editDayIdx=0; document.getElementById('edit-days-wrap').innerHTML='';
  (c.days.length ? c.days : [null]).forEach(d=>addEditDay(d));
  document.getElementById('edit-modal').classList.add('open');
}

function closeModal(id){document.getElementById(id).classList.remove('open');}

function deleteCourse(id) {
  Object.keys(placed).forEach(k => {
    placed[k] = (placed[k]||[]).filter(pid => pid !== id);
    if (!placed[k].length) delete placed[k];
  });
  const c = courses.find(x=>x.id===id);
  courses = courses.filter(x=>x.id!==id);
  // Nếu không còn nhóm nào của môn đó thì bỏ khỏi chosen
  if (c && !courses.find(x=>x.maMH===c.maMH)) chosenSubjects.delete(c.maMH);
  if (activeNhomId===id) { activeNhomId=null; }
  renderAll();
  toast('Đã xóa.','warn');
}

function toggleSubject(ma) {
  if (chosenSubjects.has(ma)) chosenSubjects.delete(ma);
  else chosenSubjects.add(ma);
  renderChooseTab();
  updateHeader();
}

function clearChosen() {
  chosenSubjects = new Set();
  renderChooseTab();
  updateHeader();
}

function updateHeader() {
  document.getElementById('h-total').textContent = [...new Set(courses.map(c=>c.maMH))].length;
  document.getElementById('h-chosen').textContent = chosenSubjects.size;
  const placedIds = allPlacedIds();
  document.getElementById('h-placed').textContent = [...new Set([...placedIds].map(id => courses.find(c=>c.id===id)?.maMH).filter(Boolean))].length;
  const subjPlaced = new Set([...placedIds].map(id=>courses.find(c=>c.id===id)?.maMH).filter(Boolean));
  let totalTc = 0;
  subjPlaced.forEach(ma => {
    const c = courses.find(x=>x.maMH===ma);
    totalTc += c?.tc||0;
  });
  document.getElementById('h-tc').textContent = totalTc;
}

function switchTab(name) {
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('on'));
  document.getElementById('pane-'+name).classList.add('on');
  document.getElementById('tab-'+name).classList.add('on');
  if (name==='choose') renderChooseTab();
  if (name==='dnd') renderDnd();
}

function goToDnd() {
  if (!chosenSubjects.size) { toast('Chưa chọn môn nào.','warn'); return; }
  switchTab('dnd');
  toast(`Đã chuyển ${chosenSubjects.size} môn sang xếp lịch.`);
}

window.renderAll = renderAll;
window.renderList = renderList;
window.renderChooseTab = renderChooseTab;
window.renderDnd = renderDnd;
window.renderSidebar = renderSidebar;
window.renderChosenPanel = renderChosenPanel;
window.renderSchedCells = renderSchedCells;

window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.closeModal = closeModal;

window.deleteCourse = deleteCourse;
window.toggleSubject = toggleSubject;

window.updateHeader = updateHeader;
window.switchTab = switchTab;