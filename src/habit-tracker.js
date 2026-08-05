// Monthly Habit Tracker Logic
let currentHabitMonth = new Date().getMonth();
let currentHabitYear = new Date().getFullYear();
const neonThemes = ['blue', 'green', 'pink', 'orange', 'purple'];
let currentThemeIndex = 0;

function applyNeonTheme(index) {
  currentThemeIndex = index % neonThemes.length;
  const theme = neonThemes[currentThemeIndex];
  const overlay = document.getElementById('habit-overlay');
  if (overlay) overlay.setAttribute('data-neon-theme', theme);
}

function rotateTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % neonThemes.length;
  applyNeonTheme(currentThemeIndex);
  if (appState.settings) {
    appState.settings.habitThemeIndex = currentThemeIndex;
    if (typeof saveAppState === 'function') saveAppState();
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
  if (!headerRow || !trackerBody) return;
  
  headerRow.innerHTML = '<th class="habit-header">HABITS</th>';
  for (let day = 1; day <= daysInMonth; day++) {
    const today = new Date();
    const isToday = (day === today.getDate() && currentHabitMonth === today.getMonth() && currentHabitYear === today.getFullYear());
    headerRow.innerHTML += `<th class="day-header ${isToday ? "today-highlight" : ""}">${day}</th>`;
  }
  headerRow.innerHTML += '<th class="total-header">Total</th>';
  
  trackerBody.innerHTML = '';
  
  appState.habits.forEach((habit, habitIndex) => {
    if (!habit.type) habit.type = 'tick';
    
    const row = document.createElement('tr');
    row.className = 'habit-row';
    const typeBadge = habit.type === 'time' ? '⏱' : habit.type === 'count' ? '#' : '✓';
    const maxCountText = habit.type === 'count' && habit.maxCount ? `/${habit.maxCount}` : '';
    let maxTimeText = '';
    
    if (habit.type === 'time' && habit.maxTime) {
      const hours = Math.floor(habit.maxTime / 60);
      const mins = habit.maxTime % 60;
      if (habit.maxTime >= 60) {
        maxTimeText = mins > 0 ? `/${hours}h ${mins}m` : `/${hours}h`;
      } else {
        maxTimeText = `/${mins}m`;
      }
    }
    
    row.innerHTML = `<td class="habit-name">
        <span class="move-btn" draggable="true" title="Drag to reorder">::</span>
        ${habit.name} <span class="habit-type-badge">${typeBadge}${maxCountText}${maxTimeText}</span>
        <span class="delete-btn-grid" onclick="deleteGridHabit('${habit.id}', ${habitIndex})" title="Delete habit">x</span>
    </td>`;
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
          dataAttr = `data-count="${cellData}"`;
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
          dataAttr = `data-count="${displayTime}"`;
        } else if (cellData === true) {
          cellClass = 'checked';
        }
      }
      
      row.innerHTML += `<td class="day-cell ${cellClass} ${isToday ? "today-highlight" : ""}" ${dataAttr} onclick="toggleGridDay('${habit.id}', ${day}, event)"></td>`;
    }
    
    row.innerHTML += `<td class="total-cell" id="total-${habit.id}">0</td>`;
    trackerBody.appendChild(row);
  });
}

function toggleGridDay(habitId, day, event) {
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  
  if (currentHabitYear === todayYear && currentHabitMonth === todayMonth) {
    if (day !== todayDate && day !== todayDate - 1) {
      if (!confirm(`Editing day ${day}. Continue anyway?`)) {
        return;
      }
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
    
    const hours = prompt('Enter hours (0-24):', currentHours);
    if (hours === null) return;
    
    const minutes = prompt('Enter minutes (0-59):', currentMins);
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
    }
  } else if (habit.type === 'count') {
    const currentCount = appState.habitData[key] || 0;
    const count = prompt(`Enter count:`, currentCount);
    if (count === null) return;
    
    const countNum = parseInt(count) || 0;
    if (countNum > 0) {
      appState.habitData[key] = countNum;
    } else {
      delete appState.habitData[key];
    }
  } else {
    if (appState.habitData[key]) {
      delete appState.habitData[key];
    } else {
      appState.habitData[key] = true;
    }
  }
  
  if (typeof playChime === 'function') playChime('click');
  saveAppState();
  generateHabitTracker();
}

function deleteGridHabit(habitId, index) {
  if (confirm('Delete habit?')) {
    appState.habits = appState.habits.filter(h => h.id !== habitId);
    if (typeof renderHabits === 'function') renderHabits();
    saveAppState();
    generateHabitTracker();
  }
}
