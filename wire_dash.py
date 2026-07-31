import sys

html_path = r"E:\New project AI\FocusMode-v3\src\index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

html_content = html_content.replace('<script src="app.js"></script>', '<script src="dashboard.js"></script>\n  <script src="app.js"></script>')

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

js_path = r"E:\New project AI\FocusMode-v3\src\app.js"
with open(js_path, "r", encoding="utf-8") as f:
    js_content = f.read()

nav_logic = """  const elBtnViewDashboard = document.getElementById('btn-view-dashboard');
  const elDashboardSection = document.getElementById('dashboard-section');
  
  elBtnViewDashboard.addEventListener('click', () => {
    if (typeof playChime === 'function') playChime('click');
    activeView = 'dashboard';
    elBtnViewDashboard.classList.add('active');
    elBtnViewTasks.classList.remove('active');
    elBtnViewPlanner.classList.remove('active');
    
    elTasksViewContent.classList.add('hidden');
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
    
    renderTasks();
  });
"""

js_content = js_content.replace("  elBtnViewTasks.addEventListener('click', () => {\n    playChime('click');\n    activeView = 'tasks';\n    elBtnViewTasks.classList.add('active');\n    elBtnViewPlanner.classList.remove('active');\n    renderTasks();\n  });", nav_logic)

# Also ensure planner hides dashboard
js_content = js_content.replace("    elBtnViewTasks.classList.remove('active');\n    const btnHabits", "    elBtnViewTasks.classList.remove('active');\n    if (elBtnViewDashboard) elBtnViewDashboard.classList.remove('active');\n    const btnHabits")


with open(js_path, "w", encoding="utf-8") as f:
    f.write(js_content)

print("Success: Wired up dashboard navigation.")
