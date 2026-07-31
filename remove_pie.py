import sys

html_path = r"E:\New project AI\FocusMode-v3\src\index.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """            <div class="chart-container pie-chart-area">
              <div class="chart-header"><h3>Workspace Dist</h3></div>
              <div class="chart-canvas-wrapper pie-wrapper"><canvas id="workspacePieChart"></canvas></div>
            </div>"""

content = content.replace(target, '')

with open(html_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Removed pie chart from index.html")
