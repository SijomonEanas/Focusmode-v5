import sys

html_path = r"E:\New project AI\FocusMode-v3\src\index.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """          </div>
        </section>
  
        <!-- Dashboard View Section -->
        <section id="dashboard-section" class="executive-dashboard-view hidden">"""

replacement = """          </div>
  
        <!-- Dashboard View Section -->
        <section id="dashboard-section" class="executive-dashboard-view hidden">"""

content = content.replace(target, replacement)

target2 = """            </div>
          </div>
        </section>
  
      </div>"""

replacement2 = """            </div>
          </div>
        </section>
        </section>
  
      </div>"""

content = content.replace(target2, replacement2)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Moved dashboard-section inside tasks-section")
