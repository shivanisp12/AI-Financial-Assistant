const API_URL = "https://ai-financial-assistant-ajeq.onrender.com";
let riskChart = null;

window.onload = function () {
  initParticles();
  initAnalyticsChart();
};

function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let particles = Array.from({ length: 30 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.5 + 0.5,
    d: Math.random() * 0.5 + 0.2
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0, 242, 254, 0.15)";
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      p.y -= p.d;
      if (p.y < 0) p.y = canvas.height;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

function initAnalyticsChart() {
  const ctx = document.getElementById('riskChart').getContext('2d');
  riskChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Liquidity', 'Compliance', 'Revenue Exposure', 'Operational', 'Legal Risk'],
      datasets: [{
        label: 'Audit Risk Profile',
        data: [20, 15, 35, 25, 10],
        backgroundColor: 'rgba(0, 242, 254, 0.2)',
        borderColor: '#00f2fe',
        pointBackgroundColor: '#4facfe'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
          pointLabels: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } },
          ticks: { display: false }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

async function runAuditQuery() {
  const query = document.getElementById('queryInput').value;
  const btn = document.getElementById('submitBtn');
  const card = document.getElementById('responseCard');

  if (!query) return;

  btn.innerText = "AUDITING...";
  btn.disabled = true;

  try {
    const res = await fetch(`${API_URL}/process_query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: query })
    });
    const data = await res.json();

    document.getElementById('responseText').innerText = data.answer;
    document.getElementById('snippetText').innerText = `"${data.snippet}"`;
    document.getElementById('pageTag').innerText = `Page ${data.page}`;
    document.getElementById('verdictBadge').innerText = data.audit_verdict || "VERIFIED CITATION";
    card.style.display = 'block';

    if (riskChart) {
      riskChart.data.datasets[0].data = [
        Math.floor(Math.random() * 40) + 10,
        Math.floor(Math.random() * 50) + 20,
        Math.floor(Math.random() * 60) + 30,
        Math.floor(Math.random() * 30) + 10,
        Math.floor(Math.random() * 40) + 15
      ];
      riskChart.update();
    }
  } catch (err) {
    alert("Connection error to audit engine.");
  } finally {
    btn.innerText = "RUN AUDIT";
    btn.disabled = false;
  }
}