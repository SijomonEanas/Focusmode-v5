import sys

html_path = r"E:\New project AI\FocusMode-v3\src\index.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

dashboard_html = """      <div id="dashboard-section" class="executive-dashboard-view hidden">
        <div class="dashboard-header-bar">
          <h2>Executive Performance</h2>
          <div class="dashboard-filters">
            <button class="control-btn" id="btn-refresh-dash">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              Refresh
            </button>
          </div>
        </div>
        
        <div class="kpi-grid">
          <div class="kpi-card"><span class="kpi-title">Total Focus Time</span><span class="kpi-value" id="kpi-focus-time">0h</span><span class="kpi-trend" id="kpi-focus-trend"></span></div>
          <div class="kpi-card"><span class="kpi-title">Avg Daily Tasks</span><span class="kpi-value" id="kpi-avg-tasks">0</span><span class="kpi-trend" id="kpi-tasks-trend"></span></div>
          <div class="kpi-card"><span class="kpi-title">Avg Task Rate</span><span class="kpi-value" id="kpi-completion-rate">0%</span><span class="kpi-trend" id="kpi-rate-trend"></span></div>
          <div class="kpi-card"><span class="kpi-title">Total Distractions</span><span class="kpi-value" id="kpi-distractions">0</span><span class="kpi-trend" id="kpi-distractions-trend"></span></div>
        </div>

        <div class="chart-container main-chart">
          <div class="chart-header"><h3>Focus Time & Completion Trends</h3></div>
          <div class="chart-canvas-wrapper"><canvas id="mainTrendChart"></canvas></div>
        </div>

        <div class="chart-container half-chart pie-chart-area">
          <div class="chart-header"><h3>Workspace Dist</h3></div>
          <div class="chart-canvas-wrapper pie-wrapper"><canvas id="workspacePieChart"></canvas></div>
        </div>

        <div class="chart-container half-chart habit-funnel-area">
          <div class="chart-header"><h3>Habits</h3></div>
          <div class="habit-funnel-list" id="habit-funnel-list"></div>
        </div>
      </div>"""

if 'id="dashboard-section"' not in content:
    target = '</section>\n\n      </div>\n\n      <!-- Calendar Pop-up'
    replacement = dashboard_html + '\n</section>\n\n      </div>\n\n      <!-- Calendar Pop-up'
    content = content.replace(target, replacement)
    
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Restored Executive Dashboard to index.html!")
else:
    print("Dashboard already exists!")
