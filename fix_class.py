import sys

css_path = r"E:\New project AI\FocusMode-v3\src\styles.css"
with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("/* --- Executive Dashboard Styles --- */\n.dashboard-section {", "/* --- Executive Dashboard Styles --- */\n.executive-dashboard-view {")
content = content.replace(".dashboard-section::-webkit-scrollbar", ".executive-dashboard-view::-webkit-scrollbar")

with open(css_path, "w", encoding="utf-8") as f:
    f.write(content)

html_path = r"E:\New project AI\FocusMode-v3\src\index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

html_content = html_content.replace('<section id="dashboard-section" class="dashboard-section hidden">', '<section id="dashboard-section" class="executive-dashboard-view hidden">')

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print("Fixed class conflict.")
