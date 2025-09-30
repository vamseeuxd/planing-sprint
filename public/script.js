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
