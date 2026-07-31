import sys

html_path = r"E:\New project AI\FocusMode-v3\src\index.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove the wrapper divs
content = content.replace('<div class="dashboard-main-row">', '')
content = content.replace('</div>\n          <!-- Secondary Charts Area -->\n          <div class="dashboard-secondary-charts">', '')
content = content.replace('</div>\n        </section>', '</section>')

with open(html_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Removed wrapper divs.")
