// Monthly Habit Tracker Logic
// Relies on global appState from app.js

let currentHabitMonth = new Date().getMonth();
let currentHabitYear = new Date().getFullYear();
const neonThemes = ['blue', 'green', 'pink', 'orange', 'purple'];
let currentThemeIndex = 0;

function applyNeonTheme(index) {
  currentThemeIndex = index % neonThemes.length;
  const theme = neonThemes[currentThemeIndex];
  document.getElementById('habit-overlay').setAttribute('data-neon-theme', theme);
}

function rotateTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % neonThemes.length;
  applyNeonTheme(currentThemeIndex);
  if (appState.settings) {
    appState.settings.habitThemeIndex = currentThemeIndex;
    saveAppState();
  }
}

function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

function initializeYearSelector() {
  const yearSelect = document.getElementById('habitYearSelect');
  if (!yearSelect) return;
  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = '';
  for (let year = currentYear - 5; year <= currentYear + 5; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year === currentYear) option.selected = true;
    yearSelect.appendChild(option);
  }
}

function generateHabitTracker() {
  if (!appState.habits) appState.habits = [];
  if (!appState.habitData) appState.habitData = {};

  const monthSelect = document.getElementById('habitMonthSelect');
  const yearSelect = document.getElementById('habitYearSelect');
  if (!monthSelect || !yearSelect) return;

  currentHabitMonth = parseInt(monthSelect.value);
  currentHabitYear = parseInt(yearSelect.value);
  
  const daysInMonth = getDaysInMonth(currentHabitMonth, currentHabitYear);
  const headerRow = document.getElementById('habitHeaderRow');
  const trackerBody = document.getElementById('habitTrackerBody');
  
  headerRow.innerHTML = '<th class="habit-header">HABITS</th>';
  for (let day = 1; day <= daysInMonth; day++) {
    const today = new Date();
    const isToday = (day === today.getDate() && currentHabitMonth === today.getMonth() && currentHabitYear === today.getFullYear());
    headerRow.innerHTML += <th class="day-header ${isToday ? "today-highlight" : ""}">${day}</th>;
  }
  headerRow.innerHTML += '<th class="total-header">Total</th>';
  
  trackerBody.innerHTML = '';
  
  appState.habits.forEach((habit, habitIndex) => {
    // Migrate old habits to new format if needed
    if (!habit.type) habit.type = 'tick';
    
    const row = document.createElement('tr');
    row.className = 'habit-row';
    const typeBadge = habit.type === 'time' ? '??' : habit.type === 'count' ? '#??' : '?';
    const maxCountText = habit.type === 'count' && habit.maxCount ? /${habit.maxCount} : '';
    let maxTimeText = '';
    
    if (habit.type === 'time' && habit.maxTime) {
      const hours = Math.floor(habit.maxTime / 60);
      const mins = habit.maxTime % 60;
      if (habit.maxTime >= 60) {
        maxTimeText = mins > 0 ? /${hours}h ${mins}m : /${hours}h;
      } else {
        maxTimeText = /${mins}m;
      }
    }
    
    row.innerHTML = <td class="habit-name">
        <span class="move-btn" draggable="true" title="Drag to reorder">?</span>
        ${habit.name} <span class="habit-type-badge">${typeBadge}${maxCountText}${maxTimeText}</span>
        <span class="delete-btn-grid" onclick="deleteGridHabit('${habit.id}', ${habitIndex})" title="Delete habit">×</span>
    </td>;
    row.setAttribute('draggable', 'true');
    row.setAttribute('data-habit-id', habit.id);
    row.setAttribute('data-habit-index', habitIndex);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const today = new Date();
      const isToday = (day === today.getDate() && currentHabitMonth === today.getMonth() && currentHabitYear === today.getFullYear());
      
      const key = `${currentHabitYear}-${currentHabitMonth}-${habit.id}-${day}`;
      const cellData = appState.habitData[key];
      let cellClass = '';
      let dataAttr = '';
      
      if (cellData) {
        if (habit.type === 'count' && typeof cellData === 'number') {
          cellClass = 'checked count';
          dataAttr = data-count="${cellData}";
        } else if (habit.type === 'time' && typeof cellData === 'number') {
          cellClass = 'checked count';
          const totalMinutes = cellData;
          const hours = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          let displayTime = '';
          if (totalMinutes >= 60) {
            displayTime = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
          } else {
            displayTime = `${mins}m`;
          }
          dataAttr = data-count="${displayTime}";
        } else if (cellData === true) {
          cellClass = 'checked';
        }
      }
      
      row.innerHTML += <td class="day-cell ${cellClass} ${isToday ? "today-highlight" : ""}" ${dataAttr} onclick="toggleGridDay('${habit.id}', ${day}, event)"></td>;
    }
    
    row.innerHTML += <td class="total-cell" id="total-${habit.id}">0</td>;
    trackerBody.appendChild(row);
  });
  
  setupGridDragAndDrop();
  updateGridTotals();
  updateGridStats();
}

function toggleGridDay(habitId, day, event) {
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  
  if (currentHabitYear === todayYear && currentHabitMonth === todayMonth) {
    if (day !== todayDate && day !== todayDate - 1) {
      if (!confirm(?? You're trying to edit day ${day}. Only today (${todayDate}) and yesterday (${todayDate - 1}) can be edited freely. Continue anyway?)) {
        return;
      }
    }
  } else {
    if (!confirm(?? You're editing a past month. Continue?)) {
      return;
    }
  }
  
  const key = `${currentHabitYear}-${currentHabitMonth}-${habitId}-${day}`;
  const habit = appState.habits.find(h => h.id === habitId);
  if (!habit) return;
  
  if (!appState.habitData) appState.habitData = {};

  if (habit.type === 'time') {
    const currentMinutes = appState.habitData[key] || 0;
    const currentHours = Math.floor(currentMinutes / 60);
    const currentMins = currentMinutes % 60;
    
    const hours = prompt(Enter hours (0-24):, currentHours);
    if (hours === null) return;
    
    const minutes = prompt(Enter minutes (0-59):, currentMins);
    if (minutes === null) return;
    
    const hoursNum = parseInt(hours) || 0;
    const minutesNum = parseInt(minutes) || 0;
    
    if (hoursNum >= 0 && hoursNum <= 24 && minutesNum >= 0 && minutesNum <= 59) {
      const totalMinutes = (hoursNum * 60) + minutesNum;
      if (totalMinutes > 0) {
        appState.habitData[key] = totalMinutes;
      } else {
        delete appState.habitData[key];
      }
      saveAppState();
      generateHabitTracker();
    } else {
      alert('Invalid time input! Hours: 0-24, Minutes: 0-59');
    }
    return;
  } else if (habit.type === 'count') {
    if (event && event.ctrlKey) {
      if (appState.habitData[key] && typeof appState.habitData[key] === 'number' && appState.habitData[key] > 0) {
        appState.habitData[key]--;
        if (appState.habitData[key] <= 0) delete appState.habitData[key];
      }
    } else {
      if (!appState.habitData[key]) {
        appState.habitData[key] = 1;
      } else if (typeof appState.habitData[key] === 'number') {
        appState.habitData[key]++;
      } else {
        appState.habitData[key] = 1;
      }
    }
  } else {
    appState.habitData[key] = !appState.habitData[key];
    // Sync with sidebar if it's today
    if (day === todayDate && currentHabitMonth === todayMonth && currentHabitYear === todayYear) {
      habit.completed = appState.habitData[key];
      if (typeof renderHabits === 'function') renderHabits();
    }
  }
  
  saveAppState();
  generateHabitTracker();
}

function updateGridTotals() {
  appState.habits.forEach((habit) => {
    let count = 0;
    const daysInMonth = getDaysInMonth(currentHabitMonth, currentHabitYear);
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${currentHabitYear}-${currentHabitMonth}-${habit.id}-${day}`;
      const value = appState.habitData[key];
      if (value) {
        if (habit.type === 'time' && typeof value === 'number') {
          if (habit.maxTime) {
            count += value / habit.maxTime;
          } else {
            count += value / 1440;
          }
        } else if (habit.type === 'count' && typeof value === 'number') {
          if (habit.maxCount) {
            count += value / habit.maxCount;
          } else {
            count += value;
          }
        } else if (value === true) {
          count++;
        }
      }
    }
    const totalCell = document.getElementById(	otal-${habit.id});
    if (totalCell) {
      if (habit.type === 'time' || habit.type === 'count') {
        totalCell.textContent = count.toFixed(1);
      } else {
        totalCell.textContent = count;
      }
    }
  });
}

function updateGridStats() {
  let totalCompletions = 0;
  const daysInMonth = getDaysInMonth(currentHabitMonth, currentHabitYear);
  const totalPossible = appState.habits.length * daysInMonth;
  const habitScores = {};

  appState.habits.forEach((habit) => {
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${currentHabitYear}-${currentHabitMonth}-${habit.id}-${day}`;
      const value = appState.habitData[key];
      if (value) {
        if (habit.type === 'time' && typeof value === 'number') {
          if (habit.maxTime) {
            count += value / habit.maxTime;
          } else {
            count += value / 1440;
          }
        } else if (habit.type === 'count' && typeof value === 'number') {
          if (habit.maxCount) {
            count += value / habit.maxCount;
          } else {
            count += value;
          }
        } else if (value === true) {
          count++;
        }
      }
    }
    totalCompletions += count;
    habitScores[habit.name] = count;
  });

  const elTotal = document.getElementById('totalCompletions');
  if (elTotal) elTotal.textContent = Math.round(totalCompletions * 10) / 10;
  
  const rate = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0;
  const elRate = document.getElementById('completionRate');
  if (elRate) elRate.textContent = rate + '%';

  const bestHabitEntry = Object.entries(habitScores).sort((a, b) => b[1] - a[1])[0];
  const bestHabitText = bestHabitEntry && bestHabitEntry[1] > 0 ? bestHabitEntry[0].split('/')[0] : '-';
  const elBest = document.getElementById('bestHabit');
  if (elBest) elBest.textContent = bestHabitText;
}

function deleteGridHabit(habitId, index) {
  if (confirm('Are you sure you want to delete this habit permanently?')) {
    appState.habits = appState.habits.filter(h => h.id !== habitId);
    if (typeof renderHabits === 'function') renderHabits();
    saveAppState();
    generateHabitTracker();
  }
}

// Drag and drop setup
let draggedHabitGridIndex = null;
function setupGridDragAndDrop() {
  const rows = document.querySelectorAll('.habit-row');
  rows.forEach(row => {
    row.addEventListener('dragstart', (e) => {
      draggedHabitGridIndex = parseInt(row.getAttribute('data-habit-index'));
      row.style.opacity = '0.5';
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', (e) => {
      row.style.opacity = '1';
      document.querySelectorAll('.habit-row').forEach(r => r.style.borderTop = '');
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedHabitGridIndex !== parseInt(row.getAttribute('data-habit-index'))) {
        row.style.borderTop = '3px solid var(--color-primary)';
      }
    });
    row.addEventListener('dragleave', (e) => {
      row.style.borderTop = '';
    });
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.style.borderTop = '';
      const dropIndex = parseInt(row.getAttribute('data-habit-index'));
      
      if (draggedHabitGridIndex !== null && draggedHabitGridIndex !== dropIndex) {
        const draggedHabit = appState.habits.splice(draggedHabitGridIndex, 1)[0];
        appState.habits.splice(dropIndex, 0, draggedHabit);
        saveAppState();
        generateHabitTracker();
        if (typeof renderHabits === 'function') renderHabits();
      }
    });
  });
}

// UI Event Bindings
function toggleMaxInputs() {
  const typeSelect = document.getElementById('habitTypeSelect');
  const maxCountInput = document.getElementById('maxCountInput');
  const timeInputContainer = document.getElementById('timeInputContainer');
  if (!typeSelect) return;
  
  if (typeSelect.value === 'count') {
    maxCountInput.style.display = 'inline-block';
    timeInputContainer.style.display = 'none';
  } else if (typeSelect.value === 'time') {
    maxCountInput.style.display = 'none';
    timeInputContainer.style.display = 'flex';
  } else {
    maxCountInput.style.display = 'none';
    timeInputContainer.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btnViewHabits = document.getElementById('btn-view-habits');
  const overlay = document.getElementById('habit-overlay');
  const btnClose = document.getElementById('btn-close-habits');
  
  if (btnViewHabits && overlay) {
    btnViewHabits.addEventListener('click', () => {
      playChime('click');
      initializeYearSelector();
      if (appState.settings && appState.settings.habitThemeIndex !== undefined) {
        currentThemeIndex = appState.settings.habitThemeIndex;
      }
      applyNeonTheme(currentThemeIndex);
      
      document.getElementById('habitMonthSelect').value = new Date().getMonth();
      document.getElementById('habitYearSelect').value = new Date().getFullYear();
      
      generateHabitTracker();
      overlay.classList.remove('hidden');
    });
  }
  
  if (btnClose && overlay) {
    btnClose.addEventListener('click', () => {
      playChime('click');
      overlay.classList.add('hidden');
    });
  }
  
  const btnAdd = document.getElementById('btn-add-grid-habit');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      const input = document.getElementById('newHabitInput');
      const typeSelect = document.getElementById('habitTypeSelect');
      const maxCountInput = document.getElementById('maxCountInput');
      const maxTimeHours = document.getElementById('maxTimeHours');
      const maxTimeMinutes = document.getElementById('maxTimeMinutes');
      
      const habitName = input.value.trim();
      const habitType = typeSelect.value;
      
      if (habitName) {
        const newHabit = {
          id: Date.now().toString(),
          name: habitName,
          type: habitType,
          completed: false,
          streak: 0
        };
        if (habitType === 'count') {
          newHabit.maxCount = parseInt(maxCountInput.value) || 10;
        } else if (habitType === 'time') {
          const hours = parseInt(maxTimeHours.value) || 0;
          const minutes = parseInt(maxTimeMinutes.value) || 0;
          newHabit.maxTime = (hours * 60) + minutes;
        }
        appState.habits.push(newHabit);
        
        input.value = '';
        maxCountInput.value = '10';
        maxTimeHours.value = '1';
        maxTimeMinutes.value = '0';
        
        saveAppState();
        generateHabitTracker();
        if (typeof renderHabits === 'function') renderHabits();
      }
    });
  }
  
  const monthSelect = document.getElementById('habitMonthSelect');
  const yearSelect = document.getElementById('habitYearSelect');
  if (monthSelect) monthSelect.addEventListener('change', generateHabitTracker);
  if (yearSelect) yearSelect.addEventListener('change', generateHabitTracker);
  
  const btnTheme = document.getElementById('btn-rotate-theme');
  if (btnTheme) btnTheme.addEventListener('click', rotateTheme);
  
  // Auto-rotate theme every 60s while modal is open
  setInterval(() => {
    if (overlay && !overlay.classList.contains('hidden')) {
      rotateTheme();
    }
  }, 60000);
});
