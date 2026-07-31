import sys

html_path = r"E:\New project AI\FocusMode-v3\src\index.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the extra div if it exists
target = """            </div>
          </div>
          </div>
          <div id="ai-review-content" class="settings-desc\""""
replacement = """            </div>
          </div>
          <div id="ai-review-content" class="settings-desc\""""
content = content.replace(target, replacement)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed HTML formatting.")
