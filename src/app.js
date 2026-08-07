
// Override console to dump to file for debugging
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function dumpToFile(level, ...args) {
  try {
    const fs = require('fs');
    const path = require('path');
    const logPath = 'C:\electron_debug_log.txt';
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    fs.appendFileSync(logPath, `[${level}] ${new Date().toISOString()} - ${msg}
`);
  } catch (e) {}
}

console.log = (...args) => {
  dumpToFile('LOG', ...args);
  originalConsoleLog(...args);
};
console.error = (...args) => {
  dumpToFile('ERROR', ...args);
  originalConsoleError(...args);
};
console.warn = (...args) => {
  dumpToFile('WARN', ...args);
  originalConsoleWarn(...args);
};

window.addEventListener('error', (event) => {
  console.error('Uncaught Error:', event.error ? event.error.stack : event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});

  window.addEventListener('error', function(e) {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.width = '100%';
    errorDiv.style.background = 'red';
    errorDiv.style.color = 'white';
    errorDiv.style.zIndex = '999999';
    errorDiv.style.padding = '20px';
    errorDiv.style.fontSize = '20px';
    errorDiv.innerHTML = 'ERROR: ' + e.filename + ':' + e.lineno + ' ' + e.message;
    document.body.appendChild(errorDiv);
  });

// --- Focus Mode Upgraded Core Logic, Synthesizers, & Gamification ---

// --- Application State ---
var appState = {
  focusTimeToday: 0, // in seconds
  distractionsCount: 0,
  tasks: [],
  habits: [],
  leaveDays: [], // ['Tue Jul 14 2026', ...]
  history: [], // [{ date, focusSeconds, distractions, completedTasks, totalTasks }]
  settings: {
    autostart: false,
    notifications: true,
    dayResetHour: 5, // Day rolls over at 5:00 AM instead of midnight
    dailyGoalHours: 8,
    focusDurationMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    soundVolume: 0.5,
    screensaverTimeoutMinutes: 1,
    idleTimeoutMinutes: 3,
    lastActiveDate: '' // Focus date string e.g. "Mon Jul 13 2026"
  }
};

// State Variables
let activeTaskId = null;
let pendingScreensaverReflectionTaskId = null;
let currentTimer = 0;
let sessionType = 'focus'; // 'focus' | 'shortBreak' | 'longBreak'
let timerRunning = false;
let timerInterval = null;
let activeWorkspace = 'all';
let selectedDetailTaskId = null;
let activeView = 'tasks';
let currentActivityViewOffsetDays = 0; // 'tasks' | 'planner'
let isWidgetMode = false;

// Monthly Calendar Tracker View State
let currentCalMonth = new Date().getMonth();
let currentCalYear = new Date().getFullYear();
let selectedCalDate = new Date(); // Date object defaults to today

// Audio context references (system chimes)
let audioCtx = null;

// Focus Streaming Music Channels Database
const defaultMusicStations = [
  { id: 'station-1', name: "Lofi Focus Beats", desc: "Chill study beats & lo-fi hip hop", url: "https://stream.zeno.fm/f3wvbbqmdg8uv" },
  { id: 'station-2', name: "Deep Work Synthwave", desc: "Retro electronic & synth focus", url: "https://stream.zeno.fm/0r0xa792kwzuv" },
  { id: 'station-3', name: "Nature & Soft Rain", desc: "Calming rain & ambient nature soundscapes", url: "https://stream.zeno.fm/u5d878h9bhruv" },
  { id: 'station-4', name: "Classical Productivity", desc: "Inspiring piano & orchestral focus music", url: "https://stream.zeno.fm/wf843x5bhruv" },
  { id: 'station-5', name: "Ambient Space & Drone", desc: "Atmospheric cosmic ambient pads", url: "https://stream.zeno.fm/7c490895318uv" }
];
const musicStations = [];
let currentStationIndex = 0;
let isMusicPlaying = false;
let isShuffleActive = false;

function initStations() {
  musicStations.length = 0;
  musicStations.push(...defaultMusicStations);
  if (appState.settings && appState.settings.localMusicList && appState.settings.localMusicList.length > 0) {
    appState.settings.localMusicList.forEach((track, idx) => {
      musicStations.push({
        id: 'local-saved-' + idx,
        name: track.name,
        desc: "Local Audio File",
        url: track.path ? ("file://" + track.path.replace(/\\/g, '/')) : ''
      });
    });
  }
}

// Quotes & Thoughts Database
const quotes = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
  { text: "Deep work is the superpower of the 21st century.", author: "Cal Newport" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" },
  { text: "Great things are done by a series of small things brought together.", author: "Vincent Van Gogh" },
  { text: "If you spend too much time thinking about a thing, you'll never get it done.", author: "Bruce Lee" },
  { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Disciplined attention is the foundation of extraordinary achievement.", author: "Marcus Aurelius" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "Success isn't always about greatness. It's about consistency.", author: "Dwayne Johnson" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Mastering others is strength. Mastering yourself is true power.", author: "Lao Tzu" },
  { text: "Habits are the compound interest of self-improvement.", author: "James Clear" },
  { text: "Simplicity boils down to two steps: Identify the essential. Eliminate the rest.", author: "Leo Babauta" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "What we fear doing most is usually what we most need to do.", author: "Ralph Waldo Emerson" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" }
];

// DOM Elements
const elBtnToggleWidget = document.getElementById('btn-toggle-widget');
const elBtnMinimize = document.getElementById('btn-minimize');
const elBtnClose = document.getElementById('btn-close');
const elTimerStateLabel = document.getElementById('timer-state-label');
const elTimerTime = document.getElementById('timer-time');
const elActiveTaskDisplay = document.getElementById('active-task-display');
const elBtnReset = document.getElementById('btn-reset');
const elBtnPlayPause = document.getElementById('btn-play-pause');
const elBtnSkip = document.getElementById('btn-skip');
const elPlayIcon = document.getElementById('play-icon');
const elPauseIcon = document.getElementById('pause-icon');

// Stats Elements
const elStatFocusTime = document.getElementById('stat-focus-time');
const elStatFocusTarget = document.getElementById('stat-focus-target');
const elStatFocusBar = document.getElementById('stat-focus-bar');
const elStatProdScore = document.getElementById('stat-prod-score');
const elStatProdBar = document.getElementById('stat-prod-bar');
const elGoalProgressRing = document.getElementById('goal-progress-ring');
const elDistractionCountBadge = document.getElementById('distraction-count-badge');

// View Panel Toggle Elements (Tasks sidebar)
const elBtnViewTasks = document.getElementById('btn-view-tasks');
const elBtnViewPlanner = document.getElementById('btn-view-planner');
const elTasksViewContent = document.getElementById('tasks-view-content');

// Add Task Pop-up Modal Elements
const elBtnOpenAddTask = document.getElementById('btn-open-add-task');
const elAddTaskOverlay = document.getElementById('add-task-overlay');
const elBtnCloseAddTask = document.getElementById('btn-close-add-task');
const elBtnCancelAddTask = document.getElementById('btn-cancel-add-task');
const elAddTaskForm = document.getElementById('add-task-form');
const elTaskNameInput = document.getElementById('task-name-input');
const elTaskWorkspaceSelect = document.getElementById('task-workspace-select');
const elTaskTypePills = document.querySelectorAll('.task-type-selector .type-pill');
const elTargetQtyContainer = document.getElementById('target-quantity-container');
const elTargetDurationContainer = document.getElementById('target-duration-container');

// Start/End Dates inputs
const elTaskStartDate = document.getElementById('task-start-date');
const elTaskEndDateType = document.getElementById('task-end-date-type');
const elTaskEndDate = document.getElementById('task-end-date');
const elEndDateContainer = document.getElementById('end-date-container');

// Task Lists Elements
const elPendingTasksList = document.getElementById('pending-tasks-list');
const elCompletedTasksList = document.getElementById('completed-tasks-list');
const elCountPending = document.getElementById('count-pending');
const elCountCompleted = document.getElementById('count-completed');
const elBtnTogglePending = document.getElementById('btn-toggle-pending');
const elBtnToggleCompleted = document.getElementById('btn-toggle-completed');
const elBtnClearCompleted = document.getElementById('btn-clear-completed');
const elWorkspaceTabs = document.querySelectorAll('.workspace-tabs .ws-tab');

// Habits & Leaderboard Elements
const elHabitList = document.getElementById('habit-list');
const elLeaderboardList = document.getElementById('leaderboard-list');

// MP3 Streaming Music Player Elements
const elBgMusicPlayer = document.getElementById('bg-music-player');
const elBtnMusicPrev = document.getElementById('btn-music-prev');
const elBtnMusicPlay = document.getElementById('btn-music-play');
const elBtnMusicNext = document.getElementById('btn-music-next');
const elMusicPlayIcon = document.getElementById('music-play-icon');
const elMusicPauseIcon = document.getElementById('music-pause-icon');
const elMp3StationName = document.getElementById('mp3-station-name');
const elMp3StationDesc = document.getElementById('mp3-station-desc');
const elVinylDisc = document.getElementById('vinyl-disc');
const elSoundMusicVolume = document.getElementById('sound-music-volume');
const elBtnLoadLocal = document.getElementById('btn-load-local');
const elLocalMusicPicker = document.getElementById('local-music-picker');

// Seek, Shuffle, and Mini Mode DOM bindings
const elBtnMusicShuffle = document.getElementById('btn-music-shuffle');
const elBtnYouTubePip = document.getElementById('btn-youtube-pip');
const elSettingYouTubeUrl = document.getElementById('setting-youtube-url');
const elSoundMusicProgress = document.getElementById('sound-music-progress');
const elMusicTimeCurrent = document.getElementById('music-time-current');
const elMusicTimeTotal = document.getElementById('music-time-total');
const elMiniTaskSwitcher = document.getElementById('mini-task-switcher');
const elMiniBtnCompleteTask = document.getElementById('mini-btn-complete-task');
const elMiniBtnQtyPlus = document.getElementById('mini-btn-qty-plus');
const elMiniQuoteText = document.getElementById('mini-quote-text');
const elMiniTimerPlayPause = document.getElementById('mini-timer-play-pause');
const elMiniActiveTaskName = document.getElementById('mini-active-task-name');

// Mini Mode Inline Music Player controls
const elMiniMusicStationTitle = document.getElementById('mini-music-station-title');
const elMiniBtnMusicPrev = document.getElementById('mini-btn-music-prev');
const elMiniBtnMusicPlay = document.getElementById('mini-btn-music-play');
const elMiniBtnMusicNext = document.getElementById('mini-btn-music-next');

// Quotes Banner (Prominent Header Card)
const elDashboardQuoteText = document.getElementById('dashboard-quote-text');
const elDashboardQuoteAuthor = document.getElementById('dashboard-quote-author');

// Task Detail Drawer Elements
const elTaskDetailOverlay = document.getElementById('task-detail-overlay');
const elBtnCloseDetail = document.getElementById('btn-close-detail');
const elBtnSaveDetail = document.getElementById('btn-save-detail');
const elDetailTaskTitle = document.getElementById('detail-task-title');
const elDetailTaskName = document.getElementById('detail-task-name');
const elDetailTaskStartDate = document.getElementById('detail-task-start-date');
const elDetailTaskEndDate = document.getElementById('detail-task-end-date');
const elDetailTargetQtyContainer = document.getElementById('detail-target-qty-container');
const elDetailTargetQty = document.getElementById('detail-task-qty');
const elDetailTargetDurationContainer = document.getElementById('detail-target-duration-container');
const elDetailTargetHours = document.getElementById('detail-task-hours');
const elDetailTargetMinutes = document.getElementById('detail-task-minutes');
const elDetailTaskNotes = document.getElementById('detail-task-notes');

const elDetailSubtaskList = document.getElementById('detail-subtask-list');
const elDetailHistoryList = document.getElementById('detail-history-list');
const elAddSubtaskForm = document.getElementById('add-subtask-form');
const elSubtaskInput = document.getElementById('subtask-input');

// AI Coaching Drawer Elements
const elBtnAiCoach = document.getElementById('btn-ai-coach');
const elAiReportOverlay = document.getElementById('ai-report-overlay');
const elBtnCloseReport = document.getElementById('btn-close-report');
const elBtnShareReport = document.getElementById('btn-share-report');
const elReportScoreVal = document.getElementById('report-score-val');
const elReportGradeLabel = document.getElementById('report-grade-label');
const elReportCoachText = document.getElementById('report-coach-text');

// Thought of the Day Elements
const elBtnThought = document.getElementById('btn-thought');
const elThoughtOverlay = document.getElementById('thought-overlay');
const elBtnCloseThought = document.getElementById('btn-close-thought');
const elBtnNextThought = document.getElementById('btn-next-thought');
const elThoughtImageDisplay = document.getElementById('thought-image-display');
const elThoughtImageSourceLabel = document.getElementById('thought-image-source-label');

// Monthly Calendar Pop-up Overlay elements
const elCalendarOverlay = document.getElementById('calendar-overlay');
const elBtnCloseCalendar = document.getElementById('btn-close-calendar');
const elCalendarMonthYear = document.getElementById('calendar-month-year');
const elCalendarDaysGrid = document.getElementById('calendar-days-grid');
const elBtnPrevMonth = document.getElementById('btn-prev-month');
const elBtnNextMonth = document.getElementById('btn-next-month');

// Calendar selected day inspector elements
const elSelectedDayLabel = document.getElementById('selected-day-label');
const elSelectedDayTypeBadge = document.getElementById('selected-day-type-badge');
const elBtnToggleLeave = document.getElementById('btn-toggle-leave');
const elLeaveReasonInput = document.getElementById('leave-reason-input');
const elLeaveReasonContainer = document.getElementById('leave-reason-container');
const elLeaveReasonTextView = document.getElementById('leave-reason-text-view');
const elLeaveReasonTextContent = document.getElementById('leave-reason-text-content');
const elLeaveReasonDisplay = document.getElementById('leave-reason-display');
const elSelectedDayTasksList = document.getElementById('selected-day-tasks-list');

// Settings Elements
const elBtnSettings = document.getElementById('btn-settings');
const elSettingsOverlay = document.getElementById('settings-overlay');
const elBtnCloseSettings = document.getElementById('btn-close-settings');
const elBtnSaveSettings = document.getElementById('btn-save-settings');
const elSettingAutostart = document.getElementById('setting-autostart');
const elSettingNotifications = document.getElementById('setting-notifications');
const elSettingDayResetHour = document.getElementById('setting-day-reset-hour');

const elSettingFocusDuration = document.getElementById('setting-focus-duration');
const elSettingShortBreak = document.getElementById('setting-short-break');
const elSettingLongBreak = document.getElementById('setting-long-break');
const elSettingSoundVolume = document.getElementById('setting-sound-volume');
const elBtnPreviewSound = document.getElementById('btn-preview-sound');

const RING_CIRCUMFERENCE = 552.92; // 2 * PI * 88

// --- Web Audio Chime Synthesis (System Chimes) ---
function playChime(type) {
  const vol = parseFloat(appState.settings.soundVolume);
  if (vol === 0) return;
  
  try {
    initAudioContext();
    const ctx = audioCtx;
    
    if (type === 'focusComplete') {
      const notes = [261.63, 329.63, 392.00, 493.88, 523.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
        gainNode.gain.linearRampToValueAtTime(vol * 0.15, ctx.currentTime + idx * 0.08 + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.7);
        
        osc.connect(gainNode).connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.7);
      });
    } else if (type === 'breakComplete') {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(293.66, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(vol * 0.15, ctx.currentTime + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      
      osc.connect(gainNode).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'taskComplete') {
      const times = [0, 0.12];
      const freqs = [523.25, 783.99];
      times.forEach((t, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqs[idx], ctx.currentTime + t);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime + t);
        gainNode.gain.linearRampToValueAtTime(vol * 0.2, ctx.currentTime + t + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.4);
        
        osc.connect(gainNode).connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.4);
      });
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(vol * 0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
      
      osc.connect(gainNode).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    }
  } catch (err) {
    console.error("Audio synthesis error:", err);
  }
}

function initAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// --- Data Export & Import ---
const elBtnExportData = document.getElementById('btn-export-data');
const elBtnImportData = document.getElementById('btn-import-data');
const elInputImportData = document.getElementById('input-import-data');
const elBtnOpenScreensaverFolder = document.getElementById('btn-open-screensaver-folder');

if (elBtnOpenScreensaverFolder) {
  elBtnOpenScreensaverFolder.addEventListener('click', async () => {
    playChime('click');
    if (window.electronAPI && window.electronAPI.openUserQuotesFolder) {
      await window.electronAPI.openUserQuotesFolder();
      showToast('Screensaver Folder', 'Opened screensaver image folder!');
    }
  });
}

if (elBtnExportData) {
  elBtnExportData.addEventListener('click', () => {
    playChime('click');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "focus_mode_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  });
}

if (elBtnImportData) {
  elBtnImportData.addEventListener('click', () => {
    playChime('click');
    elInputImportData.click();
  });

  elInputImportData.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedState = JSON.parse(e.target.result);
        if (importedState && importedState.settings) {
          appState = importedState;
          saveAppState();
          alert("Backup successfully imported! Reloading...");
          window.location.reload();
        } else {
          alert("Invalid backup file.");
        }
      } catch (err) {
        alert("Error parsing backup file.");
      }
    };
    reader.readAsText(file);
  });
}

// --- Mini Player Window Drag UI Logic ---
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  if (h > 0) {
    return `${h}<span class="blink">:</span>${m}<span class="blink">:</span>${s}`;
  }
  return `${m}<span class="blink">:</span>${s}`;
}

function formatHoursMinutes(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  return `${h}h ${m}m`;
}

// --- Date Shifted Day Reset Check ---
function getFocusDateString(resetHour, timeMs) {
  const targetTime = timeMs ? new Date(timeMs).getTime() : new Date().getTime();
  const shiftedTime = targetTime - (resetHour * 3600 * 1000);
  return new Date(shiftedTime).toDateString();
}

// --- Task Start & End Date Checker ---
function taskMatchesDay(task, targetWeekday) {
  if (task.plannerDays && task.plannerDays.length > 0) {
    return task.plannerDays.includes(targetWeekday);
  }
  return !task.plannerDay || task.plannerDay === targetWeekday || task.plannerDay === 'any';
}

function isTaskActiveOnDate(task, dateObj) {
  const dateStr = dateObj.toDateString();
  if (appState.leaveDays && appState.leaveDays.includes(dateStr)) return false;
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const targetName = weekdays[dateObj.getDay()];
  
  // Planners only show on their scheduled days
  if (!taskMatchesDay(task, targetName)) return false;

  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const targetDateStr = `${yyyy}-${mm}-${dd}`;
  
  if (task.startDate && targetDateStr < task.startDate) return false;
  if (task.endDateType === 'specific' && task.endDate && targetDateStr > task.endDate) return false;
  
  return true;
}


function performDayRollover(oldDateStr, newDateStr) {
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const lastDateObj = new Date(oldDateStr || new Date().toDateString());
  const lastWeekday = weekdays[lastDateObj.getDay()];
  
  const activeTasksYesterday = appState.tasks.filter(t => {
    return taskMatchesDay(t, lastWeekday) && isTaskActiveOnDate(t, lastDateObj);
  });

  const totalTasksToday = activeTasksYesterday.length;
  const completedTasksToday = activeTasksYesterday.filter(t => t.completed).length;
  
  appState.history.push({
    date: oldDateStr || new Date().toDateString(),
    focusSeconds: appState.focusTimeToday,
    distractions: appState.distractionsCount,
    completedTasks: completedTasksToday,
    totalTasks: totalTasksToday
  });
  
  // Update streaks and reset habits
  appState.habits.forEach(h => {
    if (h.completed) h.streak++;
    else h.streak = 0;
    h.completed = false;
  });
  
  // Restart tasks by day base
  appState.tasks.forEach(t => {
    // Archive progress and reflection notes/attachments before reset
    if (!t.history) t.history = {};
    const archiveDate = oldDateStr || new Date().toDateString();
    t.history[archiveDate] = {
      completed: t.completed || false,
      qty: t.currentQty || 0,
      duration: t.currentDuration || 0,
      completionNote: t.completionNote || '',
      completionImage: t.completionImage || null,
      completionVideo: t.completionVideo || null,
      completionDocument: t.completionDocument || null
    };

    t.completed = false;
    t.currentQty = 0;
    t.currentDuration = 0;
    t.completionNote = '';
    t.completionImage = null;
    t.completionVideo = null;
    t.completionDocument = null;
    if (t.subtasks) {
      t.subtasks.forEach(st => st.completed = false);
    }
  });
  
  appState.focusTimeToday = 0;
  appState.distractionsCount = 0;
  appState.settings.lastActiveDate = newDateStr;
  
  saveAppState();
  logActivity('system', `Day rolled over from ${oldDateStr} to ${newDateStr}`);
}

// --- Theming Engine ---
const neonThemes = ['purple', 'blue', 'green', 'pink', 'orange'];
const neonHexColors = {
  purple: '#a855f7',
  blue: '#3b82f6',
  green: '#10b981',
  pink: '#ec4899',
  orange: '#f97316'
};
function applyNeonTheme(index) {
  const theme = neonThemes[index % neonThemes.length];
  document.body.setAttribute('data-neon-theme', theme);
  const mainColor = neonHexColors[theme] || '#a855f7';
  document.documentElement.style.setProperty('--theme-color', mainColor);
}

const elBtnRotateTheme = document.getElementById('btn-rotate-theme');
if (elBtnRotateTheme) {
  elBtnRotateTheme.addEventListener('click', () => {
    playChime('click');
    if (!appState.settings) appState.settings = {};
    if (appState.settings.themeIndex === undefined) appState.settings.themeIndex = 0;
    appState.settings.themeIndex = (appState.settings.themeIndex + 1) % neonThemes.length;
    applyNeonTheme(appState.settings.themeIndex);
    saveAppState();
  });
}

// Automatically rotate neon theme every 1 minute
setInterval(() => {
  if (!appState.settings) appState.settings = {};
  if (appState.settings.themeIndex === undefined) appState.settings.themeIndex = 0;
  appState.settings.themeIndex = (appState.settings.themeIndex + 1) % neonThemes.length;
  applyNeonTheme(appState.settings.themeIndex);
  saveAppState();
}, 60000);


// --- ACTIVITY LOG LOGIC ---
function logActivity(type, message, extraData = {}) {
  if (!appState.activityLog) appState.activityLog = [];
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toDateString();
  appState.activityLog.push({
    id: Date.now().toString() + Math.random().toString(),
    date: dateStr,
    time: timeStr,
    timestamp: now.getTime(),
    type: type,
    message: message,
    ...extraData
  });
  if (appState.activityLog.length > 200) appState.activityLog = appState.activityLog.slice(-200);
  saveAppState();
    
  // Live update the UI if the modal is open
  if (typeof renderActivityLog === 'function') {
    const overlay = document.getElementById('activity-log-overlay');
    if (overlay && overlay.style.display === 'flex') {
      renderActivityLog();
      const list = document.getElementById('activity-log-list');
      if (list && list.parentElement) list.parentElement.scrollTop = 0;
    }
  }
}

const elActivityLogOverlay = document.getElementById('activity-log-overlay');
const elBtnActivityLog = document.getElementById('btn-activity-log');
const elBtnCloseActivityLog = document.getElementById('btn-close-activity-log');
const elActivityLogList = document.getElementById('activity-log-list');

let currentActivityViewMode = '0';
let currentHistoryCategoryFilter = 'all';

function populateActivityDateDropdown() {
  const elSelect = document.getElementById('activity-date-select');
  if (!elSelect) return;
  
  const resetHour = (appState && appState.settings && appState.settings.dayResetHour) || 5;
  const todayFocusStr = getFocusDateString(resetHour);
  
  const datesSet = new Set();
  datesSet.add(todayFocusStr);
  
  if (appState.activityLog) {
    appState.activityLog.forEach(log => {
      const logTs = log.timestamp || (log.date ? new Date(log.date).getTime() : null);
      if (logTs) {
        const fDate = getFocusDateString(resetHour, logTs);
        datesSet.add(fDate);
      } else if (log.date) {
        datesSet.add(log.date);
      }
    });
  }
  
  const datesArray = Array.from(datesSet);
  datesArray.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  let html = `<option value="all">📁 All History (${(appState.activityLog || []).length} logs)</option>`;
  
  const targetYesterdayMs = new Date().getTime() - (1 * 24 * 3600 * 1000);
  const yesterdayStr = getFocusDateString(resetHour, targetYesterdayMs);

  datesArray.forEach(dStr => {
    let label = dStr;
    if (dStr === todayFocusStr) label = `📅 Today (${dStr})`;
    else if (dStr === yesterdayStr) label = `📅 Yesterday (${dStr})`;
    
    html += `<option value="${dStr}">${label}</option>`;
  });
  
  elSelect.innerHTML = html;
  if (currentActivityViewMode === '0') elSelect.value = todayFocusStr;
  else if (currentActivityViewMode === '1') elSelect.value = yesterdayStr;
  else elSelect.value = currentActivityViewMode;
}

if (elBtnActivityLog) {
  elBtnActivityLog.addEventListener('click', () => {
    playChime('click');
    currentActivityViewMode = 'all';
    currentHistoryCategoryFilter = 'all';
    renderActivityLog();
    elActivityLogOverlay.classList.remove('hidden');
    elActivityLogOverlay.style.display = 'flex';
    
    const list = document.getElementById('activity-log-list');
    if (list && list.parentElement) list.parentElement.scrollTop = 0;
  });
}

if (elBtnCloseActivityLog) {
  elBtnCloseActivityLog.addEventListener('click', () => {
    playChime('click');
    elActivityLogOverlay.classList.add('hidden');
    elActivityLogOverlay.style.display = 'none';
  });
}

const elSelect = document.getElementById('activity-date-select');
if (elSelect) {
  elSelect.addEventListener('change', (e) => {
    if (typeof playChime === 'function') playChime('click');
    currentActivityViewMode = e.target.value;
    renderActivityLog();
  });
}

document.querySelectorAll('.history-filter-pill').forEach(pill => {
  pill.addEventListener('click', (e) => {
    if (typeof playChime === 'function') playChime('click');
    document.querySelectorAll('.history-filter-pill').forEach(p => p.classList.remove('active'));
    e.target.classList.add('active');
    currentHistoryCategoryFilter = e.target.getAttribute('data-filter') || 'all';
    renderActivityLog();
  });
});

const elBtnActivityPrev = document.getElementById('btn-activity-prev');
if (elBtnActivityPrev) {
  elBtnActivityPrev.addEventListener('click', () => {
    if (typeof playChime === 'function') playChime('click');
    const select = document.getElementById('activity-date-select');
    if (select && select.options && select.options.length > 0) {
      let idx = select.selectedIndex;
      if (idx < select.options.length - 1) {
        select.selectedIndex = idx + 1;
        currentActivityViewMode = select.value;
      }
    }
    renderActivityLog();
  });
}

const elBtnActivityNext = document.getElementById('btn-activity-next');
if (elBtnActivityNext) {
  elBtnActivityNext.addEventListener('click', () => {
    if (typeof playChime === 'function') playChime('click');
    const select = document.getElementById('activity-date-select');
    if (select && select.options && select.options.length > 0) {
      let idx = select.selectedIndex;
      if (idx > 0) {
        select.selectedIndex = idx - 1;
        currentActivityViewMode = select.value;
      }
    }
    renderActivityLog();
  });
}

window.handleTimelinePrev = () => {
  if (elBtnActivityPrev) elBtnActivityPrev.click();
};

window.handleTimelineNext = () => {
  if (elBtnActivityNext) elBtnActivityNext.click();
};

function renderActivityLog() {
    if (!elActivityLogList) return;
    elActivityLogList.innerHTML = '';
    
    populateActivityDateDropdown();

    const resetHour = (appState && appState.settings && appState.settings.dayResetHour) || 5;
    const todayFocusStr = getFocusDateString(resetHour);
    const targetYesterdayMs = new Date().getTime() - (1 * 24 * 3600 * 1000);
    const yesterdayStr = getFocusDateString(resetHour, targetYesterdayMs);

    let allLogs = [...(appState.activityLog || [])];

    if (appState.tasks && Array.isArray(appState.tasks)) {
      appState.tasks.forEach(task => {
        if (task.completed && (task.completionNote || task.completionImage || task.completionVideo || task.completionDocument)) {
          const compDate = task.completedAt ? new Date(task.completedAt) : new Date();
          const compDateStr = getFocusDateString(resetHour, compDate.getTime());
          const compTimeStr = compDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const noteText = task.completionNote ? `"${task.completionNote}"` : 'Proof attachment added';
          const refMsg = `Reflection for task "${task.name}": ${noteText}`;
          
          const alreadyLogged = allLogs.some(l => l.type === 'reflection' && (l.message === refMsg || (l.message && l.message.includes(task.name))));
          if (!alreadyLogged) {
            allLogs.push({
              id: 'task_ref_' + task.id,
              type: 'reflection',
              message: refMsg,
              date: compDateStr,
              time: compTimeStr,
              timestamp: compDate.getTime()
            });
          }
        }
      });
    }

    let filteredLogs = [];

    if (currentActivityViewMode === 'all') {
      filteredLogs = [...allLogs];
    } else {
      let targetDateStr = currentActivityViewMode;
      if (targetDateStr === '0') targetDateStr = todayFocusStr;
      if (targetDateStr === '1') targetDateStr = yesterdayStr;

      filteredLogs = allLogs.filter(log => {
        if (log.date === targetDateStr) return true;
        const logTs = log.timestamp || (log.date ? new Date(log.date).getTime() : null);
        if (!logTs) return false;
        return getFocusDateString(resetHour, logTs) === targetDateStr || new Date(logTs).toDateString() === targetDateStr;
      });
    }

    if (currentHistoryCategoryFilter !== 'all') {
      filteredLogs = filteredLogs.filter(log => (log.type || 'task') === currentHistoryCategoryFilter);
    }

    const elCountHeader = document.getElementById('history-total-count');
    if (elCountHeader) {
      elCountHeader.textContent = `Showing ${filteredLogs.length} logged entries`;
    }

    const btnNext = document.getElementById('btn-activity-next');
    const btnPrev = document.getElementById('btn-activity-prev');
    const select = document.getElementById('activity-date-select');
    if (btnNext && select) {
      btnNext.style.opacity = select.selectedIndex <= 1 ? '0.4' : '1';
      btnPrev.style.opacity = select.selectedIndex >= select.options.length - 1 ? '0.4' : '1';
    }

    if (filteredLogs.length === 0) {
      elActivityLogList.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 8px;">📜</div>
          <div style="font-size: 0.95rem; font-weight: 600; color: #fff;">No activity logs found</div>
          <div style="font-size: 0.8rem; margin-top: 4px; opacity: 0.7;">Try changing the date filter or category view above.</div>
        </div>
      `;
      return;
    }

    const sortedLogs = [...filteredLogs].sort((a, b) => {
      const tsA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
      const tsB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
      return tsB - tsA;
    });

    let currentRenderDateHeader = '';

    sortedLogs.forEach(log => {
      const logTs = log.timestamp || (log.date ? new Date(log.date).getTime() : null);
      const logDateDisplay = logTs ? getFocusDateString(resetHour, logTs) : (log.date || todayFocusStr);

      if (currentActivityViewMode === 'all' && logDateDisplay !== currentRenderDateHeader) {
        currentRenderDateHeader = logDateDisplay;
        const headerDiv = document.createElement('div');
        headerDiv.className = 'history-date-header';
        let dLabel = logDateDisplay;
        if (logDateDisplay === todayFocusStr) dLabel = '📅 Today';
        else if (logDateDisplay === yesterdayStr) dLabel = '📅 Yesterday';
        headerDiv.innerHTML = `<span>${dLabel}</span>`;
        elActivityLogList.appendChild(headerDiv);
      }

      const card = document.createElement('div');
      const msg = (log.message || '').toLowerCase();
      
      let cardStyleClass = 'card-info';
      let typeTag = (log.type || 'TASK').toUpperCase();
      let iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';

      if (msg.includes('completed') || msg.includes('finished')) {
        cardStyleClass = 'card-success';
        typeTag = 'COMPLETED';
        iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
      } else if (msg.includes('stopped')) {
        cardStyleClass = 'card-warning';
        typeTag = 'STOPPED';
        iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>';
      } else if (msg.includes('paused') || msg.includes('un-completed')) {
        cardStyleClass = 'card-warning';
        typeTag = 'PAUSED';
        iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
      } else if (msg.includes('deleted') || msg.includes('removed')) {
        cardStyleClass = 'card-danger';
        typeTag = 'REMOVED';
        iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
      } else if (log.type === 'timer') {
        cardStyleClass = 'card-purple';
        typeTag = 'TIMER';
        iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
      } else if (log.type === 'habit') {
        cardStyleClass = 'card-success';
        typeTag = 'HABIT';
        iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>';
      } else if (log.type === 'system') {
        cardStyleClass = 'card-info';
        typeTag = 'SYSTEM';
        iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
      } else if (log.type === 'reflection') {
        cardStyleClass = 'card-info';
        typeTag = 'REFLECTION';
        iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
      }

      let metaHtml = '';
      if (log.startTime || log.stopTime || log.duration) {
        metaHtml = `
          <div class="history-time-meta" style="display: flex; align-items: center; gap: 6px; margin-top: 5px; flex-wrap: wrap;">
            ${log.startTime ? `<span style="background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600; border: 1px solid rgba(16, 185, 129, 0.25);">▶ Start: ${log.startTime}</span>` : ''}
            ${log.stopTime ? `<span style="background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600; border: 1px solid rgba(239, 68, 68, 0.25);">⏹ Stop: ${log.stopTime}</span>` : ''}
            ${log.duration ? `<span style="background: rgba(168, 85, 247, 0.15); color: #c084fc; padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600; border: 1px solid rgba(168, 85, 247, 0.25);">⏱️ ${log.duration} focus</span>` : ''}
          </div>
        `;
      }

      let logoIconsHtml = '';
      const isReflectionLog = log.type === 'reflection' || (log.message && log.message.startsWith('Reflection for task'));

      let matchingTask = null;
      if (appState.tasks && Array.isArray(appState.tasks)) {
        matchingTask = appState.tasks.find(t => (log.taskId && t.id === log.taskId) || (t.name && (log.message || '').toLowerCase().includes(t.name.toLowerCase())));
      }

      const logHasNote = log.hasNote || (isReflectionLog && matchingTask && matchingTask.completionNote);
      const logHasImage = log.hasImage || (isReflectionLog && matchingTask && matchingTask.completionImage);
      const logHasVideo = log.hasVideo || (isReflectionLog && matchingTask && matchingTask.completionVideo);
      const logHasDoc = log.hasDoc || (isReflectionLog && matchingTask && matchingTask.completionDocument);

      const tId = matchingTask ? matchingTask.id : '';

      if (logHasNote || logHasImage || logHasVideo || logHasDoc) {
        let icons = [];

        // 1. Small Notepad Logo for Reflection Note (📝)
        if (logHasNote) {
          icons.push(`
            <span onclick="${tId ? `openTaskDetailsModal('${tId}')` : ''}; event.stopPropagation();" title="Reflection Note Written (Click to view)" style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); color: #c084fc; font-size: 14px; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">📝</span>
          `);
        }

        // 2. Small Image Logo / Thumbnail for Screenshot Proof (🖼️)
        if (logHasImage) {
          const imgSrc = matchingTask ? matchingTask.completionImage : '';
          if (imgSrc) {
            icons.push(`
              <img src="${imgSrc}" onclick="openImageViewer('${imgSrc}'); event.stopPropagation();" title="Screenshot Proof Attached (Click to enlarge full screen)" style="width: 28px; height: 28px; object-fit: cover; border-radius: 6px; border: 1.5px solid var(--color-cyan); cursor: pointer; background: #000; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
            `);
          } else {
            icons.push(`
              <span onclick="${tId ? `openTaskDetailsModal('${tId}')` : ''}; event.stopPropagation();" title="Screenshot Image Attached" style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: rgba(0, 230, 153, 0.2); border: 1px solid rgba(0, 230, 153, 0.4); color: #00e699; font-size: 14px; cursor: pointer;">🖼️</span>
            `);
          }
        }

        // 3. Small Play Button Logo for Video Proof (▶️)
        if (logHasVideo) {
          icons.push(`
            <span onclick="${tId ? `openTaskDetailsModal('${tId}')` : ''}; event.stopPropagation();" title="Video Proof Attached (Click to view/play)" style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; font-size: 14px; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">▶️</span>
          `);
        }

        // 4. Small File Document Logo for Document Attachment (📄)
        if (logHasDoc) {
          icons.push(`
            <span onclick="${tId ? `openTaskDetailsModal('${tId}')` : ''}; event.stopPropagation();" title="Document File Attached (Click to view/download)" style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-size: 14px; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">📄</span>
          `);
        }

        logoIconsHtml = `<div style="display: flex; align-items: center; gap: 5px; flex-shrink: 0; margin-left: 8px;">${icons.join('')}</div>`;
      }

      card.className = `premium-history-card ${cardStyleClass}`;
      card.innerHTML = `
        <div class="history-icon-box">
          ${iconSvg}
        </div>
        <div class="history-card-body" style="flex: 1; display: flex; flex-direction: column;">
          <div class="history-card-top">
            <span class="history-tag">${typeTag}</span>
            <span class="history-time-stamp">${log.time || ''}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div class="history-msg-text" style="flex: 1;">${log.message || ''}</div>
            ${logoIconsHtml}
          </div>
          ${metaHtml}
        </div>
      `;
      elActivityLogList.appendChild(card);
    });
}

// --- App Initialization ---
async function initApp() { try {
  const urlParams = new URLSearchParams(window.location.search);
  isWidgetMode = urlParams.get('mode') === 'widget';
  if (isWidgetMode) {
    document.body.classList.add('widget-mode');
  }

  const loadResult = await window.electronAPI.loadData();
  let loadedData = null;

  if (loadResult) {
    if (loadResult.success !== undefined) {
      // New format: { success: true/false, data: {...}, error: '...' }
      if (!loadResult.success) {
        const el = document.getElementById('active-task-display');
        if (el) el.textContent = 'ErrLoadDB: ' + loadResult.error;
        return;
      }
      loadedData = loadResult.data;
    } else {
      // Old format: raw object
      loadedData = loadResult;
    }
  }
  if (loadedData) {
    appState = loadedData;
    
    // Check missing variables
    if (!appState.history) appState.history = [];
    if (!appState.leaveDays) appState.leaveDays = [];
    if (!appState.settings) {
      appState.settings = {
        notifications: true,
        soundVolume: 0.5,
        dayResetHour: 5,
        themeIndex: 0
      };
    }
    if (!appState.habits) {
      appState.habits = [
        { id: '1', name: 'Drink water (8 glasses)', completed: false, streak: 0 },
        { id: '2', name: 'Stretch for 5 minutes', completed: false, streak: 0 },
        { id: '3', name: 'Read a book chapter', completed: false, streak: 0 }
      ];
    }
    if (appState.distractionsCount === undefined) appState.distractionsCount = 0;
    if (appState.settings.dayResetHour === undefined) appState.settings.dayResetHour = 5;
    if (appState.settings.soundVolume === undefined) appState.settings.soundVolume = 0.5;
    if (appState.settings.themeIndex === undefined) appState.settings.themeIndex = 0;
    if (appState.settings.autoStartBreak === undefined) appState.settings.autoStartBreak = false;
    
    // Apply Global Neon Theme
    applyNeonTheme(appState.settings.themeIndex);
    
    const resetHour = appState.settings.dayResetHour;
    const focusDateStr = getFocusDateString(resetHour);
    
    isAppCloseLogged = false;
    logActivity('system', 'App started / Session started');

    if (appState.settings.lastActiveDate !== focusDateStr) {
      performDayRollover(appState.settings.lastActiveDate, focusDateStr);
    }
    
    // Setup interval to check for day rollover while the app is running
    setInterval(() => {
      const currentFocusDateStr = getFocusDateString(appState.settings.dayResetHour);
      if (appState.settings.lastActiveDate && appState.settings.lastActiveDate !== currentFocusDateStr) {
        performDayRollover(appState.settings.lastActiveDate, currentFocusDateStr);
        renderTasks();
        renderStats();
        renderSelectedDayTasks();
      }
    }, 60000);
  } else {
    appState.settings.lastActiveDate = getFocusDateString(appState.settings.dayResetHour);
    saveAppState();
  }

  // Load autostart
  try {
    const isAutoStart = await window.electronAPI.getAutostart();
    appState.settings.autostart = isAutoStart;
  } catch (err) {
    console.error("Autostart setting fetch failed:", err);
  }

  currentTimer = appState.settings.focusDurationMinutes * 60;
  
  // Setup focus MP3 streaming volume and player source
  elBgMusicPlayer.volume = parseFloat(elSoundMusicVolume.value);
  initStations();

  currentStationIndex = appState.settings.currentMusicIndex || 0;
  loadStation(currentStationIndex);
  if (appState.settings.isMusicPlaying) {
    playMusic();
  }

  startQuoteRotation();
  syncSettingsToUI();
  setupEventListeners();
  renderAll();
  loadStation(currentStationIndex);
} catch (err) { const el = document.getElementById('active-task-display'); if(el) el.textContent = 'ErrInit: ' + err.message; } }

async function saveAppState() {
  const result = await window.electronAPI.saveData(JSON.parse(JSON.stringify(appState)));
  if (result && !result.success) {
    const el = document.getElementById('active-task-display');
    if (el) el.textContent = 'ErrSaveDB: ' + result.error;
  }
}

// --- Render Operations ---
function renderAll() {
  renderTimer();
  renderStats();
  renderTasks();
  renderHabits();
}

function renderTimer() { try {
  let displayString = formatTime(currentTimer);
  let ringPercent = (currentTimer / (appState.settings.focusDurationMinutes * 60)) * 100;

  if (activeTaskId && sessionType === 'focus') {
    const task = appState.tasks.find(t => t.id === activeTaskId);
    if (task && !task.completed) {
      if (task.type === 'quantity') {
        displayString = `${task.currentQty} / ${task.targetQty}`;
        ringPercent = (task.currentQty / task.targetQty) * 100;
        if (elMiniBtnQtyPlus) elMiniBtnQtyPlus.style.display = 'inline-flex';
      } else if (task.type === 'duration') {
        const remaining = Math.max(0, task.targetDuration - task.currentDuration);
        displayString = formatTime(remaining);
        ringPercent = (task.currentDuration / task.targetDuration) * 100;
        if (elMiniBtnQtyPlus) elMiniBtnQtyPlus.style.display = 'none';
      } else {
        if (elMiniBtnQtyPlus) elMiniBtnQtyPlus.style.display = 'none';
      }
    } else {
      if (elMiniBtnQtyPlus) elMiniBtnQtyPlus.style.display = 'none';
    }
  } else {
    if (elMiniBtnQtyPlus) elMiniBtnQtyPlus.style.display = 'none';
  }
  
  elTimerTime.innerHTML = displayString;
  if (isWidgetMode) {
    elTimerTime.style.fontSize = displayString.length > 8 ? '1.7rem' : '2.5rem';
  } else {
    elTimerTime.style.fontSize = displayString.length > 8 ? '3.0rem' : '5rem';
  }
  elTimerTime.style.whiteSpace = 'nowrap';
  
  const elRing = document.getElementById('goal-progress-ring');
  if (elRing) {
    const RING_CIRC = 552.92;
    const offset = RING_CIRC - (Math.min(100, Math.max(0, ringPercent)) / 100) * RING_CIRC;
    elRing.style.strokeDashoffset = offset;
  }
  
  const elSecRing = document.getElementById('seconds-progress-ring');
  if (elSecRing) {
    const SEC_CIRC = 477.52;
    const s = currentTimer % 60;
    const secOffset = SEC_CIRC - (s / 60) * SEC_CIRC;
    elSecRing.style.strokeDashoffset = secOffset;
  }
  
  const btnTakeBreak = document.getElementById('btn-take-break');
  if (sessionType === 'focus') {
    elTimerStateLabel.textContent = timerRunning ? 'Focusing' : 'Ready to Focus';
    elTimerStateLabel.style.color = 'var(--color-purple)';
    if (btnTakeBreak) {
      btnTakeBreak.innerHTML = '☕ Break';
      btnTakeBreak.className = 'control-btn btn-pill secondary-btn';
      btnTakeBreak.removeAttribute('style');
    }
  } else if (sessionType === 'shortBreak' || sessionType === 'longBreak') {
    const labelText = sessionType === 'shortBreak' ? `☕ Break (${Math.ceil(currentTimer / 60)}m)` : `☕ Long Break (${Math.ceil(currentTimer / 60)}m)`;
    elTimerStateLabel.textContent = labelText;
    elTimerStateLabel.style.color = sessionType === 'shortBreak' ? 'var(--color-amber)' : 'var(--color-cyan)';
    if (btnTakeBreak) {
      btnTakeBreak.innerHTML = '▶ Resume Focus';
      btnTakeBreak.className = 'control-btn btn-pill primary-pill-btn';
      btnTakeBreak.removeAttribute('style');
    }
  }

  if (activeTaskId) {
    const task = appState.tasks.find(t => t.id === activeTaskId);
    const taskName = task ? task.name : 'No Active Task';
    elActiveTaskDisplay.textContent = taskName;
    if (elMiniActiveTaskName) elMiniActiveTaskName.textContent = taskName;
  } else {
    const defaultText = sessionType === 'focus' ? 'General Session' : 'Relaxing';
    elActiveTaskDisplay.textContent = defaultText;
    if (elMiniActiveTaskName) elMiniActiveTaskName.textContent = defaultText;
  }

  if (timerRunning) {
    elPlayIcon.classList.add('hidden');
    elPauseIcon.classList.remove('hidden');
    if (elMiniTimerPlayPause) {
      elMiniTimerPlayPause.innerHTML = `<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><rect x="6" y="4" width="3" height="16"/><rect x="14" y="4" width="3" height="16"/></svg>`;
      elMiniTimerPlayPause.title = "Pause Timer";
    }
  } else {
    elPlayIcon.classList.remove('hidden');
    elPauseIcon.classList.add('hidden');
    if (elMiniTimerPlayPause) {
      elMiniTimerPlayPause.innerHTML = `<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
      elMiniTimerPlayPause.title = "Start Timer";
    }
  }
} catch (err) { const el = document.getElementById('active-task-display'); if(el) el.textContent = 'ErrTmr: ' + err.message; } }

// --- Productivity Score Gamification ---
function getTaskSeconds(task) {
  if (task.type === 'duration' && task.targetDuration > 0) return task.targetDuration;
  let secs = 0;
  const hrMatch = task.name.match(/([\d.]+)\s*(?:hr|hour|h)s?/i);
  if (hrMatch) secs += parseFloat(hrMatch[1]) * 3600;
  const minMatch = task.name.match(/([\d.]+)\s*(?:min|minute|m)s?/i);
  if (minMatch) secs += parseFloat(minMatch[1]) * 60;
  
  
  
  return secs;
}

function getTodayGoalSeconds() {
  const today = new Date();
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayWeekday = weekdays[today.getDay()];
  
  const activeTodayTasks = appState.tasks.filter(t => {
    const activeDate = isTaskActiveOnDate(t, today);
    const dayMatch = taskMatchesDay(t, todayWeekday);
    return activeDate && dayMatch;
  });

  let totalScheduledSecs = 0;
  activeTodayTasks.forEach(task => {
    totalScheduledSecs += getTaskSeconds(task);
  });

  if (totalScheduledSecs === 0) {
    return (appState.settings.dailyGoalHours || 8) * 3600;
  }
  return totalScheduledSecs;
}

function calculateProductivityScore() {
  const today = new Date();
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayWeekday = weekdays[today.getDay()];
  
  const activeTodayTasks = appState.tasks.filter(t => {
    const activeDate = isTaskActiveOnDate(t, today);
    const dayMatch = taskMatchesDay(t, todayWeekday);
    return activeDate && dayMatch;
  });

  let totalItems = 0;
  let completedItems = 0;
  
  activeTodayTasks.forEach(t => {
    const target = t.targetQty || 1;
    if (t.type === 'quantity') {
      totalItems += target;
      completedItems += t.currentQty || 0;
      
      if (t.completed && (t.currentQty || 0) < target) {
        completedItems += (target - (t.currentQty || 0));
      }
    } else {
      totalItems++;
      if (t.completed) completedItems++;
    }
    // Always count subtasks/checklist items
    if (t.subtasks && t.subtasks.length > 0) {
      t.subtasks.forEach(st => {
        totalItems++;
        if (st.completed) completedItems++;
      });
    }
  });

  let taskPoints = 0;
  let maxTaskPoints = 50; // 50% of score from tasks
  if (totalItems > 0) {
    taskPoints = (completedItems / totalItems) * maxTaskPoints;
  } else {
    taskPoints = maxTaskPoints; // if no quantity tasks or checklists, give free points
  }
  
  let habitPoints = 0;
  let maxHabitPoints = 50; // 50% of score from habits
  if (appState.habits.length > 0) {
    const completedHabitsCount = appState.habits.filter(h => h.completed).length;
    habitPoints = (completedHabitsCount / appState.habits.length) * maxHabitPoints;
  } else {
    habitPoints = maxHabitPoints; // if no habits, give free points
  }

  // If there are no tasks and no habits, score should be 0, not 100.
  if (activeTodayTasks.length === 0 && appState.habits.length === 0) {
    taskPoints = 0;
    habitPoints = 0;
  }
  
  const distractionPenalty = Math.min(30, appState.distractionsCount * 5);
  let score = Math.round(taskPoints + habitPoints - distractionPenalty);
  return Math.max(0, Math.min(100, score));
}

function renderStats() {
  const today = new Date();
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayWeekday = weekdays[today.getDay()];
  
  const activeTodayTasks = appState.tasks.filter(t => {
    const activeDate = isTaskActiveOnDate(t, today);
    const dayMatch = taskMatchesDay(t, todayWeekday);
    return activeDate && dayMatch;
  });

  let totalScheduledSecs = 0;
  let completedScheduledSecs = 0;
  activeTodayTasks.forEach(task => {
    const secs = getTaskSeconds(task);
    totalScheduledSecs += secs;
    if (task.completed) {
      completedScheduledSecs += secs;
    }
  });

  const todayStr = today.toDateString();
  if (appState.halfLeaveDays && appState.halfLeaveDays.includes(todayStr)) {
    totalScheduledSecs /= 2;
    completedScheduledSecs /= 2;
  } else if (appState.leaveDays && appState.leaveDays.includes(todayStr)) {
    totalScheduledSecs = 0;
    completedScheduledSecs = 0;
  }

  if (totalScheduledSecs === 0) totalScheduledSecs = (appState.settings.dailyGoalHours || 8) * 3600;

  if (elLeaveReasonDisplay) {
    if (appState.leaveReasons && appState.leaveReasons[todayStr] && (appState.halfLeaveDays?.includes(todayStr) || appState.leaveDays?.includes(todayStr))) {
      elLeaveReasonDisplay.textContent = `(${appState.leaveReasons[todayStr]})`;
      elLeaveReasonDisplay.style.display = 'inline-block';
    } else {
      elLeaveReasonDisplay.style.display = 'none';
    }
  }

  if (elStatFocusTime) elStatFocusTime.textContent = formatHoursMinutes(appState.focusTimeToday);
  if (elStatFocusTarget) {
    const gHrs = Math.floor(totalScheduledSecs / 3600);
    const gMins = Math.floor((totalScheduledSecs % 3600) / 60);
    elStatFocusTarget.textContent = `/ ${gHrs}h ${gMins.toString().padStart(2, '0')}m`;
  }
  
  const focusPercent = Math.min(100, Math.floor((appState.focusTimeToday / totalScheduledSecs) * 100));
  if (elStatFocusBar) elStatFocusBar.style.width = `${focusPercent}%`;
  
  const offset = RING_CIRCUMFERENCE - (focusPercent / 100) * RING_CIRCUMFERENCE;
  if (elGoalProgressRing) elGoalProgressRing.style.strokeDashoffset = offset;

  const score = calculateProductivityScore();
  if (elStatProdScore) elStatProdScore.textContent = score;
  if (elStatProdBar) elStatProdBar.style.width = `${score}%`;
  if (elDistractionCountBadge) elDistractionCountBadge.textContent = `${appState.distractionsCount} logged today`;
}

// --- Habits Management ---
function renderHabits() {
  elHabitList.innerHTML = '';
  appState.habits.forEach(habit => {
    const li = document.createElement('li');
    li.className = `habit-item ${habit.completed ? 'completed' : ''}`;
    li.innerHTML = `
      <div class="habit-item-left" onclick="toggleHabit('${habit.id}')">
        <div class="habit-checkbox">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <span class="habit-name">${habit.name}</span>
        <span class="habit-streak" title="Streak">🔥 ${habit.streak}d</span>
      </div>
      <button class="btn-delete-habit" onclick="deleteHabit('${habit.id}')">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    elHabitList.appendChild(li);
  });
}

function toggleHabit(id) {
  const habit = appState.habits.find(h => h.id === id);
  if (!habit) return;
  habit.completed = !habit.completed;
  logActivity('habit', `${habit.completed ? 'Completed' : 'Un-completed'} habit: ${habit.name}`);
  
  if (!appState.habitData) appState.habitData = {};
  const today = new Date();
  const key = `${today.getFullYear()}-${today.getMonth()}-${habit.id}-${today.getDate()}`;
  appState.habitData[key] = habit.completed;
  
  playChime(habit.completed ? 'taskComplete' : 'click');
  renderHabits();
  renderStats();
  saveAppState();
}

function deleteHabit(id) {
  playChime('click');
  const habit = appState.habits.find(h => h.id === id);
  if (habit) {
    logActivity('habit', `Deleted habit: "${habit.name}"`);
  }
  appState.habits = appState.habits.filter(h => h.id !== id);
  renderHabits();
  renderStats();
  saveAppState();
}

// --- Distractions Shield ---
// --- Simulated AI Day Review Engine ---
function generateAIReview() {
  const btn = document.getElementById('btn-generate-ai-review');
  const reviewContent = document.getElementById('ai-review-content');
  if (!btn || !reviewContent) return;
  
  btn.disabled = true;
  reviewContent.innerHTML = `<span style="opacity: 0.7;">✨ AI is analyzing your performance...</span>`;
  
  setTimeout(() => {
    const stats = typeof compileDailyStats === 'function' ? compileDailyStats() : { focusSeconds: 0 };
    const report = typeof generateCoachingReport === 'function' ? generateCoachingReport(stats) : { score: 0, grade: "Novice", summary: "Keep working hard!" };
    
    const scoreColor = report.score >= 90 ? 'var(--color-green)' : (report.score >= 70 ? 'var(--color-purple)' : 'var(--color-red)');
    
    reviewContent.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px; margin-top: 5px;">
        <div style="width: 46px; height: 46px; border-radius: 50%; background: conic-gradient(${scoreColor} ${report.score}%, rgba(255,255,255,0.05) 0); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 0 10px rgba(0,0,0,0.5);">
          <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--bg-main); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; color: ${scoreColor};">
            ${report.score}
          </div>
        </div>
        <div style="flex: 1; font-style: normal; font-size: 13px; line-height: 1.4; color: var(--text-main);">
          <strong style="color: ${scoreColor};">${report.grade}:</strong> ${report.summary}
        </div>
      </div>
    `;
    
    btn.disabled = false;
    btn.textContent = "Refresh";
    
    if (typeof playChime === 'function') playChime('click');
    
  }, 1200);
}

// Leaderboard function removed

// --- Monthly Calendar heat-map Planner ---
function renderCalendar() {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  elCalendarMonthYear.textContent = `${monthNames[currentCalMonth]} ${currentCalYear}`;
  elCalendarDaysGrid.innerHTML = '';

  const firstDayIndex = new Date(currentCalYear, currentCalMonth, 1).getDay();
  const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
  
  // Render empty cells for leading weekday padding
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day-cell empty-day';
    elCalendarDaysGrid.appendChild(emptyCell);
  }

  const todayFocusDateStr = getFocusDateString(appState.settings.dayResetHour);
  const selectedCalDateStr = selectedCalDate.toDateString();

  // Render day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(currentCalYear, currentCalMonth, day);
    const cellDateStr = cellDate.toDateString();
    
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day-cell';
    dayCell.innerHTML = `<span class="day-number">${day}</span>`;
    
    if (cellDateStr === selectedCalDateStr) {
      dayCell.classList.add('selected-day');
    }

    // Check if on leave
    if (appState.leaveDays && appState.leaveDays.includes(cellDateStr)) {
      dayCell.classList.add('day-leave');
      dayCell.title = `${day} ${monthNames[currentCalMonth]}: Planned Leave Day ✈️`;
    } else {
      let totalTasks = 0;
      let completedTasks = 0;
      let rate = null;

      // Check if this date represents TODAY
      if (cellDateStr === todayFocusDateStr) {
        dayCell.classList.add('today-cell');
        const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const todayWeekday = weekdays[cellDate.getDay()];
        
        // Filter tasks that are scheduled for today's weekday (or unscheduled if it is today)
        const activeTodayTasks = appState.tasks.filter(t => {
          const matchesDay = taskMatchesDay(t, todayWeekday) || (cellDateStr === todayFocusDateStr && (!t.plannerDay && (!t.plannerDays || t.plannerDays.length === 0)));
          return matchesDay && isTaskActiveOnDate(t, cellDate);
        });

        totalTasks = activeTodayTasks.length;
        completedTasks = activeTodayTasks.filter(t => t.completed).length;
        if (totalTasks > 0) rate = completedTasks / totalTasks;
      } else {
        const todayObj = new Date(todayFocusDateStr);
        if (cellDate > todayObj) {
          const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
          const targetWeekday = weekdays[cellDate.getDay()];
          const activeFutureTasks = appState.tasks.filter(t => {
            const matchesDay = taskMatchesDay(t, targetWeekday);
            return matchesDay && isTaskActiveOnDate(t, cellDate);
          });
          totalTasks = activeFutureTasks.length;
        } else {
          // Check historical data records
          const historyEntry = appState.history.find(h => h.date === cellDateStr);
          if (historyEntry) {
            totalTasks = historyEntry.totalTasks || 0;
            completedTasks = historyEntry.completedTasks || 0;
            if (totalTasks > 0) rate = completedTasks / totalTasks;
          }
        }
      }

      // Color Code based on task completion percentage rates
      if (cellDate > new Date(todayFocusDateStr) && totalTasks > 0) {
        dayCell.classList.add('day-future-scheduled');
      } else if (rate === null || totalTasks === 0) {
        dayCell.classList.add('day-neutral');
      } else if (rate < 0.5) {
        dayCell.classList.add('day-red');
      } else if (rate < 0.75) {
        dayCell.classList.add('day-amber');
      } else if (rate < 1.0) {
        dayCell.classList.add('day-blue');
      } else {
        dayCell.classList.add('day-green');
        dayCell.classList.add('day-complete');
      }

      dayCell.title = totalTasks > 0 ? 
        `${day} ${monthNames[currentCalMonth]}: Completed ${completedTasks}/${totalTasks} tasks (${Math.round(rate * 100)}%)` : 
        `${day} ${monthNames[currentCalMonth]}: No tasks scheduled`;
    }



    dayCell.addEventListener('click', () => {
      playChime('click');
      selectedCalDate = cellDate;
      renderCalendar();
      renderSelectedDayTasks();
    });

    elCalendarDaysGrid.appendChild(dayCell);
  }
}

function getEffectiveTaskTarget(task, dateStr) {
  const isOnHalfLeave = appState.halfLeaveDays && appState.halfLeaveDays.includes(dateStr);
  if (task.type === 'quantity') {
    return isOnHalfLeave ? Math.ceil(task.targetQty / 2) : task.targetQty;
  } else if (task.type === 'duration') {
    return isOnHalfLeave ? task.targetDuration / 2 : task.targetDuration;
  }
  return 1;
}

// --- Render Selected Day Details Pane ---
function renderSelectedDayTasks() {
  const weekdaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const dayName = weekdaysFull[selectedCalDate.getDay()];
  const dateStr = `${dayName}, ${monthNames[selectedCalDate.getMonth()]} ${selectedCalDate.getDate()}`;
  elSelectedDayLabel.textContent = dateStr;

  const cellDateStr = selectedCalDate.toDateString();
  const isOnFullLeave = appState.leaveDays && appState.leaveDays.includes(cellDateStr);
  const isOnHalfLeave = appState.halfLeaveDays && appState.halfLeaveDays.includes(cellDateStr);
  
  // Update leave badge & leave toggle button
  if (isOnFullLeave) {
    elSelectedDayTypeBadge.textContent = "Full Leave";
    elSelectedDayTypeBadge.className = "badge-count text-red";
    elBtnToggleLeave.textContent = "✈️ Cancel Full Leave";
    elBtnToggleLeave.className = "control-btn primary-btn text-btn-label full-width";
  } else if (isOnHalfLeave) {
    elSelectedDayTypeBadge.textContent = "Half Leave";
    elSelectedDayTypeBadge.className = "badge-count text-amber";
    elBtnToggleLeave.textContent = "✈️ Mark Full Leave";
    elBtnToggleLeave.className = "control-btn secondary-btn text-btn-label full-width";
  } else {
    elSelectedDayTypeBadge.textContent = "Working Day";
    elSelectedDayTypeBadge.className = "badge-count text-purple";
    elBtnToggleLeave.textContent = "✈️ Mark Half Leave";
    elBtnToggleLeave.className = "control-btn secondary-btn text-btn-label full-width";
  }

  if (elLeaveReasonContainer) {
    if (isOnFullLeave || isOnHalfLeave) {
      elLeaveReasonContainer.style.display = 'block';
      elLeaveReasonInput.style.display = 'none';
      elLeaveReasonTextView.style.display = 'flex';
      
      const reason = (appState.leaveReasons && appState.leaveReasons[cellDateStr]) || '';
      elLeaveReasonInput.value = reason;
      
      if (reason) {
        elLeaveReasonTextContent.textContent = reason;
        elLeaveReasonTextContent.style.opacity = '1';
      } else {
        elLeaveReasonTextContent.textContent = 'No reason provided';
        elLeaveReasonTextContent.style.opacity = '0.5';
      }
    } else {
      elLeaveReasonContainer.style.display = 'none';
    }
  }

  const elFocusTime = document.getElementById('selected-day-focus-time');
  if (elFocusTime) {
    if (cellDateStr === new Date().toDateString()) {
      elFocusTime.textContent = formatHoursMinutes(appState.focusTimeToday || 0);
    } else {
      const hEntry = appState.history.find(h => h.date === cellDateStr);
      elFocusTime.textContent = hEntry ? formatHoursMinutes(hEntry.focusSeconds || 0) : "0h 00m";
    }
  }

  elSelectedDayTasksList.innerHTML = '';
  
  const weekdaysShort = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const targetWeekday = weekdaysShort[selectedCalDate.getDay()];

  // Filter tasks that are scheduled for this specific weekday AND fall within start/end dates
  const todayFocusStr = getFocusDateString(appState.settings.dayResetHour);
  const isTodayCell = cellDateStr === todayFocusStr;
  const scheduledTasks = appState.tasks.filter(t => {
    // If the task has historical data recorded for this exact day, explicitly show it!
    if (t.history && t.history[cellDateStr]) {
      return true;
    }
    
    const isActive = isTaskActiveOnDate(t, selectedCalDate);
    if (!isActive) return false;
    
    if (t.plannerDays && t.plannerDays.length > 0) {
      return t.plannerDays.includes(targetWeekday);
    } else if (t.plannerDay && t.plannerDay !== 'any' && t.plannerDay !== 'multi') {
      return t.plannerDay === targetWeekday;
    } else {
      // General tasks show up on Today
      if (isTodayCell) return true;
      // Tasks with explicit dates show up on the dates they are active
      if (t.startDate || (t.endDateType === 'specific' && t.endDate)) {
        return true;
      }
      return false;
    }
  });

  const isFutureCell = new Date(cellDateStr) > new Date(todayFocusStr);

  if (scheduledTasks.length > 0) {
    const pendingTasks = [];
    const completedTasks = [];
    
    // Pre-compute completions for past dates using activityLog
    const isPastCell = new Date(cellDateStr) < new Date(todayFocusStr);
    let pastCompletions = {};
    
    if (isPastCell && appState.activityLog) {
      // Reconstruct the final completion state of each task at the end of the past day
      const dayLogs = appState.activityLog.filter(log => log.date === cellDateStr && log.type === 'task');
      dayLogs.forEach(log => {
        if (log.message.startsWith('Completed task: ')) {
          const tName = log.message.replace('Completed task: ', '').trim();
          pastCompletions[tName] = true;
        } else if (log.message.startsWith('Un-completed task: ')) {
          const tName = log.message.replace('Un-completed task: ', '').trim();
          pastCompletions[tName] = false;
        }
      });
    }
    
    scheduledTasks.forEach(task => {
      let isCompleted = false;
      
      if (isFutureCell) {
        isCompleted = false;
      } else if (isPastCell) {
        isCompleted = !!pastCompletions[task.name];
      } else {
        // Today
        isCompleted = task.completed;
      }
      
      if (isCompleted) {
        completedTasks.push(task);
      } else {
        pendingTasks.push(task);
      }
    });
    
    const renderTaskLi = (task, isCompleted) => {
      const li = document.createElement('li');
      li.className = `task-item ${isCompleted ? 'completed' : ''}`;
      
      let badgeText = 'Checklist';
      if (isPastCell && task.history && task.history[cellDateStr]) {
        const hData = task.history[cellDateStr];
        if (task.type === 'quantity') {
          const target = getEffectiveTaskTarget(task, cellDateStr);
          badgeText = `${hData.qty || 0}/${target} Qty`;
        } else if (task.type === 'duration') {
          const mins = Math.floor((hData.duration || 0) / 60);
          badgeText = `${mins}m logged`;
        } else {
          badgeText = isCompleted ? 'Done' : 'Missed';
        }
      } else if (isPastCell) {
        badgeText = isCompleted ? 'Done' : 'Missed';
      } else if (task.type === 'quantity') {
        const target = getEffectiveTaskTarget(task, cellDateStr);
        const current = isFutureCell ? 0 : task.currentQty;
        if (isCompleted) badgeText = 'Done';
        else badgeText = `${current}/${target} Qty`;
      } else if (task.type === 'duration') {
        const target = getEffectiveTaskTarget(task, cellDateStr);
        const current = isFutureCell ? 0 : task.currentDuration;
        if (isCompleted) badgeText = 'Done';
        else {
          const remaining = Math.max(0, target - current);
          const remainingMins = Math.floor(remaining / 60);
          badgeText = `${remainingMins}m left`;
        }
      } else {
        if (isCompleted) badgeText = 'Done';
      }

      li.innerHTML = `
        <div class="task-item-main" style="padding: 2px 0; cursor: pointer; display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div class="task-item-left" style="display: flex; align-items: center; gap: 10px;">
            <div class="custom-checkbox" style="pointer-events: none;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <span class="task-name">${task.name}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="task-badge">${badgeText}</span>
            <button class="btn-edit-task" title="Edit Task" onclick="openTaskDetails('${task.id}'); event.stopPropagation();" style="background: transparent; border: none; padding: 2px 4px; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.8; transition: all 0.2s ease;">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <svg class="dropdown-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s; color: var(--text-muted);"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
        <div class="task-activity-dropdown hidden" style="padding-left: 34px; padding-top: 8px; padding-bottom: 4px; font-size: 0.85rem; color: var(--text-muted); display: none;"></div>
      `;

      const mainItem = li.querySelector('.task-item-main');
      const dropdown = li.querySelector('.task-activity-dropdown');
      const icon = li.querySelector('.dropdown-icon');

      mainItem.addEventListener('click', () => {
        if (typeof playChime === 'function') playChime('click');
        
        if (dropdown.classList.contains('hidden')) {
          const dayLogs = (appState.activityLog || []).filter(log => {
            const resetHour = appState.settings ? appState.settings.dayResetHour : 5;
            const logTs = log.timestamp || (log.date ? new Date(log.date).getTime() : null);
            const logDateDisplay = logTs ? getFocusDateString(resetHour, logTs) : (log.date || getFocusDateString(resetHour));
            
            if (logDateDisplay !== cellDateStr) return false;
            if (!log.message.toLowerCase().includes(task.name.toLowerCase())) return false;
            return true;
          });
          
          let detailsHtml = `<button class="control-btn" onclick="openTaskDetailsModal('${task.id}'); event.stopPropagation();" style="padding: 6px 12px; background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.5); color: #c084fc; border-radius: 8px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 10px; width: 100%; justify-content: center;">🔍 View Full Details in Big Window</button>`;

          // Task Notes
          if (task.notes) {
            detailsHtml += `<div style="font-size: 0.8rem; color: #cbd5e1; margin-bottom: 8px; font-style: italic; background: rgba(255,255,255,0.03); padding: 6px 10px; border-radius: 6px; border-left: 2px solid var(--theme-color);">📝 <strong>Note:</strong> ${task.notes}</div>`;
          }

          // Subtasks
          if (task.subtasks && task.subtasks.length > 0) {
            const subList = task.subtasks.map(st => `<div style="font-size: 0.78rem; color: ${st.completed ? 'var(--text-muted)' : '#e2e8f0'}; text-decoration: ${st.completed ? 'line-through' : 'none'}; display: flex; align-items: center; gap: 6px; margin-top: 2px;"><span>${st.completed ? '✓' : '○'}</span> ${st.name}</div>`).join('');
            detailsHtml += `<div style="margin-bottom: 8px; background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 6px;"><div style="font-size: 0.75rem; font-weight: 700; color: var(--theme-color); margin-bottom: 4px;">Subtasks (${task.subtasks.filter(s=>s.completed).length}/${task.subtasks.length}):</div>${subList}</div>`;
          }

          // Images, Reflection Notes, Video & Document Proofs
          if (task.completionNote || task.completionImage || task.completionVideo || task.completionDocument) {
            let imgHtml = '';
            if (task.completionImage) {
              imgHtml = `<img src="${task.completionImage}" onclick="openImageViewer('${task.completionImage}'); event.stopPropagation();" title="Click to enlarge screenshot proof" style="max-height: 140px; width: auto; max-width: 100%; border-radius: 6px; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); margin-top: 6px; display: block; object-fit: contain; background: #000;">`;
            }
            let videoHtml = '';
            if (task.completionVideo) {
              videoHtml = `<video controls src="${task.completionVideo}" style="max-height: 140px; width: 100%; border-radius: 6px; margin-top: 6px; background: #000; border: 1px solid rgba(59, 130, 246, 0.4);"></video>`;
            }
            let docHtml = '';
            if (task.completionDocument && task.completionDocument.data) {
              docHtml = `<a href="${task.completionDocument.data}" download="${task.completionDocument.name || 'attachment'}" onclick="event.stopPropagation();" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 6px; color: #10b981; font-size: 11px; text-decoration: none; margin-top: 6px; font-weight: 600;">📄 ${task.completionDocument.name || 'Download Document'} ⬇️</a>`;
            }
            let noteHtml = task.completionNote ? `<div style="font-size: 0.8rem; color: var(--theme-color); font-style: italic; margin-top: 2px; line-height: 1.4;">" ${task.completionNote} "</div>` : '';
            
            detailsHtml += `
              <div class="task-reflection-box" style="margin-bottom: 8px; padding: 8px 10px; background: rgba(255,255,255,0.04); border-left: 3px solid var(--theme-color); border-radius: 6px;">
                <div style="font-size: 0.75rem; font-weight: 700; color: #fff; margin-bottom: 4px;">💡 Reflection & Proof Attachments:</div>
                ${noteHtml}
                ${imgHtml}
                ${videoHtml}
                ${docHtml}
              </div>
            `;
          }

          // Activity Logs
          let logsHtml = '';
          if (dayLogs.length > 0) {
            logsHtml = dayLogs.map(l => {
              let timeStr = l.time;
              if (l.startTime && l.stopTime) timeStr = `${l.startTime} - ${l.stopTime}`;
              return `<div style="padding: 4px 0; border-left: 2px solid rgba(255,255,255,0.1); padding-left: 10px; margin-bottom: 6px;">
                <div style="font-size: 0.75rem; font-weight: 600; color: #a1a1aa; margin-bottom: 2px;">${timeStr}</div>
                <div>${l.message}</div>
              </div>`;
            }).join('');
          } else if (!detailsHtml) {
            logsHtml = '<div style="opacity: 0.5; padding: 4px 0;">No activity logged for this task on this day.</div>';
          }

          dropdown.innerHTML = detailsHtml + logsHtml;

          dropdown.classList.remove('hidden');
          dropdown.style.display = 'block';
          icon.style.transform = 'rotate(180deg)';
        } else {
          dropdown.classList.add('hidden');
          dropdown.style.display = 'none';
          icon.style.transform = 'rotate(0deg)';
        }
      });

      return li;
    };

    pendingTasks.forEach(task => {
      elSelectedDayTasksList.appendChild(renderTaskLi(task, false));
    });
    
    if (completedTasks.length > 0) {
      const sep = document.createElement('li');
      sep.style.cssText = "list-style: none; text-align: center; font-size: 10px; font-weight: bold; color: var(--text-muted); margin: 8px 0 4px; letter-spacing: 1px; text-transform: uppercase;";
      sep.textContent = `Completed Tasks (${completedTasks.length})`;
      elSelectedDayTasksList.appendChild(sep);
      
      completedTasks.forEach(task => {
        elSelectedDayTasksList.appendChild(renderTaskLi(task, true));
      });
      
      const elCompletedTasks = document.getElementById('selected-day-completed-tasks');
      if (elCompletedTasks) elCompletedTasks.textContent = completedTasks.length;
    } else {
      const elCompletedTasks = document.getElementById('selected-day-completed-tasks');
      if (elCompletedTasks) elCompletedTasks.textContent = "0";
    }
  } else {
    elSelectedDayTasksList.innerHTML = `
      <li class="settings-desc" style="text-align: center; padding: 30px 10px; opacity: 0.6;">
        No tasks scheduled for this day of the week (${dayName}).
      </li>
    `;
    const elCompletedTasks = document.getElementById('selected-day-completed-tasks');
    if (elCompletedTasks) elCompletedTasks.textContent = "0";
  }
}

// Leave toggle click event
if (elLeaveReasonTextView) {
  elLeaveReasonTextView.addEventListener('click', () => {
    elLeaveReasonTextView.style.display = 'none';
    elLeaveReasonInput.style.display = 'block';
    elLeaveReasonInput.focus();
  });
}

if (elLeaveReasonInput) {
  elLeaveReasonInput.addEventListener('blur', () => {
    renderSelectedDayTasks();
  });
  elLeaveReasonInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      elLeaveReasonInput.blur();
    }
  });
  elLeaveReasonInput.addEventListener('input', (e) => {
    const cellDateStr = selectedCalDate.toDateString();
    if (!appState.leaveReasons) appState.leaveReasons = {};
    appState.leaveReasons[cellDateStr] = e.target.value;
    saveAppState();
    
    // If we're editing today's reason, update the dashboard live
    if (cellDateStr === new Date().toDateString()) {
      renderStats();
    }
  });
}

elBtnToggleLeave.addEventListener('click', () => {
  playChime('click');
  const cellDateStr = selectedCalDate.toDateString();
  
  if (!appState.leaveDays) appState.leaveDays = [];
  if (!appState.halfLeaveDays) appState.halfLeaveDays = [];
  
  const idxFull = appState.leaveDays.indexOf(cellDateStr);
  const idxHalf = appState.halfLeaveDays.indexOf(cellDateStr);
  
  if (idxFull === -1 && idxHalf === -1) {
    // Normal -> Half
    appState.halfLeaveDays.push(cellDateStr);
    logActivity('system', `Marked ${cellDateStr} as Half Leave`);
  } else if (idxHalf !== -1) {
    // Half -> Full
    appState.halfLeaveDays.splice(idxHalf, 1);
    appState.leaveDays.push(cellDateStr);
    logActivity('system', `Marked ${cellDateStr} as Full Leave`);
  } else if (idxFull !== -1) {
    // Full -> Normal
    appState.leaveDays.splice(idxFull, 1);
    logActivity('system', `Removed leave for ${cellDateStr}`);
  }
  
  renderCalendar();
  renderSelectedDayTasks();
  renderStats();
  saveAppState();
});

elBtnPrevMonth.addEventListener('click', () => {
  playChime('click');
  currentCalMonth--;
  if (currentCalMonth < 0) {
    currentCalMonth = 11;
    currentCalYear--;
  }
  renderCalendar();
});

elBtnNextMonth.addEventListener('click', () => {
  playChime('click');
  currentCalMonth++;
  if (currentCalMonth > 11) {
    currentCalMonth = 0;
    currentCalYear++;
  }
  renderCalendar();
});

// --- Focus Streaming MP3 Music Player Logic ---
function loadStation(index) {
  if (musicStations.length === 0) {
    elMp3StationName.textContent = "No Audio Loaded";
    elMp3StationDesc.textContent = "Click '+' to add local MP3 files";
    if (elMiniMusicStationTitle) elMiniMusicStationTitle.textContent = "No Audio";
    elBgMusicPlayer.src = "";
    return;
  }
  const station = musicStations[index];
  elBgMusicPlayer.src = station.url;
  
  if (appState.settings) {
    appState.settings.currentMusicIndex = index;
    saveAppState();
  }
  
  elMp3StationName.textContent = station.name;
  elMp3StationDesc.textContent = station.desc;
  elMiniMusicStationTitle.textContent = station.name;
  
  if (isMusicPlaying) {
    elBgMusicPlayer.play().catch(err => {
      console.warn("Autoplay block or stream connection error:", err);
      pauseMusic();
    });
  }
}

function toggleMusic() {
  if (isMusicPlaying) {
    pauseMusic();
  } else {
    playMusic();
  }
}

function playMusic() {
  isMusicPlaying = true;
  elBgMusicPlayer.play().then(() => {
    // Update main dashboard player UI
    elMusicPlayIcon.classList.add('hidden');
    elMusicPauseIcon.classList.remove('hidden');
    elVinylDisc.classList.add('playing');
    document.getElementById('wave-visualizer').classList.add('playing');
    
    // Update mini-widget player UI
    elMiniBtnMusicPlay.innerHTML = `
      <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>
    `;
  }).catch(err => {
    console.error("Failed to start music stream:", err);
    isMusicPlaying = false;
  });
}

function pauseMusic() {
  isMusicPlaying = false;
  elBgMusicPlayer.pause();
  
  // Update main dashboard player UI
  elMusicPlayIcon.classList.remove('hidden');
  elMusicPauseIcon.classList.add('hidden');
  elVinylDisc.classList.remove('playing');
  document.getElementById('wave-visualizer').classList.remove('playing');
  
  // Update mini-widget player UI
  elMiniBtnMusicPlay.innerHTML = `
    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  `;
}

function nextStation() {
  if (isShuffleActive) {
    currentStationIndex = Math.floor(Math.random() * musicStations.length);
  } else {
    currentStationIndex = (currentStationIndex + 1) % musicStations.length;
  }
  loadStation(currentStationIndex);
}

function prevStation() {
  if (isShuffleActive) {
    currentStationIndex = Math.floor(Math.random() * musicStations.length);
  } else {
    currentStationIndex = (currentStationIndex - 1 + musicStations.length) % musicStations.length;
  }
  loadStation(currentStationIndex);
}

// Bind music events
elBtnMusicPlay.addEventListener('click', () => {
  playChime('click');
  toggleMusic();
});

elBtnMusicNext.addEventListener('click', () => {
  playChime('click');
  nextStation();
});

elBtnMusicPrev.addEventListener('click', () => {
  playChime('click');
  prevStation();
});

elMiniBtnMusicPlay.addEventListener('click', () => {
  playChime('click');
  toggleMusic();
});

if (elMiniBtnMusicPrev) {
  elMiniBtnMusicPrev.addEventListener('click', () => {
    playChime('click');
    prevStation();
  });
}

if (elMiniBtnMusicNext) {
  elMiniBtnMusicNext.addEventListener('click', () => {
    playChime('click');
    nextStation();
  });
}
elSoundMusicVolume.addEventListener('input', () => {
  elBgMusicPlayer.volume = parseFloat(elSoundMusicVolume.value);
});

// Helper to format track times
function formatMusicTime(seconds) {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Sync Audio Time seek progress bar
elBgMusicPlayer.addEventListener('ended', () => {
  nextStation();
});

elBgMusicPlayer.addEventListener('timeupdate', () => {
  if (isFinite(elBgMusicPlayer.duration) && elBgMusicPlayer.duration > 0) {
    const progress = (elBgMusicPlayer.currentTime / elBgMusicPlayer.duration) * 100;
    elSoundMusicProgress.value = progress;
    elMusicTimeCurrent.textContent = formatMusicTime(elBgMusicPlayer.currentTime);
  } else {
    elSoundMusicProgress.value = 0;
    elMusicTimeCurrent.textContent = formatMusicTime(elBgMusicPlayer.currentTime);
  }
});

elBgMusicPlayer.addEventListener('durationchange', () => {
  if (isFinite(elBgMusicPlayer.duration) && elBgMusicPlayer.duration > 0) {
    elSoundMusicProgress.removeAttribute('disabled');
    elMusicTimeTotal.textContent = formatMusicTime(elBgMusicPlayer.duration);
  } else {
    elSoundMusicProgress.setAttribute('disabled', 'true');
    elMusicTimeTotal.textContent = "--:--";
  }
});

elSoundMusicProgress.addEventListener('input', () => {
  if (isFinite(elBgMusicPlayer.duration) && elBgMusicPlayer.duration > 0) {
    const seekTime = (parseFloat(elSoundMusicProgress.value) / 100) * elBgMusicPlayer.duration;
    elBgMusicPlayer.currentTime = seekTime;
  }
});

// Shuffle Toggle Button click handler
if (elBtnYouTubePip) {
  elBtnYouTubePip.addEventListener('click', () => {
    playChime('click');
    if (window.electronAPI) {
      let finalUrl = appState.settings.youtubeUrl || 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1';
      const match = finalUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match && match[1]) { finalUrl = 'https://www.youtube.com/embed/' + match[1] + '?autoplay=1&modestbranding=1'; }
      window.electronAPI.openYouTubePip(finalUrl);
    }
  });
}

elBtnMusicShuffle.addEventListener('click', () => {
  playChime('click');
  isShuffleActive = !isShuffleActive;
  if (isShuffleActive) {
    elBtnMusicShuffle.classList.add('active-btn');
  } else {
    elBtnMusicShuffle.classList.remove('active-btn');
  }
});

// Mini mode active task action handlers
elMiniBtnCompleteTask.addEventListener('click', () => {
  playChime('click');
  if (activeTaskId) {
    completeTask(activeTaskId);
  } else {
    // If no active task is selected, complete the first incomplete task for today
    const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayWeekday = weekdays[new Date().getDay()];
    const firstTask = appState.tasks.find(t => !t.completed && (t.plannerDay === todayWeekday));
    if (firstTask) {
      completeTask(firstTask.id);
    }
  }
});

if (elMiniBtnQtyPlus) {
  elMiniBtnQtyPlus.addEventListener('click', () => {
    playChime('click');
    if (activeTaskId) {
      updateQuantity(activeTaskId, 1);
      renderTimer();
    }
  });
}

const elMiniBtnNextTask = document.getElementById('mini-btn-next-task');
if (elMiniBtnNextTask) {
  elMiniBtnNextTask.addEventListener('click', () => {
    playChime('click');
    const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayWeekday = weekdays[new Date().getDay()];
    const pendingTasks = appState.tasks.filter(t => !t.completed && (t.plannerDay === todayWeekday));
    if (pendingTasks.length > 0) {
      const currentIndex = pendingTasks.findIndex(t => t.id === activeTaskId);
      let nextIndex = 0;
      if (currentIndex !== -1 && currentIndex < pendingTasks.length - 1) {
        nextIndex = currentIndex + 1;
      }
      activeTaskId = pendingTasks[nextIndex].id;
      renderTasks();
      renderTimer();
      saveAppState();
    }
  });
}

elBtnLoadLocal.addEventListener('click', () => {
  playChime('click');
  elLocalMusicPicker.click();
});

elLocalMusicPicker.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  if (files.length > 0) {
    if (!appState.settings) appState.settings = {};
    if (!appState.settings.localMusicList) appState.settings.localMusicList = [];
    
    files.forEach((file) => {
      appState.settings.localMusicList.push({
        name: file.name.replace(/\.[^/.]+$/, ""),
        path: file.path
      });
    });
    
    initStations();
    saveAppState();
    
    currentStationIndex = musicStations.length - files.length;
    if (currentStationIndex < 0) currentStationIndex = 0;
    loadStation(currentStationIndex);
    playMusic();
  }
});

// --- Task Control Drawer & List rendering ---
function renderTasks() { try {
  elPendingTasksList.innerHTML = '';
  elCompletedTasksList.innerHTML = '';
  
  let pendingCount = 0;
  let completedCount = 0;
  
  const today = new Date();
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayWeekday = weekdays[today.getDay()];
  
  if (elMiniTaskSwitcher) {
    elMiniTaskSwitcher.innerHTML = '<option value="">No Active Task</option>';
  }

  // Main tasks list shows tasks active TODAY (or scheduled tasks when 'scheduled' workspace is selected)
  const activeTodayTasks = appState.tasks.filter(task => {
    if (activeWorkspace === 'scheduled') {
      return !!(task.scheduleDate || (task.plannerDays && task.plannerDays.length > 0) || task.plannerDay);
    }
    const wsMatch = activeWorkspace === 'all' || task.workspace === activeWorkspace;
    const activeDate = isTaskActiveOnDate(task, today) || task.completed;
    return wsMatch && activeDate;
  });
  
  activeTodayTasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''} ${activeTaskId === task.id ? 'active-focus' : ''}`;
    
    let extraControlsHtml = '';
    let badgeLabel = 'Checklist';
    
    if (task.workspace && task.workspace !== 'general') {
      badgeLabel = task.workspace.toUpperCase();
    }

    const todayStr = new Date().toDateString();
    const effectiveTarget = typeof getEffectiveTaskTarget === 'function' ? getEffectiveTaskTarget(task, todayStr) : (task.type === 'quantity' ? task.targetQty : task.targetDuration);

    if (task.type === 'quantity') {
      badgeLabel = `${task.currentQty}/${effectiveTarget} Qty`;
      if (!task.completed) {
        extraControlsHtml = `
          <div class="task-item-extra">
            <span class="task-item-progress-text">Target: ${effectiveTarget} items</span>
            <div class="task-qty-controls">
              <button class="qty-btn" onclick="updateQuantity('${task.id}', -1)">-</button>
              <button class="qty-btn" onclick="updateQuantity('${task.id}', 1)">+</button>
            </div>
          </div>
        `;
      }
    } else if (task.type === 'duration') {
      const remaining = Math.max(0, effectiveTarget - task.currentDuration);
      const remainingMins = Math.floor(remaining / 60);
      badgeLabel = `${remainingMins}m left`;
      
      const percent = Math.min(100, (task.currentDuration / effectiveTarget) * 100);
      extraControlsHtml = `
        <div class="task-item-extra">
          <span class="task-item-progress-text">${formatTime(remaining)} left</span>
          <div class="task-sub-progress-bar">
            <div class="task-sub-progress-fill" style="width: ${percent}%"></div>
          </div>
          <span class="task-item-percent-text" style="font-size: 10.5px; color: var(--text-muted); min-width: 32px; text-align: right; font-family: var(--font-mono); font-weight: 500;">${Math.floor(percent)}%</span>
        </div>
      `;
    }

    const reorderControlsHtml = !task.completed ? `
      <button class="qty-btn" title="Move Up" onclick="moveTaskUp('${task.id}')">▲</button>
      <button class="qty-btn" title="Move Down" onclick="moveTaskDown('${task.id}')">▼</button>
    ` : '';

    const focusBtnHtml = !task.completed ? `
      <button class="task-focus-toggle" title="${activeTaskId === task.id && timerRunning ? 'Pause' : 'Focus on this task'}" onclick="toggleTaskFocus('${task.id}')">
        ${activeTaskId === task.id && timerRunning ? 
          `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>` : 
          `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
        }
      </button>
    ` : '';

    const editReflectionBtnHtml = task.completed ? `
      <button title="Edit Reflection & Attachments" onclick="openCompletionModal('${task.id}'); event.stopPropagation();" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); padding: 3px 8px; border-radius: 6px; color: var(--theme-color); cursor: pointer; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
        📝 Reflection
      </button>
    ` : '';

    let reflectionHtml = '';
    if (task.completed && (task.completionNote || task.completionImage || task.completionVideo || task.completionDocument)) {
      let imgHtml = '';
      if (task.completionImage) {
        imgHtml = `<img src="${task.completionImage}" onclick="openImageViewer('${task.completionImage}'); event.stopPropagation();" title="Click to enlarge screenshot proof" style="max-height: 80px; border-radius: 6px; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); margin-top: 6px; display: block; object-fit: contain; background: #000;">`;
      }
      let videoHtml = '';
      if (task.completionVideo) {
        videoHtml = `<video controls src="${task.completionVideo}" style="max-height: 140px; width: 100%; border-radius: 6px; margin-top: 6px; background: #000; border: 1px solid rgba(59, 130, 246, 0.4);"></video>`;
      }
      let docHtml = '';
      if (task.completionDocument && task.completionDocument.data) {
        docHtml = `<a href="${task.completionDocument.data}" download="${task.completionDocument.name || 'attachment'}" onclick="event.stopPropagation();" style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 6px; color: #10b981; font-size: 11.5px; text-decoration: none; margin-top: 6px; font-weight: 600;">📄 ${task.completionDocument.name || 'Download Document'} ⬇️</a>`;
      }
      let noteHtml = task.completionNote ? `<div style="font-size: 11.5px; color: var(--theme-color); font-style: italic; margin-top: 2px; line-height: 1.4;">" ${task.completionNote} "</div>` : '';
      reflectionHtml = `<div class="task-reflection-box" style="margin-top: 6px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-left: 3px solid var(--theme-color); border-radius: 6px;">${noteHtml}${imgHtml}${videoHtml}${docHtml}</div>`;
    }
    
    li.innerHTML = `
      <div class="task-item-main">
        <div class="task-item-left">
          <div class="custom-checkbox" onclick="${task.completed ? `uncompleteTask('${task.id}')` : `completeTask('${task.id}')`}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <span class="task-name" title="${task.name}">${task.name}</span>
        </div>
        <div class="task-item-right">
          <span class="task-badge">${badgeLabel}</span>
          ${editReflectionBtnHtml}
          ${reorderControlsHtml}
          ${focusBtnHtml}
          <button class="btn-edit-task" title="Edit Task" onclick="openTaskDetails('${task.id}'); event.stopPropagation();" style="background: transparent; border: none; padding: 4px; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.7; transition: all 0.2s ease;" onmouseover="this.style.opacity='1'; this.style.color='var(--color-cyan)'" onmouseout="this.style.opacity='0.7'; this.style.color='var(--text-muted)'">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-delete-task" title="Delete Task" onclick="deleteTask('${task.id}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
      ${extraControlsHtml}
      ${reflectionHtml}
    `;
    
    if (task.completed) {
      elCompletedTasksList.appendChild(li);
      completedCount++;
    } else {
      elPendingTasksList.appendChild(li);
      pendingCount++;
      if (elMiniTaskSwitcher) {
        const option = document.createElement('option');
        option.value = task.id;
        const goalMinutes = task.targetDuration ? Math.floor(task.targetDuration / 60) : 0;
        const goalStr = goalMinutes > 0 ? ` (${goalMinutes}m goal)` : '';
        option.textContent = task.name + goalStr;
        option.title = `${task.name}${goalStr}${task.notes ? ' - ' + task.notes : ''}`;
        if (task.id === activeTaskId) {
          option.selected = true;
          elMiniTaskSwitcher.title = option.title;
        }
        elMiniTaskSwitcher.appendChild(option);
      }
    }
  });
  
  elCountPending.textContent = pendingCount; elCountCompleted.textContent = completedCount;
  const diagEl = document.getElementById('diagnostic-db-counter');
  if (diagEl) diagEl.textContent = 'Total DB Tasks: ' + (appState.tasks ? appState.tasks.length : 0);
  } catch (err) { const el = document.getElementById('active-task-display'); if(el) el.textContent = 'ErrRT: ' + err.message; } }

// Clear Completed Tasks
elBtnClearCompleted.addEventListener('click', () => {
  playChime('click');
  appState.tasks = appState.tasks.filter(t => !t.completed);
  renderTasks();
  renderStats();
  renderSelectedDayTasks();
  saveAppState();
});

// --- Details Drawer controller ---
function openTaskDetails(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;
  
  selectedDetailTaskId = id;
  elDetailTaskTitle.textContent = task.name;
  elDetailTaskName.value = task.name || '';
  elDetailTaskNotes.value = task.notes || '';
  const dayInputs = document.querySelectorAll('.day-toggle-input');
  dayInputs.forEach(input => input.checked = false);
  if (task.plannerDays && task.plannerDays.length > 0) {
    task.plannerDays.forEach(day => {
      const el = document.getElementById(`day-${day}`);
      if (el) el.checked = true;
    });
  } else if (task.plannerDay && task.plannerDay !== 'multi') {
    const el = document.getElementById(`day-${task.plannerDay}`);
    if (el) el.checked = true;
  }
  elDetailTaskStartDate.value = task.startDate || '';
  elDetailTaskEndDate.value = task.endDate || '';
  
  if (task.type === 'quantity') {
    elDetailTargetQtyContainer.style.display = 'block';
    elDetailTargetDurationContainer.style.display = 'none';
    elDetailTargetQty.value = task.targetQty || 0;
  } else if (task.type === 'duration') {
    elDetailTargetQtyContainer.style.display = 'none';
    elDetailTargetDurationContainer.style.display = 'block';
    const totalMins = Math.floor((task.targetDuration || 0) / 60);
    elDetailTargetHours.value = Math.floor(totalMins / 60);
    elDetailTargetMinutes.value = totalMins % 60;
  } else {
    elDetailTargetQtyContainer.style.display = 'none';
    elDetailTargetDurationContainer.style.display = 'none';
  }
  
  renderSubtasks(task);
  renderTaskHistory(task);
  
  playChime('click');
  elTaskDetailOverlay.classList.remove('hidden');
}

function renderTaskHistory(task) {
  if (!elDetailHistoryList) return;
  elDetailHistoryList.innerHTML = '';
  
  if (!task.history || Object.keys(task.history).length === 0) {
    elDetailHistoryList.innerHTML = `
      <li class="task-history-item" style="justify-content: center; color: var(--text-muted); opacity: 0.6;">
        No historical data recorded yet
      </li>
    `;
    return;
  }
  
  // Sort dates descending
  const dates = Object.keys(task.history).sort((a, b) => new Date(b) - new Date(a));
  
  dates.forEach(dateStr => {
    const data = task.history[dateStr];
    const li = document.createElement('li');
    li.className = `task-history-item ${data.completed ? 'history-completed' : ''}`;
    
    // Format date string beautifully (e.g. "Fri, Jul 24")
    const d = new Date(dateStr);
    const displayDate = isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    
    let metricHtml = '';
    if (task.type === 'quantity') {
      metricHtml = `<span class="history-metric">${data.qty} Qty</span>`;
    } else if (task.type === 'duration') {
      const mins = Math.floor((data.duration || 0) / 60);
      metricHtml = `<span class="history-metric">${mins}m</span>`;
    }
    
    li.innerHTML = `
      <span class="history-date">${displayDate}</span>
      <div style="display: flex; align-items: center; gap: 10px;">
        ${metricHtml}
        ${data.completed ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" style="color: #2ed573;"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </div>
    `;
    elDetailHistoryList.appendChild(li);
  });
}

function renderSubtasks(task) {
  elDetailSubtaskList.innerHTML = '';
  const subtasks = task.subtasks || [];
  
  subtasks.forEach((st, idx) => {
    const li = document.createElement('li');
    li.className = `subtask-item ${st.completed ? 'completed' : ''}`;
    
    li.innerHTML = `
      <label class="subtask-check-label" onclick="toggleSubtask(${idx})">
        <div class="subtask-check-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <span>${st.name}</span>
      </label>
      <button class="btn-delete-habit" onclick="deleteSubtask(${idx})">
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    elDetailSubtaskList.appendChild(li);
  });
}

function toggleSubtask(index) {
  const task = appState.tasks.find(t => t.id === selectedDetailTaskId);
  if (!task || !task.subtasks) return;
  
  task.subtasks[index].completed = !task.subtasks[index].completed;
  const stName = task.subtasks[index].name;
  logActivity('task', `${task.subtasks[index].completed ? 'Completed' : 'Un-completed'} subtask "${stName}" in task: ${task.name}`);
  
  playChime(task.subtasks[index].completed ? 'taskComplete' : 'click');
  renderSubtasks(task);
  saveAppState();
}

function deleteSubtask(index) {
  const task = appState.tasks.find(t => t.id === selectedDetailTaskId);
  if (!task || !task.subtasks) return;
  
  playChime('click');
  task.subtasks.splice(index, 1);
  renderSubtasks(task);
  saveAppState();
}

elAddSubtaskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = elSubtaskInput.value.trim();
  if (!name) return;
  
  const task = appState.tasks.find(t => t.id === selectedDetailTaskId);
  if (!task) return;
  
  if (!task.subtasks) task.subtasks = [];
  task.subtasks.push({ name, completed: false });
  
  elSubtaskInput.value = '';
  playChime('click');
  renderSubtasks(task);
  saveAppState();
});

elBtnSaveDetail.addEventListener('click', () => {
  const task = appState.tasks.find(t => t.id === selectedDetailTaskId);
  if (!task) return;
  
  task.name = elDetailTaskName.value.trim() || task.name;
  task.notes = elDetailTaskNotes.value.trim();
  const dayInputs = document.querySelectorAll('.day-toggle-input');
  const selectedDays = [];
  dayInputs.forEach(input => {
    if (input.checked) selectedDays.push(input.value);
  });
  task.plannerDays = selectedDays;
  
  if (selectedDays.length === 1) {
    task.plannerDay = selectedDays[0];
  } else if (selectedDays.length === 0) {
    task.plannerDay = '';
  } else {
    task.plannerDay = 'multi';
  }
  if (elDetailTaskStartDate.value) task.startDate = elDetailTaskStartDate.value;
  
  if (elDetailTaskEndDate.value) {
    task.endDateType = 'specific';
    task.endDate = elDetailTaskEndDate.value;
  } else {
    task.endDateType = 'unlimited';
    task.endDate = null;
  }
  
  if (task.type === 'quantity') {
    task.targetQty = parseInt(elDetailTargetQty.value) || 0;
  } else if (task.type === 'duration') {
    const h = parseInt(elDetailTargetHours.value) || 0;
    const m = parseInt(elDetailTargetMinutes.value) || 0;
    task.targetDuration = (h * 3600) + (m * 60);
  }
  
  playChime('click');
  elTaskDetailOverlay.classList.add('hidden');
  renderTasks();
  renderSelectedDayTasks();
  saveAppState();
});

elBtnCloseDetail.addEventListener('click', () => {
  playChime('click');
  elTaskDetailOverlay.classList.add('hidden');
});

// --- Pop-up Add Task Modal Controller ---
elBtnOpenAddTask.addEventListener('click', () => {
  playChime('click');
  elTaskStartDate.value = new Date().toLocaleDateString('en-CA');
  elAddTaskOverlay.classList.remove('hidden');
});

function closeAddTaskModal() {
  playChime('click');
  elAddTaskOverlay.classList.add('hidden');
  
  // Clear inputs
  elTaskNameInput.value = '';
  document.getElementById('task-target-qty').value = 5;
  document.getElementById('task-target-hours').value = 1;
  document.getElementById('task-target-minutes').value = 0;
  
  elTaskEndDateType.value = 'unlimited';
  elTaskEndDate.value = '';
  elEndDateContainer.classList.add('hidden');
  
  elTaskTypePills.forEach(p => p.classList.remove('active'));
  elTaskTypePills[0].classList.add('active');
  elTaskTypePills[0].querySelector('input').checked = true;
  elTargetQtyContainer.classList.add('hidden');
  elTargetDurationContainer.classList.add('hidden');
}

elBtnCloseAddTask.addEventListener('click', closeAddTaskModal);
elBtnCancelAddTask.addEventListener('click', closeAddTaskModal);

elTaskEndDateType.addEventListener('change', () => {
  if (elTaskEndDateType.value === 'specific') {
    elEndDateContainer.classList.remove('hidden');
    elTaskEndDate.value = new Date().toLocaleDateString('en-CA');
  } else {
    elEndDateContainer.classList.add('hidden');
    elTaskEndDate.value = '';
  }
});

elAddTaskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const name = elTaskNameInput.value.trim();
  if (!name) return;
  
  const workspace = elTaskWorkspaceSelect.value;
  const selectedTypePill = document.querySelector('.task-type-selector .type-pill.active');
  const type = selectedTypePill.querySelector('input').value;
  
  if (type === 'habit') {
    appState.habits.push({ id: Date.now().toString(), name, completed: false, streak: 0 });
    logActivity('habit', `Added new habit: "${name}"`);
    closeAddTaskModal();
    renderHabits();
    saveAppState();
    return;
  }
  
  let targetQty = 0;
  let targetDuration = 0;
  
  if (type === 'quantity') {
    targetQty = parseInt(document.getElementById('task-target-qty').value) || 5;
  } else if (type === 'duration') {
    const hrs = parseInt(document.getElementById('task-target-hours').value) || 0;
    const mins = parseInt(document.getElementById('task-target-minutes').value) || 0;
    targetDuration = (hrs * 3600) + (mins * 60);
    if (targetDuration <= 0) targetDuration = 3600;
  }
  
  const startDate = elTaskStartDate.value;
  const endDateType = elTaskEndDateType.value;
  const endDate = endDateType === 'specific' ? elTaskEndDate.value : null;

  const newTask = {
    id: Date.now().toString(),
    name,
    workspace,
    type,
    targetQty,
    currentQty: 0,
    targetDuration,
    currentDuration: 0,
    startDate,
    endDateType,
    endDate,
    completed: false,
    notes: '',
    plannerDay: 'any',
    subtasks: [],
    createdAt: new Date().toISOString()
  };
  
  appState.tasks.push(newTask);
  logActivity('task', `Added new task: "${newTask.name}"`);
  
  closeAddTaskModal();
  renderTasks();
  renderStats();
  saveAppState();
});

// Setup Add Task Type select triggers in pop-up modal
elTaskTypePills.forEach(pill => {
  pill.addEventListener('click', () => {
    elTaskTypePills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    pill.querySelector('input').checked = true;
    
    const value = pill.querySelector('input').value;
    if (value === 'checklist') {
      elTargetQtyContainer.classList.add('hidden');
      elTargetDurationContainer.classList.add('hidden');
    } else if (value === 'quantity') {
      elTargetQtyContainer.classList.remove('hidden');
      elTargetDurationContainer.classList.add('hidden');
    } else if (value === 'duration') {
      elTargetQtyContainer.classList.add('hidden');
      elTargetDurationContainer.classList.remove('hidden');
    }
  });
});

// --- Workspace Tabs ---
elWorkspaceTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    elWorkspaceTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeWorkspace = tab.getAttribute('data-ws');
    
    playChime('click');
    renderTasks();
    renderStats();
  });
});

// --- AI Coaching Report Drawer Overlay ---
elBtnAiCoach.addEventListener('click', () => {
  playChime('click');
  generateAICoachReport();
  elAiReportOverlay.classList.remove('hidden');
});

elBtnCloseReport.addEventListener('click', () => {
  playChime('click');
  elAiReportOverlay.classList.add('hidden');
});

elBtnShareReport.addEventListener('click', () => {
  playChime('click');
  elAiReportOverlay.classList.add('hidden');
});

function generateAICoachReport() {
  const elLoading = document.getElementById('report-loading-container');
  const elContent = document.getElementById('report-content-container');
  const elScoreVal = document.getElementById('report-score-val');
  const elGradeLabel = document.getElementById('report-grade-label');
  const elSummary = document.getElementById('report-summary');
  const elStrengths = document.getElementById('report-strengths');
  const elWeaknesses = document.getElementById('report-weaknesses');
  const elInsights = document.getElementById('report-insights');
  const elRecommendations = document.getElementById('report-recommendations');
  const elTomorrow = document.getElementById('report-tomorrow');
  const elBtnShare = document.getElementById('btn-share-report');
  
  // Show loading, hide content
  elLoading.classList.remove('hidden');
  elContent.classList.add('hidden');
  elBtnShare.classList.add('hidden');
  
  // Simulate AI delay
  setTimeout(() => {
    const stats = compileDailyStats();
    const report = generateCoachingReport(stats);
    
    elScoreVal.textContent = report.score;
    elGradeLabel.textContent = report.grade;
    elSummary.innerHTML = `<p>${report.summary}</p>`;
    
    elStrengths.innerHTML = report.strengths.map(s => `<li>${s}</li>`).join('');
    elWeaknesses.innerHTML = report.weaknesses.map(w => `<li>${w}</li>`).join('');
    elInsights.innerHTML = report.insights.map(i => `<li>${i}</li>`).join('');
    elRecommendations.innerHTML = report.recommendations.map(r => `<li>${r}</li>`).join('');
    elTomorrow.innerHTML = `<p>${report.tomorrow}</p>`;
    
    elLoading.classList.add('hidden');
    elContent.classList.remove('hidden');
    elBtnShare.classList.remove('hidden');
  }, 1500);
}

// --- Thought of the Day Overlay Drawer ---
elBtnThought.addEventListener('click', () => {
  playChime('click');
  loadRandomQuoteImage();
  elThoughtOverlay.classList.remove('hidden');
});

elBtnCloseThought.addEventListener('click', () => {
  playChime('click');
  elThoughtOverlay.classList.add('hidden');
});

elBtnNextThought.addEventListener('click', () => {
  playChime('click');
  loadRandomQuoteImage();
});

async function loadRandomQuoteImage() {
  elThoughtImageDisplay.style.opacity = '0.3';
  try {
    const result = await window.electronAPI.getRandomQuoteImage();
    if (result.source === 'user') {
      elThoughtImageDisplay.src = result.data;
      elThoughtImageSourceLabel.textContent = `Source: AppData/user-quotes/${result.name}`;
      elThoughtImageSourceLabel.style.color = 'var(--color-green)';
    } else {
      elThoughtImageDisplay.src = `assets/quotes/quote_${result.index}.png`;
      elThoughtImageSourceLabel.textContent = `Source: Bundled Focus Quote ${result.index}`;
      elThoughtImageSourceLabel.style.color = 'var(--text-muted)';
    }
  } catch (err) {
    console.error('Failed to load random quote image:', err);
    elThoughtImageDisplay.src = 'assets/quotes/quote_1.png';
    elThoughtImageSourceLabel.textContent = 'Failed to load user quotes folder.';
  }
  setTimeout(() => {
    elThoughtImageDisplay.style.opacity = '1.0';
  }, 100);
}

// --- Quotes Rotator & Auto-Rotation ---
let currentQuoteIndex = -1;
let quoteRotationInterval = null;

function rotateQuote() {
  if (quotes.length === 0) return;
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * quotes.length);
  } while (quotes.length > 1 && newIndex === currentQuoteIndex);
  
  currentQuoteIndex = newIndex;
  const selectedQuote = quotes[currentQuoteIndex];
  
  if (elDashboardQuoteText && elDashboardQuoteAuthor) {
    elDashboardQuoteText.style.transition = 'opacity 0.4s ease';
    elDashboardQuoteAuthor.style.transition = 'opacity 0.4s ease';
    elDashboardQuoteText.style.opacity = '0';
    elDashboardQuoteAuthor.style.opacity = '0';
    
    setTimeout(() => {
      elDashboardQuoteText.textContent = selectedQuote.text;
      elDashboardQuoteAuthor.textContent = `— ${selectedQuote.author}`;
      elDashboardQuoteText.style.opacity = '1';
      elDashboardQuoteAuthor.style.opacity = '1';
    }, 400);
  }
  if (elMiniQuoteText) {
    elMiniQuoteText.textContent = `"${selectedQuote.text}" — ${selectedQuote.author}`;
  }
}

function startQuoteRotation() {
  rotateQuote();
  if (quoteRotationInterval) clearInterval(quoteRotationInterval);
  quoteRotationInterval = setInterval(() => {
    rotateQuote();
  }, 12000);
}

window.rotateQuote = rotateQuote;
window.startQuoteRotation = startQuoteRotation;

// --- View Panel Toggles (Tasks Sidebar & Pop-up Calendar Modal) ---
const elBtnViewDashboard = document.getElementById('btn-view-dashboard');
const elDashboardSection = document.getElementById('dashboard-section');

elBtnViewDashboard.addEventListener('click', () => {
  if (typeof playChime === 'function') playChime('click');
  activeView = 'dashboard';
  elBtnViewDashboard.classList.add('active');
  elBtnViewTasks.classList.remove('active');
  elBtnViewPlanner.classList.remove('active');
  
  elTasksViewContent.classList.add('hidden');
  const elAiCard = document.getElementById('ai-review-card-container');
  if(elAiCard) elAiCard.classList.add('hidden');
  elDashboardSection.classList.remove('hidden');
  
  if (typeof renderDashboard === 'function') {
    renderDashboard();
  }
});

elBtnViewTasks.addEventListener('click', () => {
  if (typeof playChime === 'function') playChime('click');
  activeView = 'tasks';
  elBtnViewTasks.classList.add('active');
  elBtnViewPlanner.classList.remove('active');
  if (elBtnViewDashboard) elBtnViewDashboard.classList.remove('active');
  
  elDashboardSection.classList.add('hidden');
  elTasksViewContent.classList.remove('hidden');
  const elAiCard = document.getElementById('ai-review-card-container');
  if(elAiCard) elAiCard.classList.remove('hidden');
  renderTasks();
});

elBtnViewPlanner.addEventListener('click', () => {
  playChime('click');
  activeView = 'planner';
  elBtnViewPlanner.classList.add('active');
  elBtnViewTasks.classList.remove('active');
  if (elBtnViewDashboard) elBtnViewDashboard.classList.remove('active');
  const btnHabits = document.getElementById('btn-view-habits');
  if (btnHabits) btnHabits.classList.remove('active');
  
  // Open the large calendar pop-up overlay
  elCalendarOverlay.classList.remove('hidden');
  renderCalendar();
  renderSelectedDayTasks();
});

const elBtnViewHabits = document.getElementById('btn-view-habits');
if (elBtnViewHabits) {
  elBtnViewHabits.addEventListener('click', () => {
    playChime('click');
    activeView = 'habits';
    elBtnViewHabits.classList.add('active');
    elBtnViewTasks.classList.remove('active');
    elBtnViewPlanner.classList.remove('active');
    if (elBtnViewDashboard) elBtnViewDashboard.classList.remove('active');
    
    document.getElementById('habit-overlay').classList.remove('hidden');
    if (typeof renderGridHabits === 'function') {
      renderGridHabits();
    }
  });
}

const elBtnCloseHabits = document.getElementById('btn-close-habits');
if (elBtnCloseHabits) {
  elBtnCloseHabits.addEventListener('click', () => {
    playChime('click');
    document.getElementById('habit-overlay').classList.add('hidden');
    
    // Return active view selection back to tasks list
    activeView = 'tasks';
    elBtnViewTasks.classList.add('active');
    elBtnViewPlanner.classList.remove('active');
    if (elBtnViewDashboard) elBtnViewDashboard.classList.remove('active');
    if (elDashboardSection) elDashboardSection.classList.add('hidden');
    if (elTasksViewContent) elTasksViewContent.classList.remove('hidden');
  const elAiCard = document.getElementById('ai-review-card-container');
  if(elAiCard) elAiCard.classList.remove('hidden');
    if (elBtnViewHabits) elBtnViewHabits.classList.remove('active');
    renderTasks();
  });
}

elBtnCloseCalendar.addEventListener('click', () => {
  playChime('click');
  elCalendarOverlay.classList.add('hidden');
  
  // Return active view selection back to tasks list
  activeView = 'tasks';
  elBtnViewTasks.classList.add('active');
  elBtnViewPlanner.classList.remove('active');
  if (elBtnViewDashboard) elBtnViewDashboard.classList.remove('active');
  if (elDashboardSection) elDashboardSection.classList.add('hidden');
  if (elTasksViewContent) elTasksViewContent.classList.remove('hidden');
  const elAiCard = document.getElementById('ai-review-card-container');
  if(elAiCard) elAiCard.classList.remove('hidden');
  if (elBtnViewHabits) elBtnViewHabits.classList.remove('active');
  renderTasks();
});

// --- Floating Pip Mini-Widget Toggle ---
function toggleMiniMode(forceState) {
  if (forceState !== undefined) {
    isWidgetMode = forceState;
  } else {
    isWidgetMode = !isWidgetMode;
  }
  
  if (isWidgetMode) {
    document.body.classList.add('mini-mode');
    if (elBtnToggleWidget) {
      elBtnToggleWidget.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        </svg>
      `;
      elBtnToggleWidget.title = "Maximize Dashboard";
    }
    if (window.electronAPI && window.electronAPI.toggleWidgetMode) {
      window.electronAPI.toggleWidgetMode();
    }
  } else {
    document.body.classList.remove('mini-mode');
    if (elBtnToggleWidget) {
      elBtnToggleWidget.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <rect x="13" y="13" width="8" height="8" rx="1"/>
        </svg>
      `;
      elBtnToggleWidget.title = "Compact Overlay Mode";
    }
    if (window.electronAPI && window.electronAPI.toggleDashboardMode) {
      window.electronAPI.toggleDashboardMode();
    }
  }
  
  renderTimer();
  triggerWidgetAutoResize();
}

elBtnToggleWidget.addEventListener('click', () => {
  playChime('click');
  toggleMiniMode();
});

function triggerWidgetAutoResize() {
  if (document.body.classList.contains('mini-mode') || document.body.classList.contains('widget-mode')) {
    setTimeout(() => {
      const card = document.querySelector('.timer-card');
      if (card && window.electronAPI && window.electronAPI.resizeWidgetHeight) {
        const height = Math.max(270, card.scrollHeight + 45);
        window.electronAPI.resizeWidgetHeight(height);
      }
    }, 50);
  }
}

if (elBtnMinimize) {
  elBtnMinimize.addEventListener('click', () => {
    if (window.electronAPI && window.electronAPI.minimize) window.electronAPI.minimize();
  });
}

const elBtnMaximize = document.getElementById('btn-maximize');
if (elBtnMaximize) {
  elBtnMaximize.addEventListener('click', () => {
    if (document.body.classList.contains('mini-mode') || document.body.classList.contains('widget-mode')) {
      toggleMiniMode();
    } else {
      if (window.electronAPI && window.electronAPI.maximize) window.electronAPI.maximize();
    }
  });
}

if (elBtnClose) {
  elBtnClose.addEventListener('click', () => {
    if (window.electronAPI && window.electronAPI.close) window.electronAPI.close();
  });
}

// --- Settings Controller ---
elBtnSettings.addEventListener('click', () => {
  playChime('click');
  syncSettingsToUI();
  elSettingsOverlay.classList.remove('hidden');
});

elBtnCloseSettings.addEventListener('click', () => {
  playChime('click');
  elSettingsOverlay.classList.add('hidden');
});

function syncSettingsToUI() {
  elSettingAutostart.checked = appState.settings.autostart;
  elSettingNotifications.checked = appState.settings.notifications;
  elSettingDayResetHour.value = appState.settings.dayResetHour;
  if (elSettingYouTubeUrl) elSettingYouTubeUrl.value = appState.settings.youtubeUrl || 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1';
  
  elSettingFocusDuration.value = appState.settings.focusDurationMinutes;
  elSettingShortBreak.value = appState.settings.shortBreakMinutes;
  elSettingLongBreak.value = appState.settings.longBreakMinutes;
  elSettingSoundVolume.value = appState.settings.soundVolume;
  
  const elSettingScreensaverTimeout = document.getElementById('setting-screensaver-timeout');
  const elSettingIdleTimeout = document.getElementById('setting-idle-timeout');
  if (elSettingScreensaverTimeout) elSettingScreensaverTimeout.value = appState.settings.screensaverTimeoutMinutes || 1;
  if (elSettingIdleTimeout) elSettingIdleTimeout.value = appState.settings.idleTimeoutMinutes || 3;

  const elSettingAutoStartBreak = document.getElementById('setting-auto-start-break');
  if (elSettingAutoStartBreak) {
    elSettingAutoStartBreak.checked = appState.settings.autoStartBreak === true;
  }

  const elSettingShowReflection = document.getElementById('setting-show-reflection');
  if (elSettingShowReflection) {
    elSettingShowReflection.checked = appState.settings.showReflectionModal !== false;
  }
}

elBtnPreviewSound.addEventListener('click', () => {
  appState.settings.soundVolume = parseFloat(elSettingSoundVolume.value);
  playChime('focusComplete');
});

elBtnSaveSettings.addEventListener('click', async () => {
  playChime('click');
  
  const newAutostart = elSettingAutostart.checked;
  const newNotifications = elSettingNotifications.checked;
  const newDayReset = parseInt(elSettingDayResetHour.value);
  const newDailyGoal = appState.settings.dailyGoalHours || 8;
  const newFocusDur = parseInt(elSettingFocusDuration.value) || 25;
  const newShortBrk = parseInt(elSettingShortBreak.value) || 5;
  const newLongBrk = parseInt(elSettingLongBreak.value) || 15;
  const newVolume = parseFloat(elSettingSoundVolume.value);
  
  const elSettingScreensaverTimeout = document.getElementById('setting-screensaver-timeout');
  const elSettingIdleTimeout = document.getElementById('setting-idle-timeout');
  if (elSettingScreensaverTimeout) appState.settings.screensaverTimeoutMinutes = parseInt(elSettingScreensaverTimeout.value) || 1;
  if (elSettingIdleTimeout) appState.settings.idleTimeoutMinutes = parseInt(elSettingIdleTimeout.value) || 3;

  const elSettingAutoStartBreak = document.getElementById('setting-auto-start-break');
  if (elSettingAutoStartBreak) {
    appState.settings.autoStartBreak = elSettingAutoStartBreak.checked;
  }

  const elSettingShowReflection = document.getElementById('setting-show-reflection');
  if (elSettingShowReflection) {
    appState.settings.showReflectionModal = elSettingShowReflection.checked;
  }
  
  if (newAutostart !== appState.settings.autostart) {
    try {
      const activeAutostart = await window.electronAPI.setAutostart(newAutostart);
      appState.settings.autostart = activeAutostart;
    } catch (err) {
      console.error("Autostart setting toggle failure:", err);
    }
  } else {
    appState.settings.autostart = newAutostart;
  }
  
  appState.settings.notifications = newNotifications;
  appState.settings.dayResetHour = isNaN(newDayReset) ? 5 : Math.max(0, Math.min(23, newDayReset));
  appState.settings.dailyGoalHours = newDailyGoal;
  
  if (!timerRunning) {
    if (newFocusDur !== appState.settings.focusDurationMinutes && sessionType === 'focus') {
      currentTimer = newFocusDur * 60;
    } else if (newShortBrk !== appState.settings.shortBreakMinutes && sessionType === 'shortBreak') {
      currentTimer = newShortBrk * 60;
    } else if (newLongBrk !== appState.settings.longBreakMinutes && sessionType === 'longBreak') {
      currentTimer = newLongBrk * 60;
    }
  }
  
  appState.settings.focusDurationMinutes = newFocusDur;
  appState.settings.shortBreakMinutes = newShortBrk;
  appState.settings.longBreakMinutes = newLongBrk;
  appState.settings.soundVolume = newVolume;
  
  elSettingsOverlay.classList.add('hidden');
  renderAll();
  saveAppState();
});

// --- Timer State Controllers ---
function toggleTimer() {
  playChime('click');
  if (timerRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  try {
  if (timerRunning) return;
  
  if (!activeTaskId && sessionType === 'focus') {
    const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayWeekday = weekdays[new Date().getDay()];
    const firstTask = appState.tasks.find(t => !t.completed && (t.plannerDay === todayWeekday));
    if (firstTask) {
      activeTaskId = firstTask.id;
    }
  }

  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  let logMsg = `Started focus timer (at ${nowStr})`;
  if (sessionType === 'focus' && activeTaskId) {
    const t = appState.tasks.find(x => x.id === activeTaskId);
    if (t) logMsg = `Started task: ${t.name} (at ${nowStr})`;
  } else if (sessionType === 'break') {
    logMsg = `Started break timer (at ${nowStr})`;
  }
  logActivity('timer', logMsg, { startTime: nowStr });
  timerRunning = true;
  sessionStartTimestamp = Date.now();
  appState.sessionStartTimestamp = sessionStartTimestamp;
  renderTasks();
  renderTimer(); // Fix UI desync so the dashboard instantly updates!
  saveAppState();
  
  timerInterval = setInterval(() => { try {
    if (currentTimer > 0) {
      currentTimer--;
      
      if (sessionType === 'focus') {
        appState.focusTimeToday++;
        
        // Log time to active task if duration-based
        if (activeTaskId) {
          const task = appState.tasks.find(t => t.id === activeTaskId);
          if (task && task.type === 'duration' && !task.completed) {
            task.currentDuration++;
            
            // Dynamically update the active task's DOM so we don't have to rebuild the whole task list every second!
            const todayStr = new Date().toDateString();
            const target = typeof getEffectiveTaskTarget === 'function' ? getEffectiveTaskTarget(task, todayStr) : task.targetDuration;
            
            const progressSpan = document.querySelector('.task-item.active-focus .task-item-progress-text');
            if (progressSpan) {
              const remaining = Math.max(0, target - task.currentDuration);
              progressSpan.innerHTML = `${formatTime(remaining)} left`;
            }
            const progressFill = document.querySelector('.task-item.active-focus .task-sub-progress-fill');
            const percentText = document.querySelector('.task-item.active-focus .task-item-percent-text');
            if (progressFill) {
              const percent = Math.min(100, (task.currentDuration / target) * 100);
              progressFill.style.width = `${percent}%`;
              if (percentText) percentText.textContent = `${Math.floor(percent)}%`;
            }

            if (task.currentDuration >= target) {
              triggerTaskTargetModal(task);
            }
          }
        }
      }
      
      renderTimer();
      
      if (appState.focusTimeToday % 5 === 0) {
        renderStats();
        saveAppState();
      }
    } else {
      timerFinished();
    }
  } catch (err) { const el = document.getElementById('active-task-display'); if(el) el.textContent = 'ErrTick: ' + err.message; } }, 1000);
  
  renderTimer();
} catch (err) { const el = document.getElementById('active-task-display'); if(el) el.textContent = 'ErrST: ' + err.message; } }

function formatSessionTimeDetails(startTs) {
  const now = Date.now();
  const startTimeStr = startTs ? new Date(startTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
  const stopTimeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  
  let durationSecs = startTs ? Math.max(0, Math.floor((now - startTs) / 1000)) : 0;
  let durationStr = '';
  if (durationSecs >= 60) {
    const mins = Math.floor(durationSecs / 60);
    const secs = durationSecs % 60;
    durationStr = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  } else {
    durationStr = `${durationSecs}s`;
  }
  
  return {
    startTime: startTimeStr,
    stopTime: stopTimeStr,
    duration: durationStr
  };
}

function pauseTimer() {
  try {
  if (!timerRunning) return;
  
  const startTs = appState.sessionStartTimestamp || sessionStartTimestamp;
  const timeData = formatSessionTimeDetails(startTs);

  let logMsg = `Stopped focus timer`;
  if (sessionType === 'focus' && activeTaskId) {
    const t = appState.tasks.find(x => x.id === activeTaskId);
    if (t) logMsg = `Stopped task: ${t.name}`;
  } else if (sessionType === 'break') {
    logMsg = `Stopped break timer`;
  }
  logActivity('timer', logMsg, timeData);
  timerRunning = false;
  sessionStartTimestamp = null;
  appState.sessionStartTimestamp = null;
  clearInterval(timerInterval);
  renderTimer();
  renderTasks();
  saveAppState();
} catch (err) { const el = document.getElementById('active-task-display'); if(el) el.textContent = 'ErrPT: ' + err.message; } }

function resetTimer() {
  playChime('click');
  pauseTimer();
  if (sessionType === 'focus') {
    currentTimer = appState.settings.focusDurationMinutes * 60;
  } else if (sessionType === 'shortBreak') {
    currentTimer = appState.settings.shortBreakMinutes * 60;
  } else if (sessionType === 'longBreak') {
    currentTimer = appState.settings.longBreakMinutes * 60;
  }
  renderTimer();
}

function skipSession() {
  playChime('click');
  pauseTimer();
  if (sessionType === 'focus') {
    logActivity('timer', 'Skipped Focus Session');
    sessionType = 'shortBreak';
    currentTimer = appState.settings.shortBreakMinutes * 60;
  } else {
    logActivity('timer', 'Skipped Break');
    sessionType = 'focus';
    currentTimer = appState.settings.focusDurationMinutes * 60;
  }
  renderTimer();
}

let savedFocusTimerState = null;

function startCustomBreak(mins) {
  const modal = document.getElementById('break-picker-modal');
  if (modal) modal.classList.add('hidden');
  
  savedFocusTimerState = {
    currentTimer: currentTimer,
    timerRunning: timerRunning
  };
  
  pauseTimer();
  sessionType = 'shortBreak';
  currentTimer = (parseInt(mins) || 5) * 60;
  playChime('click');
  showCustomToast('☕ Break Started', `Enjoy your ${mins} min break! Focus timer will resume automatically after.`);
  startTimer();
  renderTimer();
}

function startCustomBreakInput() {
  const input = document.getElementById('input-custom-break-mins');
  const val = input ? parseInt(input.value) : 5;
  startCustomBreak(val || 5);
}

function endBreakAndResumeFocus() {
  playChime('breakComplete');
  pauseTimer();
  sessionType = 'focus';
  if (savedFocusTimerState && savedFocusTimerState.currentTimer > 0) {
    currentTimer = savedFocusTimerState.currentTimer;
  } else {
    currentTimer = appState.settings.focusDurationMinutes * 60;
  }
  savedFocusTimerState = null;
  showCustomToast('🎯 Resuming Focus', 'Break ended! Focus timer has resumed.');
  startTimer();
  renderTimer();
}

window.startCustomBreak = startCustomBreak;
window.startCustomBreakInput = startCustomBreakInput;
window.endBreakAndResumeFocus = endBreakAndResumeFocus;

function extendTimer(extraMins) {
  const extraSecs = extraMins * 60;
  currentTimer += extraSecs;
  
  const taskId = targetReachedTaskId || activeTaskId;
  if (taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (task) {
      task.targetDuration = (task.targetDuration || 0) + extraSecs;
    }
  }
  
  targetReachedTaskId = null;
  showCustomToast('Timer Extended!', `Added +${extraMins} mins to focus session.`);
  
  const modal = document.getElementById('task-target-modal');
  if (modal) modal.classList.add('hidden');
  
  renderAll();
  saveAppState();
  if (!timerRunning) {
    startTimer();
  }
}

window.extendTimer = extendTimer;

function extendCurrentTaskCustom() {
  const input = document.getElementById('input-custom-extend-mins');
  const val = input ? parseInt(input.value) : 10;
  extendTimer(val || 10);
}
window.extendCurrentTaskCustom = extendCurrentTaskCustom;

function timerFinished() {
  pauseTimer();
  if (sessionType === 'focus') {
    logActivity('timer', 'Completed a Focus Session');
    playChime('focusComplete');
    if (typeof addXP === 'function') addXP(200);

    // Auto switch from compact view mode to full screen mode to view popup
    if (document.body.classList.contains('mini-mode') || isWidgetMode) {
      toggleMiniMode(false);
    }

    // Always trigger popup modal with extension & break options!
    const modal = document.getElementById('task-target-modal');
    const msg = document.getElementById('task-target-modal-msg');
    const task = activeTaskId ? appState.tasks.find(t => t.id === activeTaskId) : null;
    
    if (msg) {
      if (task) {
        msg.textContent = `🎯 Focus session / Goal complete for "${task.name}"! Need more time, ready for a break, or mark complete?`;
      } else {
        msg.textContent = `⏰ Focus session complete! Need more time or ready for a break?`;
      }
    }

    const finishBtn = document.getElementById('btn-finish-target-task');
    if (finishBtn) {
      const newFinishBtn = finishBtn.cloneNode(true);
      finishBtn.parentNode.replaceChild(newFinishBtn, finishBtn);
      newFinishBtn.addEventListener('click', () => {
        if (modal) modal.classList.add('hidden');
        const targetId = (task && task.id) || targetReachedTaskId || activeTaskId;
        if (targetId) {
          completeTask(targetId);
        } else {
          showCustomToast('Great job!', 'Completed focus session.');
        }
      });
    }

    if (modal) modal.classList.remove('hidden');

    if (appState.settings.notifications && window.electronAPI && window.electronAPI.sendNotification) {
      window.electronAPI.sendNotification({ title: 'Focus Session Complete!', body: 'Earned 200 XP. Choose to extend or take a break.' });
    }
    showCustomToast('Focus Session Complete!', 'Earned 200 XP. Choose to extend time or take a break.');
  } else {
    // Break finished! Resume focus timer automatically!
    logActivity('timer', 'Completed a Break');
    playChime('breakComplete');
    sessionType = 'focus';
    currentTimer = appState.settings.focusDurationMinutes * 60;
    if (appState.settings.notifications && window.electronAPI && window.electronAPI.sendNotification) {
      window.electronAPI.sendNotification({ title: 'Break over!', body: 'Time to resume focusing.' });
    }
    showCustomToast('Break over!', 'Time to resume focusing.');
    startTimer();
  }
  rotateQuote();
  renderAll();
  saveAppState();
}

// --- Task Target Duration & Extension Controllers ---
let targetReachedTaskId = null;

function triggerTaskTargetModal(task) {
  if (!task || targetReachedTaskId === task.id) return;
  targetReachedTaskId = task.id;

  // Auto switch from compact view mode to full screen mode to view complete details & options
  if (document.body.classList.contains('mini-mode') || isWidgetMode) {
    toggleMiniMode(false);
  }

  const msg = document.getElementById('task-target-modal-msg');
  if (msg) {
    const minsStr = Math.floor(task.targetDuration / 60);
    msg.textContent = `🎯 Goal reached for "${task.name}" (${minsStr} mins completed)! Need more time to finish?`;
  }

  const modal = document.getElementById('task-target-modal');
  if (modal) modal.classList.remove('hidden');

  playChime('focusComplete');
  if (appState.settings.notifications && window.electronAPI && window.electronAPI.sendNotification) {
    window.electronAPI.sendNotification({ title: 'Task Target Reached!', body: `You completed your goal for ${task.name}` });
  }
  showCustomToast('Task Target Reached!', `Completed goal for ${task.name}`);

  const finishBtn = document.getElementById('btn-finish-target-task');
  if (finishBtn) {
    const newFinishBtn = finishBtn.cloneNode(true);
    finishBtn.parentNode.replaceChild(newFinishBtn, finishBtn);
    newFinishBtn.addEventListener('click', () => {
      document.getElementById('task-target-modal').classList.add('hidden');
      completeTask(task.id);
    });
  }
}

function extendCurrentTask(extraMins) {
  extendTimer(extraMins);
}

function extendCurrentTaskCustom() {
  const input = document.getElementById('input-custom-extend-mins');
  const mins = parseInt(input ? input.value : 0);
  if (mins && mins > 0) {
    extendTimer(mins);
    if (input) input.value = '';
  }
}

function extendTaskTargetById(id, mins) {
  const task = appState.tasks.find(t => t.id === id);
  if (task) {
    task.targetDuration = (task.targetDuration || 0) + (mins * 60);
    showCustomToast('Timer Extended!', `Added +${mins} mins to ${task.name}`);
    renderAll();
    saveAppState();
  }
}

window.triggerTaskTargetModal = triggerTaskTargetModal;
window.extendCurrentTask = extendCurrentTask;
window.extendCurrentTaskCustom = extendCurrentTaskCustom;
window.extendTaskTargetById = extendTaskTargetById;

// --- Task Control Actions ---
function completeTask(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;
  
  // Check if completion was recorded today
  const isCompletedToday = task.completedAt && (new Date(task.completedAt).toDateString() === new Date().toDateString());
  if (!isCompletedToday) {
    // Archive previous reflection into task history before clearing active entry for today
    if (task.completionNote || task.completionImage || task.completionVideo || task.completionDocument) {
      if (!task.history) task.history = {};
      const prevDate = task.completedAt ? new Date(task.completedAt).toDateString() : new Date().toDateString();
      if (!task.history[prevDate]) {
        task.history[prevDate] = {
          completed: true,
          completionNote: task.completionNote || '',
          completionImage: task.completionImage || null,
          completionVideo: task.completionVideo || null,
          completionDocument: task.completionDocument || null
        };
      }
    }
    task.completionNote = '';
    task.completionImage = null;
    task.completionVideo = null;
    task.completionDocument = null;
  }

  // Set task completed immediately so it moves to Completed section
  task.completed = true;
  task.completedAt = new Date().toISOString();
  logActivity('task', `Completed task: ${task.name}`);
  playChime('taskComplete');
  
  // Auto switch from compact view mode to full screen mode to view reflection prompt & full task details
  if (document.body.classList.contains('mini-mode') || isWidgetMode) {
    toggleMiniMode(false);
  }
  
  if (appState.settings.notifications) {
    window.electronAPI.sendNotification({ title: 'Task Completed!', body: `You finished: ${task.name}` });
    showCustomToast('Task Completed!', `You finished: ${task.name}`);
  }

  if (typeof addXP === 'function') addXP(50);
  
  if (activeTaskId === id) {
    // Find the next incomplete task for today to auto-advance
    const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayWeekday = weekdays[new Date().getDay()];
    const nextTask = appState.tasks.find(t => !t.completed && t.id !== id && (t.plannerDay === todayWeekday));
    if (nextTask) {
      activeTaskId = nextTask.id;
    } else {
      activeTaskId = null;
    }
  }

  // Immediately render UI to update Completed Tasks list and save state
  renderAll();
  saveAppState();

  pendingScreensaverReflectionTaskId = id;
  openCompletionModal(id);
}

function uncompleteTask(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (task) logActivity('task', `Un-completed task: ${task.name}`);
  if (!task) return;
  
  task.completed = false;
  task.completionNote = '';
  task.completionImage = null;
  task.completionVideo = null;
  task.completionDocument = null;
  playChime('click');
  
  renderTasks();
  renderStats();
  renderSelectedDayTasks();
  saveAppState();
}

function deleteTask(id) {
  playChime('click');
  const task = appState.tasks.find(t => t.id === id);
  if (task) {
    logActivity('task', `Deleted task: "${task.name}"`);
  }
  appState.tasks = appState.tasks.filter(t => t.id !== id);
  if (activeTaskId === id) {
    activeTaskId = null;
    pauseTimer();
  }
  renderTasks();
  renderStats();
  renderSelectedDayTasks();
  saveAppState();
}

function updateQuantity(id, change) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task || task.type !== 'quantity' || task.completed) return;
  
  task.currentQty = Math.max(0, task.currentQty + change);
  playChime('click');
  
  const todayStr = new Date().toDateString();
  const target = typeof getEffectiveTaskTarget === 'function' ? getEffectiveTaskTarget(task, todayStr) : task.targetQty;
  
  logActivity('task', `Updated quantity for task: ${task.name} (${task.currentQty}/${target})`);
  
  if (task.currentQty >= target) {
    completeTask(id);
  } else {
    renderTasks();
    renderStats();
    saveAppState();
  }
}

function toggleTaskFocus(id) {
  playChime('click');
  
  if (activeTaskId === id) {
    toggleTimer();
  } else {
    const oldTask = appState.tasks.find(t => t.id === activeTaskId);
    const newTask = appState.tasks.find(t => t.id === id);
    
    if (timerRunning) {
      const startTs = appState.sessionStartTimestamp || sessionStartTimestamp;
      const timeData = formatSessionTimeDetails(startTs);
      
      const oldName = oldTask ? oldTask.name : 'Focus Session';
      const newName = newTask ? newTask.name : 'Task';
      logActivity('timer', `Switched focus: Stopped ${oldName} ➔ Started ${newName}`, timeData);
      
      // Reset sessionStartTimestamp for new task!
      sessionStartTimestamp = Date.now();
      appState.sessionStartTimestamp = sessionStartTimestamp;
    }
    
    activeTaskId = id;
    sessionType = 'focus';
    
    if (currentTimer === 0) {
      currentTimer = appState.settings.focusDurationMinutes * 60;
    }
    
    if (!timerRunning) {
      startTimer();
    } else {
      renderTimer();
    }
  }
  renderTasks();
  saveAppState();
}

// Event bindings & list collapsible settings
function setupEventListeners() {
  elBtnPlayPause.addEventListener('click', toggleTimer);
if (elMiniTimerPlayPause) {
  elMiniTimerPlayPause.addEventListener('click', toggleTimer);
}
  elBtnReset.addEventListener('click', resetTimer);
  elBtnSkip.addEventListener('click', skipSession);
  
  const btnTakeBreak = document.getElementById('btn-take-break');
  if (btnTakeBreak) {
    btnTakeBreak.addEventListener('click', () => {
      if (sessionType === 'shortBreak' || sessionType === 'longBreak') {
        endBreakAndResumeFocus();
      } else {
        const modal = document.getElementById('break-picker-modal');
        if (modal) modal.classList.remove('hidden');
      }
    });
  }

  const breakOptBtns = document.querySelectorAll('.break-opt-btn');
  breakOptBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mins = e.currentTarget.getAttribute('data-mins') || 5;
      startCustomBreak(mins);
    });
  });

  const btnStartCustomBreakInput = document.getElementById('btn-start-custom-break-input');
  if (btnStartCustomBreakInput) {
    btnStartCustomBreakInput.addEventListener('click', startCustomBreakInput);
  }
  
  elBtnTogglePending.addEventListener('click', () => {
    document.getElementById('pending-section').classList.toggle('open');
  });
  const btnAi = document.getElementById('btn-generate-ai-review'); if (btnAi) { btnAi.addEventListener('click', generateAIReview); }
  elBtnToggleCompleted.addEventListener('click', () => {
    document.getElementById('completed-section').classList.toggle('open');
  });
  
  if (elMiniTaskSwitcher) {
    elMiniTaskSwitcher.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      if (selectedId) {
        if (activeTaskId !== selectedId) {
          toggleTaskFocus(selectedId);
        }
      }
    });
  }
}

// Window actions
window.updateQuantity = updateQuantity;
window.completeTask = completeTask;
window.uncompleteTask = uncompleteTask;
window.deleteTask = deleteTask;
window.toggleTaskFocus = toggleTaskFocus;
window.toggleHabit = toggleHabit;
window.deleteHabit = deleteHabit;
window.toggleSubtask = toggleSubtask;
window.deleteSubtask = deleteSubtask;

function moveTaskUp(id) {
  playChime('click');
  const idx = appState.tasks.findIndex(t => t.id === id);
  if (idx > 0) {
    const temp = appState.tasks[idx];
    appState.tasks[idx] = appState.tasks[idx - 1];
    appState.tasks[idx - 1] = temp;
    renderTasks();
    saveAppState();
  }
}

function moveTaskDown(id) {
  playChime('click');
  const idx = appState.tasks.findIndex(t => t.id === id);
  if (idx !== -1 && idx < appState.tasks.length - 1) {
    const temp = appState.tasks[idx];
    appState.tasks[idx] = appState.tasks[idx + 1];
    appState.tasks[idx + 1] = temp;
    renderTasks();
    saveAppState();
  }
}

window.moveTaskUp = moveTaskUp;
window.moveTaskDown = moveTaskDown;

window.addEventListener('DOMContentLoaded', initApp);

// --- Gamification Logic ---
function addXP(amount) {
  if (appState.xp === undefined) appState.xp = 0;
  appState.xp += amount;
  updateLevelUI();
  saveAppState();
}

function updateLevelUI() {
  if (appState.xp === undefined) appState.xp = 0;
  const currentLevel = Math.floor(Math.sqrt(appState.xp / 100)) + 1;
  const elLevelBadge = document.getElementById("user-level");
  if (elLevelBadge) {
    elLevelBadge.textContent = currentLevel;
  }
}
window.addXP = addXP;
window.updateLevelUI = updateLevelUI;

// --- v1.3 Local Rule-Based AI Day Review Engine ---

function compileDailyStats() {
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayWeekday = weekdays[new Date().getDay()];
  const todayTasks = appState.tasks.filter(t => t.plannerDay === todayWeekday);
  
  const stats = {
    focusSeconds: appState.focusTimeToday || 0,
    distractions: appState.distractionsCount || 0,
    tasksTotal: todayTasks.length,
    tasksCompleted: todayTasks.filter(t => t.completed).length,
    habitsTotal: appState.habits.length,
    habitsCompleted: appState.habits.filter(h => h.completed).length,
    longestStreak: 0,
    missedHabits: [],
    completedTasks: [],
    pendingTasks: [],
    yesterdayScore: 0
  };

  // Habit metrics
  appState.habits.forEach(h => {
    if (h.streak > stats.longestStreak) stats.longestStreak = h.streak;
    if (!h.completed) stats.missedHabits.push(h.name);
  });

  // Task metrics
  todayTasks.forEach(t => {
    if (!t.completed) {
      stats.pendingTasks.push(t.name);
    }
  });
  
  // For completed tasks, pull from BOTH today's scheduled tasks AND the actual activity log for today!
  const todayStr = new Date().toDateString();
  const logCompletions = (appState.activityLog || [])
    .filter(log => log.date === todayStr && log.type === 'task' && log.message.startsWith('Completed task: '))
    .map(log => log.message.replace('Completed task: ', '').trim());
    
  const scheduledCompletions = todayTasks.filter(t => t.completed).map(t => t.name);
  stats.completedTasks = [...new Set([...logCompletions, ...scheduledCompletions])];
  stats.tasksCompleted = stats.completedTasks.length;

  // Historical comparison
  if (appState.history && appState.history.length > 0) {
    const yesterday = appState.history[appState.history.length - 1];
    // Calculate a rough score for yesterday to compare
    const yFocusScore = Math.min((yesterday.focusSeconds || 0) / 3600, 4) * 10;
    const yTaskScore = (yesterday.totalTasks > 0) ? ((yesterday.completedTasks || 0) / yesterday.totalTasks) * 40 : 0;
    stats.yesterdayScore = yFocusScore + yTaskScore;
  }

  return stats;
}

function generateCoachingReport(stats) {
  let score = 0;
  
  // 1. Calculate Score (Max 100)
  // Focus Time: Max 40 points (for 4 hours)
  const focusHours = stats.focusSeconds / 3600;
  let focusScore = Math.min(focusHours * 10, 40);
  
  // Task Completion: Max 40 points
  let taskScore = 0;
  if (stats.tasksTotal > 0) {
    taskScore = (stats.tasksCompleted / stats.tasksTotal) * 40;
  }

  // Habit Completion: Max 20 points
  let habitScore = 0;
  if (stats.habitsTotal > 0) {
    habitScore = (stats.habitsCompleted / stats.habitsTotal) * 20;
  }

  // Distraction Penalty: -2 points per distraction
  let penalty = stats.distractions * 2;

  score = Math.max(0, Math.min(100, Math.round(focusScore + taskScore + habitScore - penalty)));

  // 2. Determine Grade & Summary
  let grade = "";
  let summary = "";
  if (score >= 90) {
    grade = "Elite Focus";
    summary = `Incredible work today! You maintained intense focus for ${focusHours.toFixed(1)} hours and absolutely crushed your tasks. Keep this momentum going!`;
  } else if (score >= 70) {
    grade = "Solid Day";
    summary = `A very productive day! You logged ${focusHours.toFixed(1)} hours of focus time. A few things slipped, but overall, you're making great progress.`;
  } else if (score >= 50) {
    grade = "Average Work";
    summary = `You showed up, but there's room for improvement. With ${focusHours.toFixed(1)} hours focused and ${stats.distractions} distractions, your attention was split.`;
  } else {
    grade = "Needs Attention";
    summary = `Today was a bit scattered. With only ${focusHours.toFixed(1)} hours of deep work and many unfinished items, you might be feeling overwhelmed. Let's reset for tomorrow.`;
  }

  // 3. Generate Strengths
  const strengths = [];
  if (focusHours > 2) strengths.push(`Strong focus time (${focusHours.toFixed(1)} hrs).`);
  if (stats.tasksTotal > 0 && stats.tasksCompleted === stats.tasksTotal) strengths.push("Completed every single task on your list.");
  if (stats.habitsTotal > 0 && stats.habitsCompleted === stats.habitsTotal) strengths.push("Flawless habit consistency today.");
  if (stats.longestStreak >= 3) strengths.push(`Maintained a solid ${stats.longestStreak}-day habit streak.`);
  if (stats.distractions === 0 && focusHours > 1) strengths.push("Zero detected distractions during work sessions.");
  if (score > stats.yesterdayScore + 10) strengths.push("Significant productivity improvement compared to yesterday.");
  if (strengths.length === 0) strengths.push("Showed up and logged activity.");

  // 4. Generate Weaknesses
  const weaknesses = [];
  if (stats.distractions > 3) weaknesses.push(`High distraction rate (${stats.distractions} interruptions).`);
  if (stats.pendingTasks.length > 3) weaknesses.push(`Too many unfinished tasks (${stats.pendingTasks.length} pending).`);
  if (stats.missedHabits.length > 0) weaknesses.push(`Skipped important habits: ${stats.missedHabits.join(', ')}.`);
  if (focusHours < 1) weaknesses.push("Very low deep work time logged.");
  if (score < stats.yesterdayScore - 10) weaknesses.push("Productivity dropped compared to yesterday.");
  if (weaknesses.length === 0) weaknesses.push("No major weaknesses detected today!");

  // 5. Generate Insights (Patterns)
  const insights = [];
  if (focusHours > 6) insights.push("Burnout Warning: You are logging very high focus hours. Ensure you are taking adequate breaks.");
  if (stats.pendingTasks.length > stats.tasksCompleted) insights.push("Task Overload: You are scheduling more tasks than you are completing.");
  if (stats.missedHabits.includes("excercise") || stats.missedHabits.includes("Meditation 10 minute")) insights.push("Wellness Warning: You are skipping personal care habits for work tasks.");
  if (stats.distractions > 5) insights.push("Focus Fragmentation: You are getting pulled away from work too frequently.");
  if (insights.length === 0) insights.push("Your daily rhythms look healthy and balanced.");

  // 6. Generate Recommendations
  const recommendations = [];
  if (stats.distractions > 3) recommendations.push("Turn on 'Do Not Disturb' on your phone before starting the timer.");
  if (stats.pendingTasks.length > 0) recommendations.push("Break your pending tasks down into smaller, 20-minute chunks.");
  if (stats.missedHabits.length > 0) recommendations.push(`Schedule ${stats.missedHabits[0]} immediately after waking up tomorrow so you don't forget it.`);
  if (focusHours < 2) recommendations.push("Aim for at least one 60-minute uninterrupted work block tomorrow morning.");
  if (recommendations.length === 0) recommendations.push("Keep sticking to your current system—it is working perfectly!");

  // 7. Tomorrow's Plan
  let tomorrow = "";
  if (stats.pendingTasks.length > 0) {
    tomorrow = `Prioritize your unfinished tasks: ${stats.pendingTasks.slice(0, 2).join(', ')}. Try to knock these out in your first focus block.`;
  } else {
    tomorrow = "You have a clean slate! Plan 2-3 high-impact tasks for tomorrow and protect your focus time.";
  }

  return {
    score,
    grade,
    summary,
    strengths,
    weaknesses,
    insights,
    recommendations,
    tomorrow
  };
}

// --- AFK Idle Pausing & Screensaver Logic ---
const elScreensaverOverlay = document.getElementById('screensaver-overlay');
const elScreensaverImage = document.getElementById('screensaver-image');
const elScreensaverBg = document.getElementById('screensaver-bg');
let screensaverActive = false;

if (elScreensaverImage) {
  elScreensaverImage.onload = () => {
    // ALWAYS use contain to show the entire full image without cropping top/bottom edges
    elScreensaverImage.style.objectFit = 'contain';
    elScreensaverImage.style.width = 'auto';
    elScreensaverImage.style.height = 'auto';
    elScreensaverImage.style.maxWidth = '94vw';
    elScreensaverImage.style.maxHeight = '94vh';
  };
}

async function showScreensaver() {
  if (screensaverActive) return;

  // Don't show screensaver if task reflection modal or goal reached modal is visible
  const completionModal = document.getElementById('completion-modal');
  if (completionModal && !completionModal.classList.contains('hidden')) return;

  const targetModal = document.getElementById('task-target-modal');
  if (targetModal && !targetModal.classList.contains('hidden')) return;

  screensaverActive = true;
  
  // Load a fresh random quote image
  try {
    const result = await window.electronAPI.getRandomQuoteImage();
    const imgSrc = result.source === 'user' ? result.data : `assets/quotes/quote_${result.index}.png`;
    elScreensaverImage.src = imgSrc;
    if (elScreensaverBg) elScreensaverBg.src = imgSrc;
  } catch (e) {
    elScreensaverImage.src = 'assets/quotes/quote_1.png';
    if (elScreensaverBg) elScreensaverBg.src = 'assets/quotes/quote_1.png';
  }
  
  elScreensaverOverlay.classList.remove('hidden');
  // Small delay to allow CSS transition to fade it in
  setTimeout(() => {
    elScreensaverImage.style.opacity = '1.0';
    if (elScreensaverBg) elScreensaverBg.style.opacity = '1.0';
  }, 50);
}

function hideScreensaver(immediate = false) {
  if (!screensaverActive && (!elScreensaverOverlay || elScreensaverOverlay.classList.contains('hidden'))) return;
  screensaverActive = false;
  
  elScreensaverImage.style.opacity = '0';
  if (elScreensaverBg) elScreensaverBg.style.opacity = '0';
  if (immediate) {
    if (elScreensaverOverlay) elScreensaverOverlay.classList.add('hidden');
  } else {
    setTimeout(() => {
      if (elScreensaverOverlay) elScreensaverOverlay.classList.add('hidden');
    }, 1000); // Matches CSS transition duration
  }
}

// Dismiss screensaver on any local app interaction
window.addEventListener('click', hideScreensaver);
window.addEventListener('mousemove', hideScreensaver);
window.addEventListener('keydown', hideScreensaver);

setInterval(async () => {
  if (window.electronAPI && window.electronAPI.getSystemIdleTime) {
    try {
      const idleSeconds = await window.electronAPI.getSystemIdleTime();
      const ssMins = (appState.settings && appState.settings.screensaverTimeoutMinutes) || 1;
      const idleMins = (appState.settings && appState.settings.idleTimeoutMinutes) || 3;

      // 1. Screensaver activates at 1 minute of inactivity
      if (idleSeconds >= ssMins * 60) {
        showScreensaver();
      }

      // 2. Focus timer auto-pauses at 3 minutes of idle time
      if (idleSeconds >= idleMins * 60) {
        if (timerRunning) {
          pauseTimer();
          logActivity('timer', 'Auto-paused (User Idle)');
          if (appState.settings.notifications) {
            window.electronAPI.sendNotification({ title: 'Timer Paused', body: `You were idle for ${idleMins} minute(s), so we paused your focus timer.` });
            showCustomToast('Timer Paused', `You were idle for ${idleMins} minute(s), so we paused your focus timer.`);
          }
        }
      }
    } catch (e) {
      console.error("Failed to get OS idle time", e);
    }
  }
}, 5000); // Check every 5 seconds for prompt response

// --- Custom In-App Toast Notification System ---
function showCustomToast(title, body) {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
    document.body.appendChild(toastContainer);
  }
  
  const toast = document.createElement('div');
  toast.style.cssText = 'background: rgba(20, 20, 30, 0.95); border-left: 4px solid var(--theme-color); border-radius: 8px; padding: 15px 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); min-width: 250px; color: white; font-family: var(--font-main); transform: translateX(120%); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); backdrop-filter: blur(10px);';
  
  toast.innerHTML = `
    <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; color: var(--theme-color);">${title}</div>
    <div style="font-size: 12px; color: rgba(255,255,255,0.8);">${body}</div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
  });
  
  // Animate out and remove after 5 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// --- App Close & Hard Stop Event Logger ---
let isAppCloseLogged = false;
function handleAppCloseLog() {
  if (isAppCloseLogged) return;
  isAppCloseLogged = true;
  try {
    const startTs = (appState && appState.sessionStartTimestamp) || (typeof sessionStartTimestamp !== 'undefined' ? sessionStartTimestamp : null);
    if (startTs || (typeof timerRunning !== 'undefined' && timerRunning)) {
      const timeData = formatSessionTimeDetails(startTs);

      let taskName = 'Focus Session';
      if (sessionType === 'focus' && typeof activeTaskId !== 'undefined' && activeTaskId) {
        const t = appState.tasks.find(x => x.id === activeTaskId);
        if (t) taskName = t.name;
      }
      logActivity('timer', `Hard stopped: ${taskName}`, timeData);
      timerRunning = false;
      sessionStartTimestamp = null;
      appState.sessionStartTimestamp = null;
    }

    let appStartTs = null;
    if (appState.activityLog) {
      for (let i = appState.activityLog.length - 1; i >= 0; i--) {
        if (appState.activityLog[i].message && appState.activityLog[i].message.includes('App started')) {
          appStartTs = appState.activityLog[i].timestamp;
          break;
        }
      }
    }
    
    let systemTimeData = {};
    if (appStartTs) {
      systemTimeData = formatSessionTimeDetails(appStartTs);
    } else {
      const now = new Date();
      systemTimeData = { stopTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) };
    }

    logActivity('system', 'App closed / Session ended', systemTimeData);

    if (window.electronAPI && window.electronAPI.saveDataSync) {
      window.electronAPI.saveDataSync(JSON.parse(JSON.stringify(appState)));
    } else {
      saveAppState();
    }
    
    if (window.electronAPI && window.electronAPI.notifyReadyToClose) {
      window.electronAPI.notifyReadyToClose();
    }
  } catch (err) {}
}

window.addEventListener('beforeunload', handleAppCloseLog);

if (window.electronAPI && window.electronAPI.onWindowClosing) {
  window.electronAPI.onWindowClosing(handleAppCloseLog);
}

// --- Completion Reflection Modal & Screenshot/Video/Doc Uploader ---
let pendingCompletionTaskId = null;
let currentCompletionImageData = null;
let currentCompletionVideoData = null;
let currentCompletionDocData = null;

function openCompletionModal(taskId) {
  pendingCompletionTaskId = taskId;
  currentCompletionImageData = null;
  currentCompletionVideoData = null;
  currentCompletionDocData = null;

  // Dismiss screensaver if active so reflection modal is shown on main dashboard
  hideScreensaver(true);

  const modal = document.getElementById('completion-modal');
  const inputNote = document.getElementById('completion-note-input');
  
  // Image elements
  const imgPreviewContainer = document.getElementById('completion-image-preview-container');
  const imgPreview = document.getElementById('completion-image-preview');
  const imgFileInput = document.getElementById('completion-image-file');
  const btnClearImg = document.getElementById('btn-clear-completion-image');

  // Video elements
  const videoPreviewContainer = document.getElementById('completion-video-preview-container');
  const videoPreview = document.getElementById('completion-video-preview');
  const videoFileInput = document.getElementById('completion-video-file');
  const btnClearVideo = document.getElementById('btn-clear-completion-video');

  // Document elements
  const docPreviewContainer = document.getElementById('completion-doc-preview-container');
  const docNameSpan = document.getElementById('completion-doc-name');
  const docFileInput = document.getElementById('completion-doc-file');
  const btnClearDoc = document.getElementById('btn-clear-completion-doc');

  // Reset fields
  if (inputNote) inputNote.value = '';
  
  if (imgPreviewContainer) imgPreviewContainer.classList.add('hidden');
  if (imgPreview) imgPreview.src = '';
  if (imgFileInput) imgFileInput.value = '';
  if (btnClearImg) btnClearImg.classList.add('hidden');

  if (videoPreviewContainer) videoPreviewContainer.classList.add('hidden');
  if (videoPreview) videoPreview.src = '';
  if (videoFileInput) videoFileInput.value = '';
  if (btnClearVideo) btnClearVideo.classList.add('hidden');

  if (docPreviewContainer) docPreviewContainer.classList.add('hidden');
  if (docNameSpan) docNameSpan.textContent = '';
  if (docFileInput) docFileInput.value = '';
  if (btnClearDoc) btnClearDoc.classList.add('hidden');

  // Pre-fill existing task completion data if available
  const task = appState.tasks.find(t => t.id === taskId);
  if (task) {
    if (task.completionNote && inputNote) inputNote.value = task.completionNote;
    if (task.completionImage) {
      currentCompletionImageData = task.completionImage;
      if (imgPreview) imgPreview.src = task.completionImage;
      if (imgPreviewContainer) imgPreviewContainer.classList.remove('hidden');
      if (btnClearImg) btnClearImg.classList.remove('hidden');
    }
    if (task.completionVideo) {
      currentCompletionVideoData = task.completionVideo;
      if (videoPreview) videoPreview.src = task.completionVideo;
      if (videoPreviewContainer) videoPreviewContainer.classList.remove('hidden');
      if (btnClearVideo) btnClearVideo.classList.remove('hidden');
    }
    if (task.completionDocument) {
      currentCompletionDocData = task.completionDocument;
      if (docNameSpan) docNameSpan.textContent = task.completionDocument.name || 'Document';
      if (docPreviewContainer) docPreviewContainer.classList.remove('hidden');
      if (btnClearDoc) btnClearDoc.classList.remove('hidden');
    }
  }

  if (document.body.classList.contains('mini-mode') || isWidgetMode) {
    toggleMiniMode(false);
  }

  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      if (inputNote) inputNote.focus();
    }, 100);
  }
}

function finalizeTaskCompletion(noteText, imageData, videoData, docData) {
  const modal = document.getElementById('completion-modal');
  if (modal) modal.classList.add('hidden');

  if (!pendingCompletionTaskId) return;
  const task = appState.tasks.find(t => t.id === pendingCompletionTaskId);
  if (task) {
    task.completed = true;
    task.completedAt = new Date().toISOString();
    task.completionNote = noteText || '';
    if (imageData !== undefined) task.completionImage = imageData;
    if (videoData !== undefined) task.completionVideo = videoData;
    if (docData !== undefined) task.completionDocument = docData;
    const hasNote = !!(noteText && noteText.trim());
    const hasImage = !!(task.completionImage);
    const hasVideo = !!(task.completionVideo);
    const hasDoc = !!(task.completionDocument);

    logActivity('task', `Completed task: ${task.name}`, {
      taskId: task.id,
      hasNote,
      hasImage,
      hasVideo,
      hasDoc
    });
    if (hasNote || hasImage || hasVideo || hasDoc) {
      const summary = hasNote ? `"${noteText.trim()}"` : 'Attachment proof added';
      logActivity('reflection', `Reflection for task "${task.name}": ${summary}`, {
        taskId: task.id,
        hasNote,
        hasImage,
        hasVideo,
        hasDoc
      });
    }
    playChime('taskComplete');
    if (typeof addXP === 'function') addXP(50);
    renderAll();
    saveAppState();
  }
  pendingCompletionTaskId = null;
  pendingScreensaverReflectionTaskId = null;
  currentCompletionImageData = null;
  currentCompletionVideoData = null;
  currentCompletionDocData = null;
}

function openImageViewer(imgSrc) {
  const modal = document.getElementById('image-viewer-modal');
  const img = document.getElementById('image-viewer-img');
  if (modal && img) {
    img.src = imgSrc;
    modal.classList.remove('hidden');
  }
}

window.openImageViewer = openImageViewer;
window.openCompletionModal = openCompletionModal;
window.finalizeTaskCompletion = finalizeTaskCompletion;

const elBtnCloseCompletionModal = document.getElementById('btn-close-completion-modal');
const elBtnSaveCompletion = document.getElementById('btn-save-completion');
const elBtnSkipCompletion = document.getElementById('btn-skip-completion');

// Image inputs
const elBtnUploadCompletionImage = document.getElementById('btn-upload-completion-image');
const elCompletionImageFile = document.getElementById('completion-image-file');
const elBtnClearCompletionImage = document.getElementById('btn-clear-completion-image');

// Video inputs
const elBtnUploadCompletionVideo = document.getElementById('btn-upload-completion-video');
const elCompletionVideoFile = document.getElementById('completion-video-file');
const elBtnClearCompletionVideo = document.getElementById('btn-clear-completion-video');

// Document inputs
const elBtnUploadCompletionDoc = document.getElementById('btn-upload-completion-doc');
const elCompletionDocFile = document.getElementById('completion-doc-file');
const elBtnClearCompletionDoc = document.getElementById('btn-clear-completion-doc');

const elBtnCloseImageViewer = document.getElementById('btn-close-image-viewer');
const elImageViewerModal = document.getElementById('image-viewer-modal');

if (elBtnCloseCompletionModal) {
  elBtnCloseCompletionModal.addEventListener('click', () => {
    const modal = document.getElementById('completion-modal');
    if (modal) modal.classList.add('hidden');
    pendingCompletionTaskId = null;
  });
}

if (elBtnSkipCompletion) {
  elBtnSkipCompletion.addEventListener('click', () => {
    finalizeTaskCompletion('', null, null, null);
  });
}

if (elBtnSaveCompletion) {
  elBtnSaveCompletion.addEventListener('click', () => {
    const input = document.getElementById('completion-note-input');
    const noteText = input ? input.value.trim() : '';
    finalizeTaskCompletion(noteText, currentCompletionImageData, currentCompletionVideoData, currentCompletionDocData);
  });
}

// Image handler
if (elBtnUploadCompletionImage && elCompletionImageFile) {
  elBtnUploadCompletionImage.addEventListener('click', () => {
    elCompletionImageFile.click();
  });
  
  elCompletionImageFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        currentCompletionImageData = evt.target.result;
        const previewImg = document.getElementById('completion-image-preview');
        const previewContainer = document.getElementById('completion-image-preview-container');
        if (previewImg) previewImg.src = currentCompletionImageData;
        if (previewContainer) previewContainer.classList.remove('hidden');
        if (elBtnClearCompletionImage) elBtnClearCompletionImage.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });
}

if (elBtnClearCompletionImage) {
  elBtnClearCompletionImage.addEventListener('click', () => {
    currentCompletionImageData = null;
    const previewContainer = document.getElementById('completion-image-preview-container');
    const previewImg = document.getElementById('completion-image-preview');
    if (previewContainer) previewContainer.classList.add('hidden');
    if (previewImg) previewImg.src = '';
    if (elCompletionImageFile) elCompletionImageFile.value = '';
    elBtnClearCompletionImage.classList.add('hidden');
  });
}

// Video handler
if (elBtnUploadCompletionVideo && elCompletionVideoFile) {
  elBtnUploadCompletionVideo.addEventListener('click', () => {
    elCompletionVideoFile.click();
  });

  elCompletionVideoFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        currentCompletionVideoData = evt.target.result;
        const videoPreview = document.getElementById('completion-video-preview');
        const videoPreviewContainer = document.getElementById('completion-video-preview-container');
        if (videoPreview) videoPreview.src = currentCompletionVideoData;
        if (videoPreviewContainer) videoPreviewContainer.classList.remove('hidden');
        if (elBtnClearCompletionVideo) elBtnClearCompletionVideo.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });
}

if (elBtnClearCompletionVideo) {
  elBtnClearCompletionVideo.addEventListener('click', () => {
    currentCompletionVideoData = null;
    const videoPreviewContainer = document.getElementById('completion-video-preview-container');
    const videoPreview = document.getElementById('completion-video-preview');
    if (videoPreviewContainer) videoPreviewContainer.classList.add('hidden');
    if (videoPreview) videoPreview.src = '';
    if (elCompletionVideoFile) elCompletionVideoFile.value = '';
    elBtnClearCompletionVideo.classList.add('hidden');
  });
}

// Document handler
if (elBtnUploadCompletionDoc && elCompletionDocFile) {
  elBtnUploadCompletionDoc.addEventListener('click', () => {
    elCompletionDocFile.click();
  });

  elCompletionDocFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        currentCompletionDocData = {
          name: file.name,
          data: evt.target.result
        };
        const docNameSpan = document.getElementById('completion-doc-name');
        const docPreviewContainer = document.getElementById('completion-doc-preview-container');
        if (docNameSpan) docNameSpan.textContent = file.name;
        if (docPreviewContainer) docPreviewContainer.classList.remove('hidden');
        if (elBtnClearCompletionDoc) elBtnClearCompletionDoc.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });
}

if (elBtnClearCompletionDoc) {
  elBtnClearCompletionDoc.addEventListener('click', () => {
    currentCompletionDocData = null;
    const docPreviewContainer = document.getElementById('completion-doc-preview-container');
    const docNameSpan = document.getElementById('completion-doc-name');
    if (docPreviewContainer) docPreviewContainer.classList.add('hidden');
    if (docNameSpan) docNameSpan.textContent = '';
    if (elCompletionDocFile) elCompletionDocFile.value = '';
    elBtnClearCompletionDoc.classList.add('hidden');
  });
}

// Enable F5 and Ctrl+R to dynamically refresh the app renderer
window.addEventListener('keydown', (e) => {
  if (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R'))) {
    e.preventDefault();
    window.location.reload();
  }
});

if (elBtnCloseImageViewer && elImageViewerModal) {
  elBtnCloseImageViewer.addEventListener('click', () => {
    elImageViewerModal.classList.add('hidden');
  });
  elImageViewerModal.addEventListener('click', (e) => {
    if (e.target === elImageViewerModal) {
      elImageViewerModal.classList.add('hidden');
    }
  });
}

const elCompletionNoteInput = document.getElementById('completion-note-input');
if (elCompletionNoteInput) {
  elCompletionNoteInput.addEventListener('paste', (e) => {
    const items = (e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData))?.items;
    if (items) {
      for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (evt) => {
            currentCompletionImageData = evt.target.result;
            const previewImg = document.getElementById('completion-image-preview');
            const previewContainer = document.getElementById('completion-image-preview-container');
            if (previewImg) previewImg.src = currentCompletionImageData;
            if (previewContainer) previewContainer.classList.remove('hidden');
            if (elBtnClearCompletionImage) elBtnClearCompletionImage.classList.remove('hidden');
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  });
}

// --- Big Window Task Details & Proof Viewer Modal ---
function openTaskDetailsModal(taskId) {
  const task = appState.tasks.find(t => t.id === taskId);
  if (!task) return;

  const modal = document.getElementById('task-details-modal');
  const titleEl = document.getElementById('task-details-modal-title');
  const bodyEl = document.getElementById('task-details-modal-body');
  const btnEdit = document.getElementById('btn-modal-edit-reflection');

  if (titleEl) titleEl.textContent = task.name;

  if (btnEdit) {
    btnEdit.onclick = () => {
      if (modal) modal.classList.add('hidden');
      openCompletionModal(task.id);
    };
  }

  let bodyHtml = '';

  let statusBadge = task.completed ? '<span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.4);">✓ COMPLETED</span>' : '<span style="background: rgba(234, 179, 8, 0.2); color: #facc15; padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(234, 179, 8, 0.4);">⏳ IN PROGRESS</span>';
  let wsLabel = (task.workspace || 'GENERAL').toUpperCase();

  bodyHtml += `
    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
      <div style="display: flex; align-items: center; gap: 8px;">
        ${statusBadge}
        <span style="background: rgba(168, 85, 247, 0.15); color: #c084fc; padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 600; border: 1px solid rgba(168, 85, 247, 0.3);">${wsLabel}</span>
      </div>
      ${task.completedAt ? `<div style="font-size: 0.78rem; color: var(--text-muted);">Completed: ${new Date(task.completedAt).toLocaleString()}</div>` : ''}
    </div>
  `;

  if (task.completionNote) {
    bodyHtml += `
      <div style="background: rgba(168, 85, 247, 0.08); padding: 14px 16px; border-left: 4px solid var(--theme-color); border-radius: 10px;">
        <div style="font-size: 0.85rem; font-weight: 700; color: #fff; margin-bottom: 6px;">💡 Reflection & Learning Notes:</div>
        <div style="font-size: 0.92rem; color: #e2e8f0; font-style: italic; line-height: 1.5;">"${task.completionNote}"</div>
      </div>
    `;
  }

  if (task.completionImage) {
    bodyHtml += `
      <div style="background: rgba(0,0,0,0.4); padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12);">
        <div style="font-size: 0.85rem; font-weight: 700; color: #fff; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
          <span>🖼️ Screenshot Proof:</span>
          <span style="font-size: 0.75rem; color: var(--color-cyan); font-weight: 600;">🔍 Click image to enlarge full screen</span>
        </div>
        <img src="${task.completionImage}" onclick="openImageViewer('${task.completionImage}')" title="Click to view full screen" style="max-height: 240px; width: auto; max-width: 100%; object-fit: contain; border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.2); cursor: pointer; background: #000; display: block; margin: 0 auto; transition: transform 0.2s ease, border-color 0.2s ease;" onmouseover="this.style.transform='scale(1.02)'; this.style.borderColor='var(--color-cyan)';" onmouseout="this.style.transform='scale(1)'; this.style.borderColor='rgba(255,255,255,0.2)';">
      </div>
    `;
  }

  if (task.completionVideo) {
    bodyHtml += `
      <div style="background: rgba(0,0,0,0.4); padding: 14px; border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.3);">
        <div style="font-size: 0.85rem; font-weight: 700; color: #60a5fa; margin-bottom: 10px;">🎥 Video Recording Proof:</div>
        <video controls src="${task.completionVideo}" style="width: 100%; max-height: 360px; border-radius: 10px; background: #000; border: 1px solid rgba(59, 130, 246, 0.4);"></video>
      </div>
    `;
  }

  if (task.completionDocument && task.completionDocument.data) {
    bodyHtml += `
      <div style="background: rgba(16, 185, 129, 0.08); padding: 14px 16px; border-radius: 10px; border: 1px solid rgba(16, 185, 129, 0.3); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.5rem;">📄</span>
          <div>
            <div style="font-size: 0.85rem; font-weight: 700; color: #10b981;">Attached Document / File</div>
            <div style="font-size: 0.8rem; color: #e2e8f0; margin-top: 2px;">${task.completionDocument.name || 'Document File'}</div>
          </div>
        </div>
        <a href="${task.completionDocument.data}" download="${task.completionDocument.name || 'attachment'}" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(16, 185, 129, 0.25); border: 1px solid rgba(16, 185, 129, 0.5); border-radius: 8px; color: #34d399; font-size: 0.85rem; text-decoration: none; font-weight: 700;">⬇️ Download File</a>
      </div>
    `;
  }

  if (task.notes) {
    bodyHtml += `
      <div style="background: rgba(255,255,255,0.03); padding: 14px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
        <div style="font-size: 0.85rem; font-weight: 700; color: #fff; margin-bottom: 6px;">📝 Task Notes & Description:</div>
        <div style="font-size: 0.88rem; color: #cbd5e1; line-height: 1.5;">${task.notes}</div>
      </div>
    `;
  }

  if (task.subtasks && task.subtasks.length > 0) {
    const completedSub = task.subtasks.filter(s => s.completed).length;
    const subItems = task.subtasks.map(st => `
      <div style="padding: 6px 10px; background: rgba(255,255,255,0.03); border-radius: 6px; font-size: 0.85rem; color: ${st.completed ? '#94a3b8' : '#fff'}; text-decoration: ${st.completed ? 'line-through' : 'none'}; display: flex; align-items: center; gap: 8px;">
        <span style="color: ${st.completed ? '#10b981' : '#64748b'}; font-weight: 700;">${st.completed ? '✓' : '○'}</span>
        ${st.name}
      </div>
    `).join('');
    bodyHtml += `
      <div style="background: rgba(0,0,0,0.3); padding: 14px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
        <div style="font-size: 0.85rem; font-weight: 700; color: #fff; margin-bottom: 8px;">📋 Subtasks Checklist (${completedSub}/${task.subtasks.length}):</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">${subItems}</div>
      </div>
    `;
  }

  const taskLogs = (appState.activityLog || []).filter(l => l.message && l.message.toLowerCase().includes(task.name.toLowerCase()));
  if (taskLogs.length > 0) {
    const logItems = taskLogs.map(l => `
      <div style="padding: 6px 10px; border-left: 3px solid var(--theme-color); background: rgba(255,255,255,0.02); border-radius: 0 6px 6px 0; font-size: 0.82rem;">
        <div style="color: var(--text-muted); font-size: 0.75rem; font-weight: 600;">${l.date} ${l.time ? 'at ' + l.time : ''}</div>
        <div style="color: #e2e8f0; margin-top: 2px;">${l.message}</div>
      </div>
    `).join('');
    bodyHtml += `
      <div style="background: rgba(0,0,0,0.3); padding: 14px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
        <div style="font-size: 0.85rem; font-weight: 700; color: #fff; margin-bottom: 8px;">⏱️ Activity Log History:</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">${logItems}</div>
      </div>
    `;
  }

  if (bodyEl) bodyEl.innerHTML = bodyHtml;

  if (modal) {
    modal.classList.remove('hidden');
  }
}
window.openTaskDetailsModal = openTaskDetailsModal;
