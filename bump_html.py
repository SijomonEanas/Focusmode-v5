import sys
import re

html_path = r"E:\New project AI\FocusMode-v3\src\index.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update version badge in title bar
content = re.sub(r'>v3\.0</span>', '>v3.1</span>', content)
content = re.sub(r'>v2\.5</span>', '>v3.1</span>', content)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated version badge in index.html.")
