import os

html_day_select = """          <div class="detail-group">
            <label for="detail-task-day">Plan Weekday</label>
            <select id="detail-task-day" class="detail-select">
              <option value="">Unscheduled (Backlog)</option>
              <option value="mon">Monday</option>
              <option value="tue">Tuesday</option>
              <option value="wed">Wednesday</option>
              <option value="thu">Thursday</option>
              <option value="fri">Friday</option>
              <option value="sat">Saturday</option>
              <option value="sun">Sunday</option>
            </select>
          </div>"""

html_day_checkboxes = """          <div class="detail-group">
            <label>Plan Weekday</label>
            <div id="detail-task-days-group" class="day-toggle-group">
              <input type="checkbox" id="day-mon" value="mon" class="day-toggle-input">
              <label for="day-mon" class="day-toggle-label">Mon</label>

              <input type="checkbox" id="day-tue" value="tue" class="day-toggle-input">
              <label for="day-tue" class="day-toggle-label">Tue</label>

              <input type="checkbox" id="day-wed" value="wed" class="day-toggle-input">
              <label for="day-wed" class="day-toggle-label">Wed</label>

              <input type="checkbox" id="day-thu" value="thu" class="day-toggle-input">
              <label for="day-thu" class="day-toggle-label">Thu</label>

              <input type="checkbox" id="day-fri" value="fri" class="day-toggle-input">
              <label for="day-fri" class="day-toggle-label">Fri</label>

              <input type="checkbox" id="day-sat" value="sat" class="day-toggle-input">
              <label for="day-sat" class="day-toggle-label">Sat</label>

              <input type="checkbox" id="day-sun" value="sun" class="day-toggle-input">
              <label for="day-sun" class="day-toggle-label">Sun</label>
            </div>
          </div>"""

html_daily_goal = """          <div class="settings-group">
            <label for="setting-daily-goal">Daily Focus Goal</label>
            <div class="duration-input-group margin-top-xs">
              <input type="number" id="setting-daily-goal-hours" value="8" min="1" max="24">
              <span>Hours</span>
            </div>
            <p class="settings-desc">Define your cumulative target focus hours per day.</p>
          </div>"""

js_daily_goal_1 = "const elSettingDailyGoalHours = document.getElementById('setting-daily-goal-hours');"
js_daily_goal_2 = "elSettingDailyGoalHours.value = appState.settings.dailyGoalHours;"
js_daily_goal_3 = "const newDailyGoal = parseInt(elSettingDailyGoalHours.value) || 8;"
js_daily_goal_4 = "appState.settings.dailyGoalHours = newDailyGoal;"

js_app_select = "const elDetailTaskDay = document.getElementById('detail-task-day');"

js_app_save_old = """  editingTask.title = newTitle;
  editingTask.category = newCategory;
  editingTask.desc = newDesc;
  editingTask.durationSecs = (newHours * 3600) + (newMins * 60);
  editingTask.plannerDay = newDay;"""

js_app_save_new = """  editingTask.title = newTitle;
  editingTask.category = newCategory;
  editingTask.desc = newDesc;
  editingTask.durationSecs = (newHours * 3600) + (newMins * 60);
  
  const dayInputs = document.querySelectorAll('.day-toggle-input');
  const selectedDays = [];
  dayInputs.forEach(input => {
    if (input.checked) selectedDays.push(input.value);
  });
  editingTask.plannerDays = selectedDays;
  
  if (selectedDays.length === 1) {
    editingTask.plannerDay = selectedDays[0];
  } else if (selectedDays.length === 0) {
    editingTask.plannerDay = '';
  } else {
    editingTask.plannerDay = 'multi';
  }"""

js_app_open_old = """  elDetailTaskDay.value = task.plannerDay || '';"""
js_app_open_new = """  const dayInputs = document.querySelectorAll('.day-toggle-input');
  dayInputs.forEach(input => input.checked = false);
  if (task.plannerDays && task.plannerDays.length > 0) {
    task.plannerDays.forEach(day => {
      const el = document.getElementById(`day-${day}`);
      if (el) el.checked = true;
    });
  } else if (task.plannerDay && task.plannerDay !== 'multi') {
    const el = document.getElementById(`day-${task.plannerDay}`);
    if (el) el.checked = true;
  }"""

js_app_isTaskActive_old = """function isTaskActiveOnDate(task, dateStr) {
  if (task.isCompleted) return false;
  if (!task.plannerDay) return false;
  
  const targetDate = new Date(dateStr);
  const weekdays = ['sun','mon','tue','wed','thu','fri','sat'];
  const targetWeekday = weekdays[targetDate.getDay()];
  
  return task.plannerDay === targetWeekday;
}"""

js_app_isTaskActive_new = """function taskMatchesDay(task, targetWeekday) {
  if (task.plannerDays && task.plannerDays.length > 0) {
    return task.plannerDays.includes(targetWeekday);
  }
  return task.plannerDay === targetWeekday;
}

function isTaskActiveOnDate(task, dateStr) {
  if (task.isCompleted) return false;
  if (!task.plannerDay && (!task.plannerDays || task.plannerDays.length === 0)) return false;
  
  const targetDate = new Date(dateStr);
  const weekdays = ['sun','mon','tue','wed','thu','fri','sat'];
  const targetWeekday = weekdays[targetDate.getDay()];
  
  return taskMatchesDay(task, targetWeekday);
}"""

js_app_matches_old = """        const matchesDay = (t.plannerDay === currentWeekday);"""
js_app_matches_new = """        const matchesDay = taskMatchesDay(t, currentWeekday);"""


css_append = """

/* Better visibility for navigation buttons */
#btn-activity-prev, #btn-activity-next {
  background: rgba(255,255,255,0.15) !important;
  color: #fff !important;
  border: 1px solid rgba(255,255,255,0.2) !important;
  opacity: 1 !important;
}
#btn-activity-prev:hover, #btn-activity-next:hover {
  background: rgba(255,255,255,0.25) !important;
}
#btn-activity-next[disabled] {
  opacity: 0.3 !important;
  background: rgba(255,255,255,0.05) !important;
}

.month-nav-btn {
  background: rgba(255,255,255,0.15) !important;
  color: #fff !important;
  border: 1px solid rgba(255,255,255,0.2) !important;
  border-radius: 6px;
  opacity: 1 !important;
}
.month-nav-btn:hover {
  background: rgba(255,255,255,0.25) !important;
}

/* Day Toggle Group */
.day-toggle-group {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.day-toggle-input {
  display: none;
}
.day-toggle-label {
  padding: 6px 12px;
  border-radius: 14px;
  background: var(--surface-light);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid rgba(255,255,255,0.1);
}
.day-toggle-label:hover {
  background: rgba(255,255,255,0.1);
  color: var(--text-main);
}
.day-toggle-input:checked + .day-toggle-label {
  background: var(--accent-main);
  color: #fff;
  border-color: var(--accent-hover);
  box-shadow: 0 0 10px rgba(var(--accent-main-rgb), 0.3);
}
"""


def patch_file(path, replacements, append=""):
    if not os.path.exists(path):
        print(f"Path not found: {path}")
        return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            print(f"Patched string in {path}")
        else:
            print(f"WARN: Could not find exact string in {path}")
            
    if append and append not in content:
        content += append
        print(f"Appended to {path}")
            
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


paths = [
    r'E:\New project AI\FocusMode-v3\src',
    r'E:\New project AI\FocusMode-v3\dist2\FocusMode-win32-x64\resources\app\src'
]

for base in paths:
    print(f"\\nPatching in {base}")
    index_path = os.path.join(base, 'index.html')
    app_path = os.path.join(base, 'app.js')
    css_path = os.path.join(base, 'styles.css')
    
    patch_file(index_path, [
        (html_day_select, html_day_checkboxes),
        (html_daily_goal, '')
    ])
    
    patch_file(app_path, [
        (js_daily_goal_1, ''),
        (js_daily_goal_2, ''),
        (js_daily_goal_3, 'const newDailyGoal = appState.settings.dailyGoalHours || 8;'),
        (js_daily_goal_4, 'appState.settings.dailyGoalHours = newDailyGoal;'),
        (js_app_select, ''),
        (js_app_save_old, js_app_save_new),
        (js_app_open_old, js_app_open_new),
        (js_app_isTaskActive_old, js_app_isTaskActive_new),
        (js_app_matches_old, js_app_matches_new)
    ])
    
    patch_file(css_path, [], append=css_append)

print("Done patching.")
