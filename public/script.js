class SprintCopilot {
  constructor() {
    this.apiKey = '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'; // Default API key
    this.init();
  }

  init() {
    document.getElementById("analyzeBtn").addEventListener("click", () => this.analyzeStory());
    document.getElementById("exportBtn").addEventListener("click", () => this.exportToExcel());
    // this.promptForApiKey();
    this.setDefaultDate();
    this.loadHistoryList();
  }

  setDefaultDate() {
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + (1 + 7 - today.getDay()) % 7);
    document.getElementById('sprintStartDate').value = nextMonday.toISOString().split('T')[0];
  }

  promptForApiKey() {
    const savedKey = localStorage.getItem("openrouter_api_key");
    if (!savedKey) {
      const key = prompt("Enter your OpenRouter API key:");
      if (key) {
        localStorage.setItem("openrouter_api_key", key);
        this.apiKey = key;
      }
    } else {
      this.apiKey = savedKey;
    }
  }

  async analyzeStory() {
    const storyText = document.getElementById("storyInput").value.trim();
    if (!storyText) {
      alert("Please enter a story to analyze");
      return;
    }

    if (!this.apiKey) {
      this.promptForApiKey();
      if (!this.apiKey) return;
    }

    this.showLoading();

    try {
      const analysis = await this.callOpenRouter(storyText);
      this.saveAnalysis(storyText, analysis);
      this.displayResults(analysis);
      this.loadHistoryList();
      document.getElementById('exportBtn').style.display = 'inline-block';
    } catch (error) {
      console.error("Analysis failed:", error);
      document.getElementById("results").innerHTML = `
        <div class="card">
          <h3>❌ Error</h3>
          <p>Analysis failed: ${error.message}</p>
          <p>Please check your API key and try again.</p>
        </div>
      `;
      document.getElementById("results").style.display = "block";
    }
  }

  async callOpenRouter(storyText) {
    const teamSize = document.getElementById('teamSize').value;
    const projectType = document.getElementById('projectType').value;
    
    const prompt = `Analyze this user story for a ${projectType} project with ${teamSize} team members:

"${storyText}"

Provide comprehensive analysis in this JSON format:
{
    "missingDetails": ["detail1", "detail2"],
    "acceptanceCriteria": ["criteria1", "criteria2"],
    "apiContracts": ["endpoint1: description", "endpoint2: description"],
    "databaseSchema": ["table1: fields", "table2: fields"],
    "risksAndDependencies": ["risk1", "dependency1"],
    "subStories": {
        "frontend": ["Frontend story 1", "Frontend story 2"],
        "backend": ["Backend story 1", "Backend story 2"],
        "database": ["Database story 1"],
        "devops": ["DevOps story 1"]
    },
    "subTasks": {
        "frontend": ["Frontend task 1", "Frontend task 2"],
        "backend": ["Backend task 1", "Backend task 2"],
        "database": ["Database task 1"],
        "testing": ["Testing task 1"],
        "devops": ["DevOps task 1"]
    },
    "testingStrategy": {
        "unit": ["Unit test 1", "Unit test 2"],
        "integration": ["Integration test 1"],
        "e2e": ["E2E test 1"]
    },
    "techStack": {
        "frontend": ["Angular", "Bootstrap 5"],
        "backend": ["Java", "Spring Boot"],
        "database": ["Oracle"],
        "tools": ["Jenkins", "Karma", "Swagger"]
    },
    "complexityEstimate": {
        "level": "Low|Medium|High",
        "storyPoints": "1-13",
        "reasoning": "explanation",
        "confidence": "High|Medium|Low"
    }
}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "HTTP-Referer": "https://sprintcopilot.local",
        "X-Title": "SprintCopilot",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "openai/gpt-4o-mini",
        "messages": [
          {
            "role": "user",
            "content": prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    let text = data.choices[0].message.content;
    
    // Extract JSON from markdown code blocks
    if (text.includes('```json')) {
      text = text.replace(/```json\n/, '').replace(/\n```$/, '');
    }
    
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw text:', text);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }
  }

  showLoading() {
    const resultsDiv = document.getElementById("results");
    resultsDiv.style.display = "block";
    resultsDiv.innerHTML = `
      <div class="progress-section mb-4">
        <h3>🤖 AI Analysis in Progress...</h3>
        <div class="progress" style="height: 25px;">
          <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" role="progressbar" style="width: 100%"></div>
        </div>
      </div>
    `;
  }

  displayResults(analysis) {
    const resultsDiv = document.getElementById("results");
    if (!resultsDiv) {
      console.error('Results div not found');
      return;
    }
    
    this.currentAnalysis = analysis;
    resultsDiv.style.display = "block";
    this.updateStats(analysis);
    
    resultsDiv.innerHTML = `
      <!-- Quick Stats -->
      <div class="stats-section mb-4">
        <div class="row text-center">
          <div class="col-md-3">
            <div class="stat-card">
              <h4>${analysis.complexityEstimate.storyPoints}</h4>
              <p>Story Points</p>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card">
              <h4>${this.getTotalTasks(analysis)}</h4>
              <p>Total Tasks</p>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card">
              <h4>7</h4>
              <p>Dev Days</p>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card risk-${analysis.complexityEstimate.level.toLowerCase()}">
              <h4>${analysis.complexityEstimate.level}</h4>
              <p>Risk Level</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Analysis Tabs -->
      <ul class="nav nav-pills mb-3" id="analysisTabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link active" id="overview-tab" data-bs-toggle="pill" data-bs-target="#overview" type="button" role="tab">📊 Overview</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="breakdown-tab" data-bs-toggle="pill" data-bs-target="#breakdown" type="button" role="tab">🔧 Breakdown</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="testing-tab" data-bs-toggle="pill" data-bs-target="#testing" type="button" role="tab">🧪 Testing</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="sprint-tab" data-bs-toggle="pill" data-bs-target="#sprint" type="button" role="tab">📅 Sprint Plan</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="team-tab" data-bs-toggle="pill" data-bs-target="#team" type="button" role="tab">👥 Team Tracking</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="demo-tab" data-bs-toggle="pill" data-bs-target="#demo" type="button" role="tab">📱 APP Demo</button>
        </li>
      </ul>
      
      <div class="tab-content" id="analysisTabContent">
        <div class="tab-pane fade show active" id="overview" role="tabpanel">
          ${this.createOverviewTab(analysis)}
        </div>
        <div class="tab-pane fade" id="breakdown" role="tabpanel">
          ${this.createBreakdownTab(analysis)}
        </div>
        <div class="tab-pane fade" id="testing" role="tabpanel">
          ${this.createTestingTab(analysis)}
        </div>
        <div class="tab-pane fade" id="sprint" role="tabpanel">
          ${this.createSprintPlan(analysis)}
        </div>
        <div class="tab-pane fade" id="team" role="tabpanel">
          ${this.createTeamTrackingTab(analysis)}
        </div>
        <div class="tab-pane fade" id="demo" role="tabpanel">
          ${this.createAppDemoTab(analysis)}
        </div>
      </div>
    `;
  }

  createList(items, category = '', isEditable = true) {
    const itemsArray = items || [];
    return `
      <div class="list-group" data-category="${category}">
        ${itemsArray.map((item, index) => `
          <div class="list-group-item d-flex justify-content-between align-items-center">
            <span class="editable-content" contenteditable="${isEditable}" data-category="${category}" data-index="${index}">${item}</span>
            ${isEditable ? `
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-success" onclick="sprintCopilot.saveEdit('${category}', ${index})">💾</button>
                <button class="btn btn-outline-danger" onclick="sprintCopilot.deleteItem('${category}', ${index})">🗑️</button>
              </div>
            ` : ''}
          </div>
        `).join("")}
        ${isEditable ? `
          <div class="list-group-item border-0 p-2">
            <button class="btn btn-sm btn-outline-primary w-100" onclick="sprintCopilot.addItem('${category}')">
              ➕ Add New Item
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  createCategorizedList(categories, isEditable = true) {
    const categoriesObj = categories || {};
    
    const categoryIcons = {
      frontend: '🎨',
      backend: '⚙️',
      database: '🗄️',
      tools: '📝',
      testing: '🧪'
    };
    
    return Object.entries(categoriesObj).map(([category, items]) => {
      const itemsArray = items || [];
      const icon = categoryIcons[category] || '📝';
      return `
        <div class="category-section">
          <h5>${icon} ${category.charAt(0).toUpperCase() + category.slice(1)}</h5>
          <div class="list-group" data-category="${category}">
            ${itemsArray.map((item, index) => `
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span class="editable-content" contenteditable="${isEditable}" data-category="${category}" data-index="${index}">${item}</span>
                ${isEditable ? `
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-success" onclick="sprintCopilot.saveEdit('${category}', ${index})">💾</button>
                    <button class="btn btn-outline-danger" onclick="sprintCopilot.deleteItem('${category}', ${index})">🗑️</button>
                  </div>
                ` : ''}
              </div>
            `).join('')}
            ${isEditable ? `
              <div class="list-group-item border-0 p-2">
                <button class="btn btn-sm btn-outline-primary w-100" onclick="sprintCopilot.addItem('${category}')">
                  ➕ Add New Item
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  createSprintPlan(analysis) {
    const startDate = document.getElementById('sprintStartDate').value;
    const sprintWeeks = parseInt(document.getElementById('sprintWeeks').value);
    
    if (!startDate) {
      return '<p class="text-warning">Please select a sprint start date to generate sprint plan.</p>';
    }

    const sprintDates = this.calculateSprintDates(startDate, sprintWeeks);
    const totalPoints = parseInt(analysis.complexityEstimate.storyPoints) || 5;
    const daysPerWeek = 5;
    
    let tabsHtml = '<ul class="nav nav-tabs" id="sprintTabs" role="tablist">';
    let contentHtml = '<div class="tab-content" id="sprintTabContent">';
    
    for (let week = 1; week <= sprintWeeks; week++) {
      const startIdx = (week - 1) * daysPerWeek;
      const endIdx = week * daysPerWeek;
      const weekDates = sprintDates.slice(startIdx, endIdx);
      
      tabsHtml += `
        <li class="nav-item" role="presentation">
          <button class="nav-link ${week === 1 ? 'active' : ''}" id="week${week}-tab" 
                  data-bs-toggle="tab" data-bs-target="#week${week}" type="button" role="tab">
            Week ${week} (Days ${startIdx + 1}-${endIdx})
          </button>
        </li>
      `;
      
      contentHtml += `
        <div class="tab-pane fade ${week === 1 ? 'show active' : ''}" id="week${week}" role="tabpanel">
          ${this.createWeekTable(weekDates, totalPoints, week, sprintWeeks)}
        </div>
      `;
    }
    
    tabsHtml += '</ul>';
    contentHtml += '</div>';
    
    return tabsHtml + contentHtml;
  }

  calculateSprintDates(startDate, sprintWeeks) {
    const dates = [];
    const start = new Date(startDate);
    let currentDate = new Date(start);
    const totalDays = sprintWeeks * 5; // 5 working days per week
    
    while (dates.length < totalDays) {
      if (currentDate.getDay() >= 1 && currentDate.getDay() <= 5) { // Mon-Fri
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }

  createWeekTable(dates, totalPoints, weekNum, totalWeeks) {
    const sprintWeeks = parseInt(document.getElementById('sprintWeeks').value);
    const devDays = Math.max(1, (sprintWeeks * 5) - 3); // Reserve last 3 days for testing
    const pointsPerDay = Math.ceil(totalPoints / devDays);
    
    return `
      <div class="table-responsive mt-3">
        <table class="table table-bordered">
          <thead class="table-dark">
            <tr>
              <th>Day</th>
              <th>Date</th>
              <th>Target Points</th>
              <th>Activities</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${dates.map((date, index) => {
              const dayNum = ((weekNum - 1) * 5) + index + 1;
              const totalDays = sprintWeeks * 5;
              const isLastThreeDays = dayNum > (totalDays - 3);
              const activities = this.getDayActivities(dayNum, isLastThreeDays, totalDays);
              const points = isLastThreeDays ? 0 : pointsPerDay;
              
              return `
                <tr class="${isLastThreeDays ? 'table-warning' : ''}">
                  <td><strong>Day ${dayNum}</strong></td>
                  <td>${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                  <td><span class="badge bg-primary">${points} SP</span></td>
                  <td>${activities}</td>
                  <td><span class="badge bg-secondary">Planned</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  getDayActivities(dayNum, isLastThreeDays, totalDays) {
    const freezeDay = totalDays - 3;
    
    if (!isLastThreeDays) {
      return `
        <div class="activity-list">
          <span class="badge bg-success me-1">Development</span>
          <span class="badge bg-info me-1">Code Review</span>
          ${dayNum === freezeDay ? '<span class="badge bg-warning">Code Freeze</span>' : ''}
        </div>
      `;
    } else {
      const lastThreeDays = {
        [totalDays - 2]: '<span class="badge bg-warning">Build & Deploy</span><span class="badge bg-secondary ms-1">Integration Testing</span>',
        [totalDays - 1]: '<span class="badge bg-info">System Testing</span><span class="badge bg-primary ms-1">UAT Preparation</span>',
        [totalDays]: '<span class="badge bg-success">UAT & Sign-off</span><span class="badge bg-dark ms-1">Sprint Review</span>'
      };
      return lastThreeDays[dayNum] || '';
    }
  }

  updateStats(analysis) {
    // This method can be used for real-time stats updates
  }

  getTotalTasks(analysis) {
    let total = 0;
    if (analysis.subTasks) {
      Object.values(analysis.subTasks).forEach(tasks => {
        if (Array.isArray(tasks)) total += tasks.length;
      });
    }
    return total;
  }

  createOverviewTab(analysis) {
    return `
      <div class="row">
        <div class="col-md-6">
          <div class="card">
            <h3>📋 Missing Details</h3>
            <div>${this.createList(analysis.missingDetails, 'missingDetails')}</div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <h3>🎯 Acceptance Criteria</h3>
            <div>${this.createList(analysis.acceptanceCriteria, 'acceptanceCriteria')}</div>
          </div>
        </div>
      </div>
      <div class="row mt-3">
        <div class="col-md-6">
          <div class="card">
            <h3>⚠️ Risks & Dependencies</h3>
            <div>${this.createList(analysis.risksAndDependencies, 'risksAndDependencies')}</div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <h3>💻 Tech Stack</h3>
            <div>${this.createCategorizedList(analysis.techStack || {})}</div>
          </div>
        </div>
      </div>
    `;
  }

  createBreakdownTab(analysis) {
    return `
      <div class="row">
        <div class="col-md-6">
          <div class="card">
            <h3>📖 Sub Stories</h3>
            <div>${this.createCategorizedList(analysis.subStories)}</div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <h3>✅ Sub Tasks</h3>
            <div>${this.createCategorizedList(analysis.subTasks)}</div>
          </div>
        </div>
      </div>
      <div class="row mt-3">
        <div class="col-md-6">
          <div class="card">
            <h3>🔗 API Contracts</h3>
            <div>${this.createList(analysis.apiContracts, 'apiContracts')}</div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <h3>🗄️ Database Schema</h3>
            <div>${this.createList(analysis.databaseSchema, 'databaseSchema')}</div>
          </div>
        </div>
      </div>
    `;
  }

  createTestingTab(analysis) {
    return `
      <div class="row">
        <div class="col-md-8">
          <div class="card">
            <h3>🧪 Testing Strategy</h3>
            <div>${this.createCategorizedList(analysis.testingStrategy || {})}</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card">
            <h3>📊 Complexity Estimate</h3>
            <div class="estimate-badge ${analysis.complexityEstimate.level.toLowerCase()}">
              ${analysis.complexityEstimate.level} - ${analysis.complexityEstimate.storyPoints} SP
            </div>
            <p><strong>Confidence:</strong> ${analysis.complexityEstimate.confidence || 'Medium'}</p>
            <p>${analysis.complexityEstimate.reasoning}</p>
          </div>
        </div>
      </div>
    `;
  }

  createTeamTrackingTab(analysis) {
    const teamSize = parseInt(document.getElementById('teamSize').value);
    const sprintWeeks = parseInt(document.getElementById('sprintWeeks').value);
    const totalDays = sprintWeeks * 5;
    
    return `
      <div class="row">
        <div class="col-md-8">
          <div class="card">
            <h3>📅 Daily Team Tracking</h3>
            ${this.createTeamTrackingTable(teamSize, totalDays)}
          </div>
        </div>
        <div class="col-md-4">
          <div class="card">
            <h3>🏖️ Leave Planning</h3>
            ${this.createLeavePlanning()}
          </div>
          <div class="card mt-3">
            <h3>⚠️ Sprint Spillover</h3>
            ${this.createSpilloverPlanning(analysis)}
          </div>
        </div>
      </div>
    `;
  }

  createTeamTrackingTable(teamSize, totalDays) {
    const roles = ['Angular Dev', 'Java Dev', 'Full Stack Dev', 'QA Tester', 'DevOps', 'UI/UX', 'Tech Lead', 'Scrum Master'];
    const teamMembers = roles.slice(0, teamSize);
    
    return `
      <div class="table-responsive">
        <table class="table table-sm table-bordered">
          <thead class="table-primary">
            <tr>
              <th>Team Member</th>
              ${Array.from({length: Math.min(totalDays, 10)}, (_, i) => `<th>Day ${i + 1}</th>`).join('')}
              <th>Total Hours</th>
            </tr>
          </thead>
          <tbody>
            ${teamMembers.map((member, idx) => `
              <tr>
                <td><strong>${member}</strong></td>
                ${Array.from({length: Math.min(totalDays, 10)}, (_, dayIdx) => {
                  const hours = this.getPlannedHours(idx, dayIdx, totalDays);
                  const status = this.getDayStatus(dayIdx, totalDays);
                  return `<td class="${status}">
                    <input type="number" class="form-control form-control-sm" 
                           value="${hours}" min="0" max="8" style="width: 60px;">
                  </td>`;
                }).join('')}
                <td><span class="badge bg-info">40h</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  getPlannedHours(memberIdx, dayIdx, totalDays) {
    const isLastThreeDays = dayIdx >= (totalDays - 3);
    if (isLastThreeDays && memberIdx >= 3) return 6; // QA/Testing focus
    if (isLastThreeDays) return 4; // Reduced dev hours
    return 8; // Normal dev hours
  }

  getDayStatus(dayIdx, totalDays) {
    if (dayIdx >= (totalDays - 3)) return 'table-warning'; // Testing phase
    return ''; // Development phase
  }

  createLeavePlanning() {
    return `
      <div class="mb-3">
        <label class="form-label">Team Member on Leave:</label>
        <select class="form-select form-select-sm">
          <option>Select member...</option>
          <option>Angular Dev</option>
          <option>Java Dev</option>
          <option>QA Tester</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">Leave Dates:</label>
        <input type="date" class="form-control form-control-sm mb-1">
        <input type="date" class="form-control form-control-sm">
      </div>
      <div class="alert alert-info alert-sm">
        <small>📊 <strong>Impact:</strong> 15% capacity reduction<br>
        🔄 <strong>Mitigation:</strong> Redistribute tasks to available members</small>
      </div>
    `;
  }

  createSpilloverPlanning(analysis) {
    const riskLevel = analysis.complexityEstimate.level;
    const spilloverRisk = riskLevel === 'High' ? '30%' : riskLevel === 'Medium' ? '15%' : '5%';
    
    return `
      <div class="alert alert-warning alert-sm">
        <small><strong>Spillover Risk:</strong> ${spilloverRisk}</small>
      </div>
      <div class="mb-2">
        <small><strong>Contingency Plan:</strong></small>
        <ul class="small">
          <li>Prioritize core features</li>
          <li>Move nice-to-have to next sprint</li>
          <li>Add buffer time for testing</li>
        </ul>
      </div>
      <div class="mb-2">
        <small><strong>Buffer Tasks:</strong></small>
        <div class="list-group list-group-flush">
          <div class="list-group-item list-group-item-sm">UI Polish - 2 SP</div>
          <div class="list-group-item list-group-item-sm">Documentation - 1 SP</div>
          <div class="list-group-item list-group-item-sm">Performance Optimization - 3 SP</div>
        </div>
      </div>
    `;
  }

  createAppDemoTab(analysis) {
    return `
      <div class="row">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5>📱 AI-Generated App Demo</h5>
              <div class="btn-group">
                <button class="btn btn-primary" onclick="sprintCopilot.generateAppDemo()" id="generateAppBtn">
                  🤖 Generate App
                </button>
                <button class="btn btn-outline-secondary" onclick="sprintCopilot.openAppInNewTab()" id="openAppBtn" style="display:none">
                  🔗 Open in New Tab
                </button>
                <div class="btn-group" id="exportAppBtns" style="display:none">
                  <button class="btn btn-outline-success dropdown-toggle" data-bs-toggle="dropdown">
                    📦 Export Code
                  </button>
                  <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="#" onclick="sprintCopilot.exportAppCode('html')">📝 HTML File</a></li>
                    <li><a class="dropdown-item" href="#" onclick="sprintCopilot.exportAppCode('zip')">🗄️ Project ZIP</a></li>
                    <li><a class="dropdown-item" href="#" onclick="sprintCopilot.copyAppCode()">📋 Copy to Clipboard</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div class="card-body">
              <div id="appDemoContainer">
                <div class="text-center p-5">
                  <h4>Click "Generate App" to create a dynamic application based on your story analysis</h4>
                  <p class="text-muted">AI will generate a complete responsive web application with multiple pages, navigation, and realistic functionality.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async generateAppDemo() {
    if (!this.currentAnalysis) {
      alert('Please analyze a story first');
      return;
    }

    const generateBtn = document.getElementById('generateAppBtn');
    const container = document.getElementById('appDemoContainer');
    
    generateBtn.disabled = true;
    generateBtn.innerHTML = '🔄 Generating...';
    
    container.innerHTML = `
      <div class="text-center p-4">
        <div class="spinner-border text-primary" role="status"></div>
        <h5 class="mt-3">🤖 AI is creating your application...</h5>
        <p class="text-muted">This may take a few moments</p>
      </div>
    `;

    try {
      let appHtml = await this.callOpenRouterForApp();
      
      // Enhance the generated HTML with additional styling
      appHtml = this.enhanceGeneratedApp(appHtml);
      
      this.generatedAppHtml = appHtml;
      container.innerHTML = `
        <div class="app-preview-container">
          <div class="app-controls mb-3">
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-secondary active" onclick="sprintCopilot.setViewMode('desktop')">🖥️ Desktop</button>
              <button class="btn btn-sm btn-outline-secondary" onclick="sprintCopilot.setViewMode('mobile')">📱 Mobile</button>
            </div>
            <button class="btn btn-sm btn-success ms-2" onclick="sprintCopilot.regenerateApp()">🔄 Regenerate</button>
          </div>
          <div class="app-frame desktop-frame" id="appFrame">
            <iframe srcdoc="${this.escapeHtml(appHtml)}" style="width:100%;height:600px;border:none;border-radius:8px;"></iframe>
          </div>
        </div>
      `;
      
      document.getElementById('openAppBtn').style.display = 'inline-block';
      document.getElementById('exportAppBtns').style.display = 'inline-block';
      generateBtn.innerHTML = '✅ Generated';
      
    } catch (error) {
      console.error('App generation failed:', error);
      // Use fallback template
      const fallbackApp = this.createFallbackApp();
      this.generatedAppHtml = fallbackApp;
      
      container.innerHTML = `
        <div class="app-preview-container">
          <div class="alert alert-warning mb-3">
            <small>⚠️ AI generation had issues. Using enhanced template instead.</small>
          </div>
          <div class="app-controls mb-3">
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-secondary active" onclick="sprintCopilot.setViewMode('desktop')">🖥️ Desktop</button>
              <button class="btn btn-sm btn-outline-secondary" onclick="sprintCopilot.setViewMode('mobile')">📱 Mobile</button>
            </div>
            <button class="btn btn-sm btn-primary ms-2" onclick="sprintCopilot.generateAppDemo()">🔄 Retry AI</button>
          </div>
          <div class="app-frame desktop-frame" id="appFrame">
            <iframe srcdoc="${this.escapeHtml(fallbackApp)}" style="width:100%;height:600px;border:none;border-radius:8px;"></iframe>
          </div>
        </div>
      `;
      
      document.getElementById('openAppBtn').style.display = 'inline-block';
      document.getElementById('exportAppBtns').style.display = 'inline-block';
      generateBtn.innerHTML = '✅ Template Used';
    }
    
    generateBtn.disabled = false;
  }

  async callOpenRouterForApp() {
    const storyText = document.getElementById('storyInput').value;
    const projectType = document.getElementById('projectType').value;
    
    const prompt = `Create a complete, professional web application based on this user story:

"${storyText}"

Project Type: ${projectType}

Requirements:
1. Use Bootstrap 5.3 CDN for styling
2. Create a modern dashboard-style application
3. Include navigation bar with brand logo and menu items
4. Add sidebar navigation for different sections
5. Use professional color scheme (primary: #0d6efd, secondary: #6c757d)
6. Include these sections based on story: Dashboard, Data Management, Reports, Settings
7. Add realistic mock data in tables and cards
8. Include interactive elements: buttons, forms, modals, charts placeholder
9. Use Font Awesome icons (CDN)
10. Add custom CSS for professional styling
11. Make it fully responsive
12. Include JavaScript for basic interactions
13. Use proper spacing, shadows, and modern design patterns
14. Add loading states and hover effects

Style Guidelines:
- Clean, minimalist design
- Consistent spacing (use Bootstrap spacing classes)
- Professional typography
- Subtle shadows and borders
- Modern card-based layout
- Proper color contrast
- Smooth transitions

Return ONLY the complete HTML code without markdown formatting.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "HTTP-Referer": "https://sprintcopilot.local",
        "X-Title": "SprintCopilot",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "openai/gpt-4o-mini",
        "messages": [
          {
            "role": "user",
            "content": prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    let html = data.choices[0].message.content;
    
    // Clean up any markdown formatting
    if (html.includes('```html')) {
      html = html.replace(/```html\n/, '').replace(/\n```$/, '');
    }
    if (html.includes('```')) {
      html = html.replace(/```\n/, '').replace(/\n```$/, '');
    }
    
    return html;
  }

  setViewMode(mode) {
    const frame = document.getElementById('appFrame');
    const buttons = document.querySelectorAll('.app-controls .btn');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (mode === 'mobile') {
      frame.className = 'app-frame mobile-frame';
    } else {
      frame.className = 'app-frame desktop-frame';
    }
  }

  openAppInNewTab() {
    if (!this.generatedAppHtml) {
      alert('Please generate the app first');
      return;
    }
    
    const newWindow = window.open('', '_blank');
    newWindow.document.write(this.generatedAppHtml);
    newWindow.document.close();
  }

  enhanceGeneratedApp(html) {
    // Add additional styling and improvements to AI-generated HTML
    const enhancements = `
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      .navbar-brand { font-weight: bold; }
      .card { box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: none; }
      .btn { border-radius: 6px; }
      .table { border-radius: 8px; overflow: hidden; }
      .sidebar { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      .main-content { background: #f8f9fa; min-height: 100vh; }
      .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    </style>
    `;
    
    // Insert enhancements before closing head tag
    if (html.includes('</head>')) {
      html = html.replace('</head>', enhancements + '</head>');
    } else {
      html = enhancements + html;
    }
    
    return html;
  }

  createFallbackApp() {
    const storyText = document.getElementById('storyInput').value;
    const projectType = document.getElementById('projectType').value;
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${projectType} Application</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; }
            .sidebar { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
            .sidebar .nav-link { color: rgba(255,255,255,0.8); border-radius: 8px; margin: 2px 0; }
            .sidebar .nav-link:hover, .sidebar .nav-link.active { background: rgba(255,255,255,0.2); color: white; }
            .main-content { padding: 20px; }
            .card { border: none; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-radius: 10px; }
            .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 20px; }
            .navbar-brand { font-weight: bold; }
            .btn { border-radius: 6px; }
        </style>
    </head>
    <body>
        <div class="container-fluid">
            <div class="row">
                <div class="col-md-2 sidebar p-3">
                    <h5 class="text-white mb-4"><i class="fas fa-rocket me-2"></i>App Demo</h5>
                    <nav class="nav flex-column">
                        <a class="nav-link active" href="#" onclick="showSection('dashboard')"><i class="fas fa-tachometer-alt me-2"></i>Dashboard</a>
                        <a class="nav-link" href="#" onclick="showSection('data')"><i class="fas fa-database me-2"></i>Data</a>
                        <a class="nav-link" href="#" onclick="showSection('reports')"><i class="fas fa-chart-bar me-2"></i>Reports</a>
                        <a class="nav-link" href="#" onclick="showSection('settings')"><i class="fas fa-cog me-2"></i>Settings</a>
                    </nav>
                </div>
                <div class="col-md-10 main-content">
                    <nav class="navbar navbar-expand-lg navbar-light bg-white mb-4 rounded shadow-sm">
                        <div class="container-fluid">
                            <span class="navbar-brand">${projectType} Application</span>
                            <div class="navbar-nav ms-auto">
                                <a class="nav-link" href="#"><i class="fas fa-bell"></i></a>
                                <a class="nav-link" href="#"><i class="fas fa-user"></i></a>
                            </div>
                        </div>
                    </nav>
                    
                    <div id="dashboard" class="section">
                        <h2 class="mb-4">Dashboard</h2>
                        <div class="row mb-4">
                            <div class="col-md-3"><div class="card stat-card"><h3>1,234</h3><p>Total Users</p></div></div>
                            <div class="col-md-3"><div class="card stat-card"><h3>567</h3><p>Active Sessions</p></div></div>
                            <div class="col-md-3"><div class="card stat-card"><h3>89%</h3><p>Success Rate</p></div></div>
                            <div class="col-md-3"><div class="card stat-card"><h3>$12.5K</h3><p>Revenue</p></div></div>
                        </div>
                        <div class="row">
                            <div class="col-md-8">
                                <div class="card p-4">
                                    <h5>Activity Overview</h5>
                                    <div class="bg-light p-4 rounded text-center">
                                        <i class="fas fa-chart-line fa-3x text-muted"></i>
                                        <p class="mt-2 text-muted">Chart Placeholder</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card p-4">
                                    <h5>Quick Actions</h5>
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-primary"><i class="fas fa-plus me-2"></i>Add New</button>
                                        <button class="btn btn-outline-primary"><i class="fas fa-download me-2"></i>Export Data</button>
                                        <button class="btn btn-outline-secondary"><i class="fas fa-cog me-2"></i>Settings</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="data" class="section" style="display:none;">
                        <h2 class="mb-4">Data Management</h2>
                        <div class="card p-4">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h5>Data Records</h5>
                                <button class="btn btn-primary"><i class="fas fa-plus me-2"></i>Add Record</button>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead class="table-dark">
                                        <tr><th>ID</th><th>Name</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr><td>001</td><td>Sample Record 1</td><td><span class="badge bg-success">Active</span></td><td>2024-01-15</td><td><button class="btn btn-sm btn-outline-primary">Edit</button></td></tr>
                                        <tr><td>002</td><td>Sample Record 2</td><td><span class="badge bg-warning">Pending</span></td><td>2024-01-14</td><td><button class="btn btn-sm btn-outline-primary">Edit</button></td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <div id="reports" class="section" style="display:none;">
                        <h2 class="mb-4">Reports & Analytics</h2>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card p-4">
                                    <h5>Performance Metrics</h5>
                                    <div class="bg-light p-4 rounded text-center">
                                        <i class="fas fa-chart-pie fa-3x text-muted"></i>
                                        <p class="mt-2 text-muted">Pie Chart Placeholder</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card p-4">
                                    <h5>Trends Analysis</h5>
                                    <div class="bg-light p-4 rounded text-center">
                                        <i class="fas fa-chart-bar fa-3x text-muted"></i>
                                        <p class="mt-2 text-muted">Bar Chart Placeholder</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="settings" class="section" style="display:none;">
                        <h2 class="mb-4">Settings</h2>
                        <div class="card p-4">
                            <form>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Application Name</label>
                                            <input type="text" class="form-control" value="${projectType} App">
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Theme</label>
                                            <select class="form-select">
                                                <option>Default</option>
                                                <option>Dark</option>
                                                <option>Light</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Notifications</label>
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" checked>
                                                <label class="form-check-label">Email Notifications</label>
                                            </div>
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox">
                                                <label class="form-check-label">SMS Notifications</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-primary">Save Settings</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        <script>
            function showSection(sectionId) {
                document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
                document.getElementById(sectionId).style.display = 'block';
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                event.target.classList.add('active');
            }
        </script>
    </body>
    </html>
    `;
  }

  regenerateApp() {
    this.generateAppDemo();
  }

  exportAppCode(format) {
    if (!this.generatedAppHtml) {
      alert('Please generate the app first');
      return;
    }

    if (format === 'html') {
      this.downloadFile(this.generatedAppHtml, 'app-demo.html', 'text/html');
    } else if (format === 'zip') {
      this.createProjectZip();
    }
  }

  async copyAppCode() {
    if (!this.generatedAppHtml) {
      alert('Please generate the app first');
      return;
    }

    try {
      await navigator.clipboard.writeText(this.generatedAppHtml);
      alert('✅ Code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      this.showCodeModal();
    }
  }

  downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  createProjectZip() {
    const projectFiles = this.generateProjectFiles();
    
    // Create a simple ZIP-like structure (for demo purposes)
    let zipContent = 'Project Files:\n\n';
    Object.entries(projectFiles).forEach(([filename, content]) => {
      zipContent += `=== ${filename} ===\n${content}\n\n`;
    });
    
    this.downloadFile(zipContent, 'app-project.txt', 'text/plain');
    
    // Show instructions for real ZIP creation
    alert('📝 Project files downloaded as text.\n\nFor a real ZIP file, use tools like JSZip library or server-side processing.');
  }

  generateProjectFiles() {
    const storyText = document.getElementById('storyInput').value;
    const projectType = document.getElementById('projectType').value;
    
    return {
      'index.html': this.generatedAppHtml,
      'README.md': this.generateReadme(projectType, storyText),
      'package.json': this.generatePackageJson(projectType),
      'styles.css': this.generateExtraCSS(),
      'script.js': this.generateExtraJS()
    };
  }

  generateReadme(projectType, storyText) {
    return `# ${projectType} Application

## Description
${storyText}

## Generated by SprintCopilot
This application was automatically generated based on user story analysis.

## Tech Stack
- HTML5
- CSS3
- Bootstrap 5
- JavaScript
- Font Awesome Icons

## Getting Started
1. Open index.html in a web browser
2. Or serve with a local web server
3. Customize the code as needed

## Features
- Responsive design
- Modern UI components
- Interactive navigation
- Professional styling

## Development
This is a prototype/demo application. For production use:
- Add proper backend integration
- Implement real data handling
- Add authentication and security
- Optimize for performance
- Add comprehensive testing
`;
  }

  generatePackageJson(projectType) {
    return `{
  "name": "${projectType.toLowerCase().replace(/\s+/g, '-')}-app",
  "version": "1.0.0",
  "description": "Generated by SprintCopilot",
  "main": "index.html",
  "scripts": {
    "start": "http-server -p 8080",
    "dev": "live-server --port=8080"
  },
  "dependencies": {
    "bootstrap": "^5.3.0"
  },
  "devDependencies": {
    "http-server": "^14.1.1",
    "live-server": "^1.2.2"
  },
  "keywords": ["demo", "prototype", "sprintcopilot"],
  "author": "SprintCopilot AI",
  "license": "MIT"
}`;
  }

  generateExtraCSS() {
    return `/* Additional Custom Styles */
.fade-in {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.hover-lift {
  transition: transform 0.2s ease;
}

.hover-lift:hover {
  transform: translateY(-2px);
}

.gradient-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.glass-effect {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@media (max-width: 768px) {
  .mobile-hidden { display: none !important; }
  .mobile-full { width: 100% !important; }
}`;
  }

  generateExtraJS() {
    return `// Additional JavaScript functionality

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Loading states
function showLoading(element) {
  element.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
  element.disabled = true;
}

function hideLoading(element, originalText) {
  element.innerHTML = originalText;
  element.disabled = false;
}

// Form validation
function validateForm(formId) {
  const form = document.getElementById(formId);
  const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
  let isValid = true;
  
  inputs.forEach(input => {
    if (!input.value.trim()) {
      input.classList.add('is-invalid');
      isValid = false;
    } else {
      input.classList.remove('is-invalid');
    }
  });
  
  return isValid;
}

// Toast notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = \`alert alert-\${type} position-fixed top-0 end-0 m-3\`;
  toast.style.zIndex = '9999';
  toast.innerHTML = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

console.log('SprintCopilot Demo App - Ready for development!');
`;
  }

  showCodeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">📝 App Source Code</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <textarea class="form-control" rows="20" readonly>${this.generatedAppHtml}</textarea>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" onclick="this.closest('.modal-body').querySelector('textarea').select(); document.execCommand('copy'); alert('Copied!');">Select All</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    new bootstrap.Modal(modal).show();
    modal.addEventListener('hidden.bs.modal', () => modal.remove());
  }

  escapeHtml(html) {
    return html.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  exportToExcel() {
    alert('Excel export feature - Implementation depends on your specific requirements!');
  }

  saveAnalysis(storyText, analysis) {
    const key = `sprint_${Date.now()}`;
    const data = {
      id: key,
      timestamp: new Date().toISOString(),
      story: storyText.substring(0, 100) + (storyText.length > 100 ? '...' : ''),
      fullStory: storyText,
      analysis: analysis,
      teamSize: document.getElementById('teamSize').value,
      projectType: document.getElementById('projectType').value,
      sprintWeeks: document.getElementById('sprintWeeks').value,
      sprintStartDate: document.getElementById('sprintStartDate').value
    };
    localStorage.setItem(key, JSON.stringify(data));
  }

  loadAnalysis(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  getAllAnalyses() {
    const analyses = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('sprint_')) {
        const data = this.loadAnalysis(key);
        if (data) analyses.push(data);
      }
    }
    return analyses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  loadHistoryList() {
    const analyses = this.getAllAnalyses();
    const historyHtml = analyses.length > 0 ? `
      <div class="card mb-3">
        <div class="card-header">
          <h5>📚 Analysis History</h5>
        </div>
        <div class="card-body">
          <div class="list-group">
            ${analyses.map(item => `
              <a href="#" class="list-group-item list-group-item-action" onclick="sprintCopilot.selectAnalysis('${item.id}')">
                <div class="d-flex w-100 justify-content-between">
                  <h6 class="mb-1">${item.story}</h6>
                  <small>${new Date(item.timestamp).toLocaleDateString()}</small>
                </div>
                <p class="mb-1">Team: ${item.teamSize} | ${item.projectType} | ${item.sprintWeeks}w</p>
                <small>Points: ${item.analysis.complexityEstimate.storyPoints} | Risk: ${item.analysis.complexityEstimate.level}</small>
              </a>
            `).join('')}
          </div>
        </div>
      </div>
    ` : '';
    
    const existingHistory = document.getElementById('historySection');
    if (existingHistory) {
      existingHistory.innerHTML = historyHtml;
    } else {
      const inputSection = document.querySelector('.input-section');
      if (inputSection && historyHtml) {
        inputSection.insertAdjacentHTML('afterend', `<div id="historySection">${historyHtml}</div>`);
      }
    }
  }

  selectAnalysis(key) {
    const data = this.loadAnalysis(key);
    if (data) {
      this.currentAnalysisKey = key;
      document.getElementById('storyInput').value = data.fullStory;
      document.getElementById('teamSize').value = data.teamSize;
      document.getElementById('projectType').value = data.projectType;
      document.getElementById('sprintWeeks').value = data.sprintWeeks;
      document.getElementById('sprintStartDate').value = data.sprintStartDate;
      this.displayResults(data.analysis);
      document.getElementById('exportBtn').style.display = 'inline-block';
    }
  }

  saveEdit(category, index) {
    const element = document.querySelector(`[data-category="${category}"][data-index="${index}"]`);
    if (!element || !this.currentAnalysis) return;
    
    const newValue = element.textContent.trim();
    if (this.currentAnalysis[category] && Array.isArray(this.currentAnalysis[category])) {
      this.currentAnalysis[category][index] = newValue;
    } else if (this.currentAnalysis.subStories && this.currentAnalysis.subStories[category]) {
      this.currentAnalysis.subStories[category][index] = newValue;
    } else if (this.currentAnalysis.subTasks && this.currentAnalysis.subTasks[category]) {
      this.currentAnalysis.subTasks[category][index] = newValue;
    } else if (this.currentAnalysis.testingStrategy && this.currentAnalysis.testingStrategy[category]) {
      this.currentAnalysis.testingStrategy[category][index] = newValue;
    }
    
    if (this.currentAnalysisKey) {
      const data = this.loadAnalysis(this.currentAnalysisKey);
      if (data) {
        data.analysis = this.currentAnalysis;
        localStorage.setItem(this.currentAnalysisKey, JSON.stringify(data));
      }
    }
    
    element.style.backgroundColor = '#d4edda';
    setTimeout(() => element.style.backgroundColor = '', 1000);
  }

  addItem(category) {
    if (!this.currentAnalysis) return;
    
    const newItem = 'New item - click to edit';
    
    if (this.currentAnalysis[category] && Array.isArray(this.currentAnalysis[category])) {
      this.currentAnalysis[category].push(newItem);
    } else if (this.currentAnalysis.subStories && this.currentAnalysis.subStories[category]) {
      this.currentAnalysis.subStories[category].push(newItem);
    } else if (this.currentAnalysis.subTasks && this.currentAnalysis.subTasks[category]) {
      this.currentAnalysis.subTasks[category].push(newItem);
    } else if (this.currentAnalysis.testingStrategy && this.currentAnalysis.testingStrategy[category]) {
      this.currentAnalysis.testingStrategy[category].push(newItem);
    } else {
      // Create new category if it doesn't exist
      if (!this.currentAnalysis[category]) {
        this.currentAnalysis[category] = [];
      }
      this.currentAnalysis[category].push(newItem);
    }
    
    this.displayResults(this.currentAnalysis);
    this.saveCurrentAnalysis();
  }

  deleteItem(category, index) {
    if (!this.currentAnalysis || !confirm('Delete this item?')) return;
    
    if (this.currentAnalysis[category] && Array.isArray(this.currentAnalysis[category])) {
      this.currentAnalysis[category].splice(index, 1);
    } else if (this.currentAnalysis.subStories && this.currentAnalysis.subStories[category]) {
      this.currentAnalysis.subStories[category].splice(index, 1);
    } else if (this.currentAnalysis.subTasks && this.currentAnalysis.subTasks[category]) {
      this.currentAnalysis.subTasks[category].splice(index, 1);
    } else if (this.currentAnalysis.testingStrategy && this.currentAnalysis.testingStrategy[category]) {
      this.currentAnalysis.testingStrategy[category].splice(index, 1);
    }
    
    this.displayResults(this.currentAnalysis);
    this.saveCurrentAnalysis();
  }

  saveCurrentAnalysis() {
    if (this.currentAnalysisKey) {
      const data = this.loadAnalysis(this.currentAnalysisKey);
      if (data) {
        data.analysis = this.currentAnalysis;
        localStorage.setItem(this.currentAnalysisKey, JSON.stringify(data));
      }
    }
  }
}

// Initialize the application when DOM is loaded
let sprintCopilot;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => sprintCopilot = new SprintCopilot());
} else {
  sprintCopilot = new SprintCopilot();
}
