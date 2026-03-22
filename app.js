// ════════════════════════════════════════
// ── HELPERS
// ════════════════════════════════════════

function uid() { return Math.random().toString(36).slice(2, 9); }
function show(e) { e.classList.remove('hidden'); }
function hide(e) { e.classList.add('hidden'); }
function mk(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}

// ════════════════════════════════════════
// ── TASK CHECKBOX BEHAVIOR & METRICS
// ════════════════════════════════════════

const TASK_STORAGE_KEY = 'pp_task_completion';
const STREAK_STORAGE_KEY = 'pp_streak_data';
const elWeeklyPct = document.getElementById('weekly-progress');
const elStreak = document.getElementById('streak');

let taskData = {};
let streakData = { current: 0, lastDate: null };

try { taskData = JSON.parse(localStorage.getItem(TASK_STORAGE_KEY)) || {}; } catch { taskData = {}; }
try { streakData = JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY)) || { current: 0, lastDate: null }; } catch { streakData = { current: 0, lastDate: null }; }

function saveTaskData() {
  localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(taskData));
}

function saveStreakData() {
  localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streakData));
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function initTaskCheckboxes() {
  const today = getTodayKey();
  if (!taskData[today]) taskData[today] = {};

  document.querySelectorAll('.task-checkbox').forEach(cb => {
    const taskId = cb.dataset.task;
    const label = cb.closest('.task-row-label');
    
    // Restore state
    if (taskData[today][taskId]) {
      cb.checked = true;
      label.classList.add('task-completed');
    }

    cb.addEventListener('change', function() {
      const isChecked = this.checked;
      taskData[today][taskId] = isChecked;
      saveTaskData();

      if (isChecked) {
        label.classList.add('task-completed');
        setTimeout(() => label.classList.remove('task-completed'), 400);
      }

      updateTaskMetrics();
    });
  });

  updateTaskMetrics();
}

function updateTaskMetrics() {
  const today = getTodayKey();
  const totalTasks = document.querySelectorAll('.task-checkbox').length;
  const completedTasks = document.querySelectorAll('.task-checkbox:checked').length;
  
  // Tasks Completed
  elTasksDone.textContent = completedTasks;
  
  // Daily Progress
  const dailyPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  elDailyPct.textContent = dailyPct + '%';

  // Weekly Progress (last 7 days)
  const weeklyPct = calculateWeeklyProgress();
  elWeeklyPct.textContent = weeklyPct + '%';

  // Streak
  updateStreak(dailyPct === 100);
  elStreak.textContent = streakData.current + ' days';

  // Update grid stats
  updateStats();
}

function calculateWeeklyProgress() {
  const today = new Date();
  let totalTasks = 0;
  let completedTasks = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    if (taskData[key]) {
      const dayTasks = Object.keys(taskData[key]).length;
      const dayCompleted = Object.values(taskData[key]).filter(v => v).length;
      totalTasks += 11; // 11 tasks per day
      completedTasks += dayCompleted;
    }
  }

  return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
}

function updateStreak(allTasksCompleted) {
  const today = getTodayKey();
  
  if (allTasksCompleted) {
    if (streakData.lastDate === today) {
      // Already counted today
      return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    if (streakData.lastDate === yesterdayKey || streakData.current === 0) {
      streakData.current++;
    } else if (streakData.lastDate !== today) {
      streakData.current = 1;
    }
    
    streakData.lastDate = today;
    saveStreakData();
  } else {
    // If not all tasks completed and it's a new day, reset streak
    if (streakData.lastDate && streakData.lastDate !== today) {
      const lastDate = new Date(streakData.lastDate);
      const todayDate = new Date(today);
      const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 1) {
        streakData.current = 0;
        streakData.lastDate = null;
        saveStreakData();
      }
    }
  }
}

// ════════════════════════════════════════
// ── DARK MODE TOGGLE
// ════════════════════════════════════════

const themeToggle = document.getElementById('theme-toggle');

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeToggle.textContent = dark ? '☀️ Light Mode' : '🌙 Dark Mode';
  localStorage.setItem('pp_theme', dark ? 'dark' : 'light');
  // Redraw canvas charts so colors update
  const pct = parseInt(document.getElementById('daily-progress').textContent) || 0;
  drawViz(pct);
}

// Load saved preference (flicker-free init already set data-theme on <html>)
const savedTheme = localStorage.getItem('pp_theme');
applyTheme(savedTheme === 'dark');

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(!isDark);
});

// ════════════════════════════════════════
// ── MONTH SELECTOR
// ════════════════════════════════════════

const MONTHS        = { March: 31, April: 30, May: 31, June: 30, July: 31 };
const dateHeaderRow = document.getElementById('date-header-row');
const subjectHeader = dateHeaderRow.querySelector('.subject-header');

function switchMonth(monthName) {
  const days = MONTHS[monthName];

  document.querySelectorAll('.month-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.month === monthName)
  );

  dateHeaderRow.innerHTML = '';
  dateHeaderRow.appendChild(subjectHeader);
  for (let d = 1; d <= days; d++) {
    const th = document.createElement('th');
    th.textContent = d;
    dateHeaderRow.appendChild(th);
  }

  document.querySelectorAll('.planner-table tbody tr[data-row]').forEach(row => {
    const subjectCell = row.querySelector('.subject-cell');
    row.innerHTML = '';
    row.appendChild(subjectCell);
    for (let d = 1; d <= days; d++) {
      const td = document.createElement('td');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      td.appendChild(cb);
      row.appendChild(td);
      
      // Add interactive checkbox behavior
      attachCheckboxBehavior(cb, td);
    }
  });

  updateStats();
}

// ════════════════════════════════════════
// ── INTERACTIVE CHECKBOX BEHAVIOR
// ════════════════════════════════════════

function attachCheckboxBehavior(checkbox, cell) {
  checkbox.addEventListener('change', function() {
    if (this.checked) {
      cell.classList.add('checked-cell');
      cell.classList.add('cell-pop');
      setTimeout(() => cell.classList.remove('cell-pop'), 300);
    } else {
      cell.classList.remove('checked-cell');
    }
    updateStats();
  });
}

document.querySelectorAll('.month-btn').forEach(btn =>
  btn.addEventListener('click', () => switchMonth(btn.dataset.month))
);

switchMonth('March');

document.querySelectorAll('.planner-table tbody td:not(.subject-cell)').forEach(td => {
  const cb = td.querySelector('input[type="checkbox"]');
  if (cb) {
    attachCheckboxBehavior(cb, td);
    if (cb.checked) td.classList.add('checked-cell');
  }
});

window.addEventListener('resize', () => {
  const pct = parseInt(document.getElementById('daily-progress').textContent) || 0;
  drawViz(pct);
});

// ════════════════════════════════════════
// ── GRID CHECKBOX STATS
// ════════════════════════════════════════

const elTasksDone  = document.getElementById('tasks-completed');
const elDailyPct   = document.getElementById('daily-progress');
const progBars     = document.querySelectorAll('.progress-list .prog-bar');
const progPcts     = document.querySelectorAll('.progress-list .prog-pct');
const elOverallPct = document.querySelector('.overall-pct');

document.querySelector('.planner-table tbody').addEventListener('change', updateStats);

function updateStats() {
  const all     = document.querySelectorAll('.planner-table tbody input[type="checkbox"]');
  const checked = document.querySelectorAll('.planner-table tbody input[type="checkbox"]:checked');
  const total   = all.length;
  const done    = checked.length;

  elTasksDone.textContent = done;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  elDailyPct.textContent  = pct + '%';

  document.querySelectorAll('.planner-table tbody tr[data-row]').forEach(row => {
    const i  = parseInt(row.dataset.row);
    const rb = row.querySelectorAll('input[type="checkbox"]');
    const rc = row.querySelectorAll('input[type="checkbox"]:checked');
    const rp = rb.length > 0 ? Math.round((rc.length / rb.length) * 100) : 0;
    if (progBars[i]) progBars[i].style.width = rp + '%';
    if (progPcts[i]) progPcts[i].textContent  = rp + '%';
  });

  if (elOverallPct) elOverallPct.textContent = pct + '%';
  drawViz(pct);
}

// ════════════════════════════════════════
// ── PROGRESS VISUALIZATION
// ════════════════════════════════════════

const ringFill      = document.getElementById('ring-fill');
const ringText      = document.getElementById('ring-text');
const barCanvas     = document.getElementById('bar-chart');
const lineCanvas    = document.getElementById('line-chart');
const CIRCUMFERENCE = 2 * Math.PI * 50;

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function chartColors() {
  return isDark()
    ? { bar: '#a78bfa', barEmpty: '#2d2540', label: '#7c6f9a', pct: '#c4a8f5', grid: '#2d2540', line: '#a78bfa', fill: 'rgba(167,139,250,0.10)', dot: '#c4a8f5' }
    : { bar: '#a78bfa', barEmpty: '#ede8f8', label: '#9b8fb0', pct: '#6b5b95', grid: '#ede8f8', line: '#a78bfa', fill: 'rgba(196,168,245,0.12)', dot: '#c4a8f5' };
}

function drawViz(overallPct) {
  if (!ringFill) return;

  // Ring
  const offset = CIRCUMFERENCE * (1 - overallPct / 100);
  ringFill.style.strokeDashoffset = offset;
  ringText.textContent = overallPct + '%';
  ringText.style.fill  = isDark() ? '#e2d9f3' : '#4c3a7a';

  // Per-row data
  const rows      = document.querySelectorAll('.planner-table tbody tr[data-row]');
  const rowPcts   = [];
  const rowLabels = [];
  rows.forEach(row => {
    const all  = row.querySelectorAll('input[type="checkbox"]');
    const done = row.querySelectorAll('input[type="checkbox"]:checked');
    rowPcts.push(all.length ? Math.round((done.length / all.length) * 100) : 0);
    const cell = row.querySelector('.subject-cell');
    const raw  = cell ? cell.textContent.trim() : '';
    rowLabels.push(raw.split('\u00a0')[0].trim() || ('Row ' + row.dataset.row));
  });

  drawBar(barCanvas, rowPcts, rowLabels);

  // Weekly trend: first 7 day columns
  const dayTotals = Array(7).fill(0);
  const dayDone   = Array(7).fill(0);
  rows.forEach(row => {
    const cells = row.querySelectorAll('td:not(.subject-cell)');
    for (let i = 0; i < 7 && i < cells.length; i++) {
      const cb = cells[i].querySelector('input[type="checkbox"]');
      if (!cb) continue;
      dayTotals[i]++;
      if (cb.checked) dayDone[i]++;
    }
  });
  const weekPcts = dayTotals.map((t, i) => t ? Math.round((dayDone[i] / t) * 100) : 0);
  drawLine(lineCanvas, weekPcts, ['D1','D2','D3','D4','D5','D6','D7']);
}

function drawBar(canvas, values, labels) {
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth || 300;
  const H   = 120;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const c    = chartColors();
  const n    = values.length;
  const padL = 6, padR = 6, padT = 8, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW   = Math.max(4, (chartW / n) - 4);

  values.forEach((v, i) => {
    const x    = padL + i * (chartW / n) + (chartW / n - barW) / 2;
    const barH = Math.round((v / 100) * chartH);
    const y    = padT + chartH - barH;

    ctx.fillStyle = v > 0 ? c.bar : c.barEmpty;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH || 2, 2);
    ctx.fill();

    ctx.fillStyle = c.label;
    ctx.font = '9px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i].slice(0, 5), x + barW / 2, H - padB + 12);

    if (v > 0) {
      ctx.fillStyle = c.pct;
      ctx.font = 'bold 8px Segoe UI, system-ui, sans-serif';
      ctx.fillText(v + '%', x + barW / 2, y - 3);
    }
  });
}

function drawLine(canvas, values, labels) {
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth || 300;
  const H   = 120;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const c    = chartColors();
  const n    = values.length;
  const padL = 10, padR = 10, padT = 14, padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const pts = values.map((v, i) => ({
    x: padL + i * (chartW / (n - 1)),
    y: padT + chartH - Math.round((v / 100) * chartH)
  }));

  // 50% guide line
  const y50 = padT + chartH - Math.round(0.5 * chartH);
  ctx.strokeStyle = c.grid;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(padL, y50);
  ctx.lineTo(W - padR, y50);
  ctx.stroke();
  ctx.setLineDash([]);

  // Line
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();

  // Fill under line
  ctx.fillStyle = c.fill;
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[n-1].x, padT + chartH);
  ctx.lineTo(pts[0].x,   padT + chartH);
  ctx.closePath();
  ctx.fill();

  // Dots + labels
  pts.forEach((p, i) => {
    ctx.fillStyle = c.dot;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = c.label;
    ctx.font = '9px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], p.x, H - padB + 12);

    if (values[i] > 0) {
      ctx.fillStyle = c.pct;
      ctx.font = 'bold 8px Segoe UI, system-ui, sans-serif';
      ctx.fillText(values[i] + '%', p.x, p.y - 6);
    }
  });
}

// ════════════════════════════════════════
// ── HIERARCHICAL PLANNER PANEL
// ════════════════════════════════════════

const PLAN_KEY    = 'pp_planner_v2';
const PLAN_MONTHS = ['March', 'April', 'May', 'June', 'July'];
const PLAN_WEEKS  = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
const PLAN_DAYS   = 7;

let planData = {};
try { planData = JSON.parse(localStorage.getItem(PLAN_KEY)) || {}; } catch { planData = {}; }

function savePlan() { localStorage.setItem(PLAN_KEY, JSON.stringify(planData)); }

function getTaskList(subject, month, week, day) {
  if (!planData[subject])                              planData[subject] = {};
  if (month && !planData[subject][month])              planData[subject][month] = { tasks: [] };
  if (week  && !planData[subject][month][week])        planData[subject][month][week] = { tasks: [] };
  if (day   && !planData[subject][month][week][day])   planData[subject][month][week][day] = [];

  if (day)   return planData[subject][month][week][day];
  if (week)  return planData[subject][month][week].tasks;
  if (month) return planData[subject][month].tasks;
  return [];
}

let ps = { subject: '', month: '', week: '', day: '' };

const planOverlay = document.getElementById('planner-overlay');
const planPanel   = document.getElementById('planner-panel');
const panelBody   = document.getElementById('panel-body');
const breadcrumb  = document.getElementById('breadcrumb');

document.addEventListener('click', e => {
  const link = e.target.closest('.subject-link');
  if (link) openPanel(link.dataset.subject);
  
  const notepadBtn = e.target.closest('.notepad-btn');
  if (notepadBtn) {
    e.stopPropagation();
    openSubjectNotepad(notepadBtn.dataset.subject);
  }
});

document.getElementById('panel-close').addEventListener('click', closePanel);
planOverlay.addEventListener('click', closePanel);

function openPanel(subject) {
  ps = { subject, month: '', week: '', day: '' };
  show(planOverlay);
  show(planPanel);
  render();
}

function closePanel() {
  hide(planOverlay);
  hide(planPanel);
}

function render() {
  renderBreadcrumb();
  panelBody.innerHTML = '';
  if (!ps.month) { renderMonths();    return; }
  if (!ps.week)  { renderMonthView(); return; }
  if (!ps.day)   { renderWeekView();  return; }
  renderDayView();
}

function renderBreadcrumb() {
  breadcrumb.innerHTML = '';
  const crumbs = [{ label: ps.subject, key: 'subject' }];
  if (ps.month) crumbs.push({ label: ps.month,        key: 'month' });
  if (ps.week)  crumbs.push({ label: ps.week,         key: 'week'  });
  if (ps.day)   crumbs.push({ label: 'Day ' + ps.day, key: 'day'   });

  crumbs.forEach((c, i) => {
    const span = mk('span', 'bc-item' + (i === crumbs.length - 1 ? ' active' : ''), c.label);
    if (i < crumbs.length - 1) {
      span.addEventListener('click', () => {
        if (c.key === 'subject') { ps.month = ''; ps.week = ''; ps.day = ''; }
        if (c.key === 'month')   { ps.week  = ''; ps.day  = ''; }
        if (c.key === 'week')    { ps.day   = ''; }
        render();
      });
    }
    breadcrumb.appendChild(span);
    if (i < crumbs.length - 1) breadcrumb.appendChild(mk('span', 'bc-sep', ' › '));
  });
}

function renderMonths() {
  panelBody.appendChild(mk('p', 'panel-level-title', 'Select a month'));
  const grid = mk('div', 'panel-grid');
  PLAN_MONTHS.forEach(m => {
    const taskCount = planData[ps.subject]?.[m]?.tasks?.length || 0;
    const card = mk('div', 'panel-card', m);
    if (taskCount > 0) {
      const badge = mk('span', 'panel-badge', taskCount);
      card.appendChild(badge);
    }
    card.addEventListener('click', () => { ps.month = m; render(); });
    grid.appendChild(card);
  });
  panelBody.appendChild(grid);
}

function renderMonthView() {
  // Monthly notes textarea
  const notesSection = mk('div', 'panel-section');
  notesSection.appendChild(mk('p', 'panel-section-title', '📝 Monthly Notes — ' + ps.month));
  const notesArea = mk('textarea', 'panel-notes-area');
  notesArea.placeholder = 'Write your monthly goals, topics to cover, or any notes here...';
  const notesKey = `notes_${ps.subject}_${ps.month}`;
  notesArea.value = localStorage.getItem(notesKey) || '';
  notesArea.addEventListener('input', () => {
    localStorage.setItem(notesKey, notesArea.value);
  });
  notesSection.appendChild(notesArea);
  panelBody.appendChild(notesSection);

  // Monthly checklist
  const monthSection = mk('div', 'panel-section');
  monthSection.appendChild(mk('p', 'panel-section-title', '✅ Monthly Checklist — ' + ps.month));
  monthSection.appendChild(buildChecklist(getTaskList(ps.subject, ps.month, '', '')));
  panelBody.appendChild(monthSection);

  // Week selector
  const weekSection = mk('div', 'panel-section');
  weekSection.appendChild(mk('p', 'panel-section-title', '📆 Select a Week'));
  const grid = mk('div', 'panel-grid');
  PLAN_WEEKS.forEach(w => {
    const weekTasks = planData[ps.subject]?.[ps.month]?.[w]?.tasks?.length || 0;
    const card = mk('div', 'panel-card', w);
    if (weekTasks > 0) card.appendChild(mk('span', 'panel-badge', weekTasks));
    card.addEventListener('click', () => { ps.week = w; render(); });
    grid.appendChild(card);
  });
  weekSection.appendChild(grid);
  panelBody.appendChild(weekSection);
}

function renderWeekView() {
  // Weekly notes textarea
  const notesSection = mk('div', 'panel-section');
  notesSection.appendChild(mk('p', 'panel-section-title', '📝 Weekly Notes — ' + ps.week));
  const notesArea = mk('textarea', 'panel-notes-area');
  notesArea.placeholder = 'Write your weekly goals, topics to study, or any notes here...';
  const notesKey = `notes_${ps.subject}_${ps.month}_${ps.week}`;
  notesArea.value = localStorage.getItem(notesKey) || '';
  notesArea.addEventListener('input', () => {
    localStorage.setItem(notesKey, notesArea.value);
  });
  notesSection.appendChild(notesArea);
  panelBody.appendChild(notesSection);

  // Weekly checklist
  const weekSection = mk('div', 'panel-section');
  weekSection.appendChild(mk('p', 'panel-section-title', '✅ Weekly Checklist — ' + ps.week));
  weekSection.appendChild(buildChecklist(getTaskList(ps.subject, ps.month, ps.week, '')));
  panelBody.appendChild(weekSection);

  // Day selector
  const daySection = mk('div', 'panel-section');
  daySection.appendChild(mk('p', 'panel-section-title', '🗓️ Select a Day'));
  const grid = mk('div', 'panel-grid');
  for (let d = 1; d <= PLAN_DAYS; d++) {
    const dayTasks = planData[ps.subject]?.[ps.month]?.[ps.week]?.[d]?.length || 0;
    const card = mk('div', 'panel-card', 'Day ' + d);
    if (dayTasks > 0) card.appendChild(mk('span', 'panel-badge', dayTasks));
    card.addEventListener('click', () => { ps.day = d; render(); });
    grid.appendChild(card);
  }
  daySection.appendChild(grid);
  panelBody.appendChild(daySection);
}

function renderDayView() {
  // Daily notes textarea
  const notesSection = mk('div', 'panel-section');
  notesSection.appendChild(mk('p', 'panel-section-title', '📝 Daily Notes — Day ' + ps.day));
  const notesArea = mk('textarea', 'panel-notes-area');
  notesArea.placeholder = 'Write your daily tasks, topics to cover, or any notes here...';
  const notesKey = `notes_${ps.subject}_${ps.month}_${ps.week}_${ps.day}`;
  notesArea.value = localStorage.getItem(notesKey) || '';
  notesArea.addEventListener('input', () => {
    localStorage.setItem(notesKey, notesArea.value);
  });
  notesSection.appendChild(notesArea);
  panelBody.appendChild(notesSection);

  // Daily checklist
  const daySection = mk('div', 'panel-section');
  daySection.appendChild(mk('p', 'panel-section-title', '✅ Daily Checklist — Day ' + ps.day));
  daySection.appendChild(buildChecklist(getTaskList(ps.subject, ps.month, ps.week, ps.day)));
  panelBody.appendChild(daySection);
}

function buildChecklist(tasks) {
  const block  = mk('div', 'checklist-block');

  // Progress bar
  const progWrap = mk('div', 'cl-prog-wrap');
  const progBar  = mk('div', 'cl-prog-bar');
  const progLbl  = mk('span', 'cl-prog-lbl', '0 / 0');
  progWrap.appendChild(progBar);
  block.appendChild(progWrap);
  block.appendChild(progLbl);

  // Add task row
  const addRow = mk('div', 'task-add-row');
  const input  = mk('input', 'task-input');
  input.type        = 'text';
  input.placeholder = 'Add a task...';
  const addBtn = mk('button', 'btn-add-task', '+ Add');

  function addTask() {
    const text = input.value.trim();
    if (!text) return;
    tasks.push({ id: uid(), text, done: false });
    savePlan();
    input.value = '';
    refreshList();
  }

  addBtn.addEventListener('click', addTask);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
  addRow.appendChild(input);
  addRow.appendChild(addBtn);
  block.appendChild(addRow);

  const listEl = mk('div', 'task-list');
  block.appendChild(listEl);

  function refreshList() {
    listEl.innerHTML = '';
    const total = tasks.length;
    const done  = tasks.filter(t => t.done).length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    progBar.style.width  = pct + '%';
    progLbl.textContent  = done + ' / ' + total + ' done';

    if (!total) {
      listEl.appendChild(mk('p', 'empty-hint', 'No tasks yet. Add one above.'));
      return;
    }

    tasks.forEach((task, i) => {
      const item  = mk('div', 'task-item' + (task.done ? ' task-done' : ''));
      const cb    = document.createElement('input');
      cb.type     = 'checkbox';
      cb.checked  = task.done;

      const label = mk('span', 'task-label' + (task.done ? ' done' : ''), task.text);

      cb.addEventListener('change', () => {
        tasks[i].done = cb.checked;
        item.className = 'task-item' + (cb.checked ? ' task-done' : '');
        label.className = 'task-label' + (cb.checked ? ' done' : '');
        savePlan();
        refreshList();
      });

      const del = mk('button', 'btn-del-task', '✕');
      del.addEventListener('click', () => {
        tasks.splice(i, 1);
        savePlan();
        refreshList();
      });

      item.appendChild(cb);
      item.appendChild(label);
      item.appendChild(del);
      listEl.appendChild(item);
    });
  }

  refreshList();
  return block;
}

// ════════════════════════════════════════
// ── NOTEPAD MODAL
// ════════════════════════════════════════

const noteOverlay    = document.getElementById('notepad-overlay');
const stepMode       = document.getElementById('step-mode');
const stepSub        = document.getElementById('step-sub');
const stepNotes      = document.getElementById('step-notes');
const subjectTitle   = document.getElementById('notepad-subject-title');
const stepSubTitle   = document.getElementById('step-sub-title');
const stepNotesTitle = document.getElementById('step-notes-title');
const stepSubHint    = document.getElementById('step-sub-hint');
const subOptions     = document.getElementById('sub-options');
const notepadTA      = document.getElementById('notepad-textarea');
const saveNoteBtn    = document.getElementById('save-note');
const saveStatus     = document.getElementById('save-status');

let nSubject = '', nMode = '', nSub = '';

function openNoteModal(subject) {
  nSubject = subject; nMode = ''; nSub = '';
  subjectTitle.textContent = subject;
  show(stepMode); hide(stepSub); hide(stepNotes);
  show(noteOverlay);
}

function closeNoteModal() { hide(noteOverlay); }

document.getElementById('notepad-close').addEventListener('click', closeNoteModal);
document.getElementById('notepad-close-2').addEventListener('click', closeNoteModal);
document.getElementById('notepad-close-3').addEventListener('click', closeNoteModal);
noteOverlay.addEventListener('click', e => { if (e.target === noteOverlay) closeNoteModal(); });

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    nMode = btn.dataset.mode;
    stepSubTitle.textContent = `${nSubject} — ${nMode}`;
    if (nMode === 'Daily') {
      nSub = 'Daily'; openNotepad();
    } else if (nMode === 'Weekly') {
      stepSubHint.textContent = 'Select a day';
      buildNoteSubOptions(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']);
      show(stepSub); hide(stepMode);
    } else {
      stepSubHint.textContent = 'Select a week';
      buildNoteSubOptions(['Week 1','Week 2','Week 3','Week 4']);
      show(stepSub); hide(stepMode);
    }
  });
});

function buildNoteSubOptions(items) {
  subOptions.innerHTML = '';
  items.forEach(item => {
    const btn = mk('button', 'sub-btn', item);
    btn.addEventListener('click', () => { nSub = item; openNotepad(); });
    subOptions.appendChild(btn);
  });
}

function openNotepad() {
  stepNotesTitle.textContent = nMode === 'Daily'
    ? `${nSubject} — Daily Tasks`
    : `${nSubject} — ${nMode} — ${nSub}`;
  notepadTA.value = localStorage.getItem(noteKey()) || '';
  saveStatus.textContent = '';
  hide(stepMode); hide(stepSub); show(stepNotes);
}

document.getElementById('back-to-mode').addEventListener('click', () => { hide(stepSub); show(stepMode); });
document.getElementById('back-to-sub').addEventListener('click', () => {
  if (nMode === 'Daily') { hide(stepNotes); show(stepMode); }
  else { hide(stepNotes); show(stepSub); }
});

saveNoteBtn.addEventListener('click', () => {
  localStorage.setItem(noteKey(), notepadTA.value);
  saveStatus.textContent = 'Saved.';
  setTimeout(() => saveStatus.textContent = '', 2000);
});

function noteKey() { return `pp_note__${nSubject}__${nMode}__${nSub}`; }

// ════════════════════════════════════════
// ── SUBJECT NOTEPAD (SIMPLE)
// ════════════════════════════════════════

function openSubjectNotepad(subject) {
  const overlay = document.createElement('div');
  overlay.className = 'subject-notepad-overlay';
  
  const notepad = document.createElement('div');
  notepad.className = 'subject-notepad';
  
  const header = document.createElement('div');
  header.className = 'subject-notepad-header';
  header.innerHTML = `
    <span>📝 ${subject} - Quick Notes</span>
    <button class="close-btn" onclick="this.closest('.subject-notepad-overlay').remove()">✕</button>
  `;
  
  const textarea = document.createElement('textarea');
  textarea.className = 'subject-notepad-textarea';
  textarea.placeholder = `Write quick notes, ideas, or reminders for ${subject}...`;
  const noteKey = `subject_notepad_${subject}`;
  textarea.value = localStorage.getItem(noteKey) || '';
  
  textarea.addEventListener('input', () => {
    localStorage.setItem(noteKey, textarea.value);
  });
  
  const footer = document.createElement('div');
  footer.className = 'subject-notepad-footer';
  footer.innerHTML = '<span style="font-size: 0.7rem; color: var(--text-muted);">Auto-saved</span>';
  
  notepad.appendChild(header);
  notepad.appendChild(textarea);
  notepad.appendChild(footer);
  overlay.appendChild(notepad);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  
  document.body.appendChild(overlay);
  textarea.focus();
}
