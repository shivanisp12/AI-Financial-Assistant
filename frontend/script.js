const API_URL = "http://127.0.0.1:8000";
let revChart = null;
let riskChart = null;

// Initialize Interactive Particles Canvas
window.onload = function() {
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    for(let i = 0; i < 45; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if(p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if(p.y < 0 || p.y > canvas.height) p.vy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        requestAnimationFrame(animate);
    }
    animate();
};

function updateFileName() {
    const fileInput = document.getElementById('pdfFile');
    const display = document.getElementById('fileNameDisplay');
    if (fileInput.files[0]) display.innerText = fileInput.files[0].name;
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    
    event.currentTarget.classList.add('active');
    document.getElementById(tabId).style.display = 'block';
}

async function uploadPDF() {
    const fileInput = document.getElementById('pdfFile');
    const statusText = document.getElementById('uploadStatus');
    const progress = document.getElementById('pipelineProgress');

    if (!fileInput.files[0]) {
        alert("Please select a financial PDF document first.");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    progress.style.display = 'flex';
    document.getElementById('p1').classList.add('active');
    statusText.innerText = "Ingesting document into Azure Blob Storage...";

    setTimeout(() => {
        document.getElementById('p2').classList.add('active');
        statusText.innerText = "Running PyPDF text chunking & anomaly detector...";
    }, 1200);

    try {
        const response = await fetch(`${API_URL}/upload`, { method: "POST", body: formData });
        const data = await response.json();

        if (response.ok) {
            document.getElementById('p3').classList.add('active');
            statusText.innerText = `Audit Pipeline Complete: ${data.message}`;

            // Update Metric HUD
            document.getElementById('valHealth').innerText = data.health_index;
            document.getElementById('valRiskLevel').innerText = data.risk_level;
            document.getElementById('valPages').innerText = `${data.pages_processed} PAGES`;
            document.getElementById('valWords').innerText = `${data.total_words.toLocaleString()} Tokens Extracted`;
            document.getElementById('valAnomaliesCount').innerText = `${data.anomalies.length} FLAGGED`;

            // Populate Financial Statement KPI Table
            const kpiBody = document.getElementById('kpiTableBody');
            kpiBody.innerHTML = "";
            data.kpis.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${item.metric}</strong></td>
                    <td>${item.value}</td>
                    <td style="color: #00f2fe;">${item.yoy}</td>
                    <td><span class="badge badge-cyan">${item.status}</span></td>
                `;
                kpiBody.appendChild(tr);
            });

            // Populate Anomaly List
            const anomalyBox = document.getElementById('anomaliesList');
            anomalyBox.innerHTML = "";
            if(data.anomalies.length === 0) {
                anomalyBox.innerHTML = "<div class='anomaly-item' style='border-color:#10b981; color:#10b981;'>No high-severity compliance or auditor risks detected.</div>";
            } else {
                data.anomalies.forEach(a => {
                    const div = document.createElement('div');
                    div.className = 'anomaly-item';
                    div.innerHTML = `
                        <div>
                            <div class="anomaly-title"><i class="fa-solid fa-triangle-exclamation"></i> ${a.type}</div>
                            <div class="anomaly-sub">${a.occurrences} keyword pattern instances detected in financial notes.</div>
                        </div>
                        <span class="badge" style="background:rgba(239, 68, 68, 0.2); color:#ef4444;">${a.severity} SEVERITY</span>
                    `;
                    anomalyBox.appendChild(div);
                });
            }

            // Show Tabs & Render Graphics
            document.getElementById('workspaceTabs').style.display = 'flex';
            document.getElementById('kpiTab').style.display = 'block';
            renderCharts(data.chart_data);
        } else {
            statusText.innerText = `Error: ${data.detail}`;
        }
    } catch (error) {
        statusText.innerText = "Error reaching backend server.";
    }
}

function renderCharts(chartData) {
    const ctx1 = document.getElementById('revenueChart').getContext('2d');
    if (revChart) revChart.destroy();

    revChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['2023', '2024', '2025', '2026 (Reported)'],
            datasets: [
                { label: 'Revenue (Cr)', data: chartData.financial_trend, backgroundColor: 'rgba(0, 242, 254, 0.7)' },
                { label: 'OPEX (Cr)', data: chartData.opex_trend, backgroundColor: 'rgba(59, 130, 246, 0.5)' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8' } } },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });

    const ctx2 = document.getElementById('riskRadarChart').getContext('2d');
    if (riskChart) riskChart.destroy();

    riskChart = new Chart(ctx2, {
        type: 'radar',
        data: {
            labels: ['Litigation Risk', 'Debt Exposure', 'Tax Demand', 'Auditor Notes'],
            datasets: [{
                label: 'Compliance Risk Profile',
                data: chartData.risk_breakdown,
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                borderColor: '#ef4444',
                pointBackgroundColor: '#00f2fe'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8' } } },
            scales: { r: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { display: false } } }
        }
    });
}

async function askQuestion() {
    const questionInput = document.getElementById('userQuestion');
    const answerOutput = document.getElementById('answerOutput');
    const sourceOutput = document.getElementById('sourceOutput');
    const auditVerdict = document.getElementById('auditVerdict');

    if (!questionInput.value.trim()) return;

    answerOutput.innerText = "Querying Azure Cognitive Search vector store...";

    try {
        const response = await fetch(`${API_URL}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: questionInput.value })
        });

        const data = await response.json();
        if (response.ok) {
            answerOutput.innerText = data.answer;
            auditVerdict.innerText = data.audit_verdict;
            sourceOutput.innerText = `Source Reference: Page ${data.page} (Verified Grounded Citation)`;
        } else {
            answerOutput.innerText = `Error: ${data.detail}`;
        }
    } catch (error) {
        answerOutput.innerText = "Error connecting to backend API.";
    }
}
// Display the selected file name in the upload box
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    document.getElementById('fileLabel').innerText = `📄 Selected File: ${file.name}`;
  }
}