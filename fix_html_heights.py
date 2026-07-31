import sys

html_path = r"E:\New project AI\FocusMode-v3\src\index.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Main chart row
target1 = """          <!-- Main Chart Area -->
          <div class="dashboard-main-row" style="display: flex; width: 100%;">
            <div class="chart-container main-chart">
              <div class="chart-header">
                <h3>Focus Time & Completion Trends (Last 30 Days)</h3>
              </div>
              <div class="chart-canvas-wrapper" style="position: relative; height: 300px; width: 100%;">
                <canvas id="mainTrendChart"></canvas>
              </div>
            </div>
          </div>"""

replacement1 = """          <!-- Main Chart Area -->
          <div class="dashboard-main-row">
            <div class="chart-container main-chart">
              <div class="chart-header">
                <h3>Focus Time & Completion Trends (Last 30 Days)</h3>
              </div>
              <div class="chart-canvas-wrapper">
                <canvas id="mainTrendChart"></canvas>
              </div>
            </div>
          </div>"""

content = content.replace(target1, replacement1)

# 2. Secondary charts row
target2 = """          <!-- Secondary Charts Area -->
          <div class="dashboard-secondary-charts" style="display: flex; gap: 20px; width: 100%;">
            <div class="chart-container half-chart">
              <div class="chart-header">
                <h3>Task Distribution by Workspace</h3>
              </div>
              <div class="chart-canvas-wrapper" style="position: relative; height: 250px; width: 100%; display: flex; justify-content: center;">
                <canvas id="workspacePieChart"></canvas>
              </div>
            </div>
            <div class="chart-container half-chart">
              <div class="chart-header">
                <h3>Habit Streaks & Funnel</h3>
              </div>
              <div class="habit-funnel-list" id="habit-funnel-list">"""

replacement2 = """          <!-- Secondary Charts Area -->
          <div class="dashboard-secondary-charts">
            <div class="chart-container half-chart">
              <div class="chart-header">
                <h3>Task Distribution by Workspace</h3>
              </div>
              <div class="chart-canvas-wrapper pie-wrapper">
                <canvas id="workspacePieChart"></canvas>
              </div>
            </div>
            <div class="chart-container half-chart">
              <div class="chart-header">
                <h3>Habit Streaks & Funnel</h3>
              </div>
              <div class="habit-funnel-list" id="habit-funnel-list">"""

content = content.replace(target2, replacement2)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated HTML to remove hardcoded inline heights")
