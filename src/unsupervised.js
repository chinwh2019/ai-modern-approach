import p5 from 'p5';
import Chart from 'chart.js/auto';

// --- Global State ---
const state = {
    points: [],
    centroids: [],
    k: 3,
    iteration: 0,
    inertiaHistory: [],
    isRunning: false,
    converged: false,
    clusterColors: [
        '#FF5733', // Red-ish
        '#33FF57', // Green-ish
        '#3357FF', // Blue-ish
        '#F3FF33', // Yellow-ish
        '#FF33F3', // Purple-ish
        '#33FFF5', // Cyan-ish
        '#FF8333', // Orange
        '#8D33FF', // Indigo
        '#FF3383', // Pink
        '#83FF33'  // Lime
    ]
};

let chartInstance = null;
let p5Instance = null;

// --- K-Means Logic ---

function initCentroids() {
    state.centroids = [];
    if (state.points.length === 0) return;

    // Pick K random points as initial centroids (Forgy method)
    // Or just random positions within the canvas
    const w = p5Instance.width;
    const h = p5Instance.height;

    for (let i = 0; i < state.k; i++) {
        state.centroids.push({
            x: Math.random() * w,
            y: Math.random() * h,
            color: state.clusterColors[i % state.clusterColors.length]
        });
    }
}

function assignClusters() {
    let changed = false;
    state.points.forEach(point => {
        let minDist = Infinity;
        let bestCluster = -1;

        state.centroids.forEach((c, idx) => {
            const d = (point.x - c.x) ** 2 + (point.y - c.y) ** 2; // Squared distance is enough
            if (d < minDist) {
                minDist = d;
                bestCluster = idx;
            }
        });

        if (point.cluster !== bestCluster) {
            point.cluster = bestCluster;
            changed = true;
        }
    });
    return changed;
}

function updateCentroids() {
    const sums = new Array(state.k).fill(0).map(() => ({ x: 0, y: 0, count: 0 }));

    state.points.forEach(p => {
        if (p.cluster !== -1) {
            sums[p.cluster].x += p.x;
            sums[p.cluster].y += p.y;
            sums[p.cluster].count++;
        }
    });

    let maxMove = 0;

    state.centroids.forEach((c, i) => {
        if (sums[i].count > 0) {
            const newX = sums[i].x / sums[i].count;
            const newY = sums[i].y / sums[i].count;
            const dist = Math.sqrt((c.x - newX) ** 2 + (c.y - newY) ** 2);
            c.x = newX;
            c.y = newY;
            if (dist > maxMove) maxMove = dist;
        }
    });

    return maxMove;
}

function calculateInertia() {
    let totalInertia = 0;
    state.points.forEach(p => {
        if (p.cluster !== -1) {
            const c = state.centroids[p.cluster];
            totalInertia += (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
        }
    });
    return totalInertia;
}

function step() {
    if (state.converged) return;

    state.iteration++;
    assignClusters();
    const move = updateCentroids();
    const inertia = calculateInertia();

    state.inertiaHistory.push(inertia);
    updateChart();
    updateStats();

    // Check for convergence (small movement threshold)
    if (move < 0.1) {
        state.converged = true;
        state.isRunning = false;
        document.getElementById('status-text').innerText = "Converged!";
    }
}

async function runToConvergence() {
    state.isRunning = true;
    document.getElementById('status-text').innerText = "Running...";

    while (state.isRunning && !state.converged) {
        step();
        await new Promise(r => setTimeout(r, 100)); // Animation delay
    }
}

function resetAlgorithm() {
    state.iteration = 0;
    state.inertiaHistory = [];
    state.converged = false;
    state.isRunning = false;
    initCentroids();
    // Reset point assignments
    state.points.forEach(p => p.cluster = -1);

    updateChart();
    updateStats();
    document.getElementById('status-text').innerText = "Ready";
}


// --- P5 Visualization ---

const sketch = (p) => {
    p.setup = () => {
        const container = document.getElementById('canvas-container');
        const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
        canvas.parent('canvas-container');
        p.frameRate(30);
        resetAlgorithm(); // Initial centroids
    };

    p.draw = () => {
        p.background(30);

        // Draw points
        p.noStroke();
        state.points.forEach(pt => {
            if (pt.cluster === -1) {
                p.fill(200); // Unassigned
            } else {
                p.fill(state.clusterColors[pt.cluster % state.clusterColors.length]);
            }
            p.circle(pt.x, pt.y, 10);
        });

        // Draw centroids
        p.stroke(255);
        p.strokeWeight(2);
        state.centroids.forEach((c, i) => {
            p.fill(state.clusterColors[i % state.clusterColors.length]);
            // Draw an X or a larger square
            p.rectMode(p.CENTER);
            p.square(c.x, c.y, 20);
            p.rectMode(p.CORNER);

            // Halo effect
            p.noFill();
            p.stroke(255, 100);
            p.circle(c.x, c.y, 30);
            p.stroke(255);
            p.fill(state.clusterColors[i % state.clusterColors.length]);
        });
    };

    p.mousePressed = () => {
        // Allow adding points if clicking inside canvas
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
            state.points.push({ x: p.mouseX, y: p.mouseY, cluster: -1 });
            // If running, they will get picked up in next step.
            // If not running, they just sit there.
        }
    };

    p.windowResized = () => {
        const container = document.getElementById('canvas-container');
        p.resizeCanvas(container.clientWidth, container.clientHeight);
    };

    p5Instance = p;
};

// --- Chart setup ---
function initChart() {
    const ctx = document.getElementById('loss-chart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Inertia (Total Error)',
                data: [],
                borderColor: '#646cff',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Inertia' }
                },
                x: {
                    title: { display: true, text: 'Iteration' }
                }
            }
        }
    });
}

function updateChart() {
    if (!chartInstance) return;
    chartInstance.data.labels = state.inertiaHistory.map((_, i) => i);
    chartInstance.data.datasets[0].data = state.inertiaHistory;
    chartInstance.update();
}

function updateStats() {
    document.getElementById('stats-iter').innerText = state.iteration;
    const currentInertia = state.inertiaHistory.length > 0 ? state.inertiaHistory[state.inertiaHistory.length - 1] : 0;
    document.getElementById('stats-inertia').innerText = currentInertia.toFixed(2);
}

// --- Presets ---

function generateRandom(p) {
    state.points = [];
    for (let i = 0; i < 100; i++) {
        state.points.push({
            x: Math.random() * p.width,
            y: Math.random() * p.height,
            cluster: -1
        });
    }
    resetAlgorithm();
}

function generateBlobs(p) {
    state.points = [];
    const centers = [
        { x: p.width * 0.3, y: p.height * 0.3 },
        { x: p.width * 0.7, y: p.height * 0.3 },
        { x: p.width * 0.5, y: p.height * 0.7 }
    ];

    centers.forEach(c => {
        for (let i = 0; i < 40; i++) {
            // Box-Muller transform for normal distribution
            const u = 1 - Math.random();
            const v = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            const z2 = Math.sqrt(-2.0 * Math.log(u)) * Math.sin(2.0 * Math.PI * v);

            state.points.push({
                x: c.x + z * 30,
                y: c.y + z2 * 30,
                cluster: -1
            });
        }
    });
    resetAlgorithm();
}

function generateRings(p) {
    state.points = [];
    // Inner ring
    for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2;
        state.points.push({
            x: p.width / 2 + Math.cos(angle) * 50,
            y: p.height / 2 + Math.sin(angle) * 50,
            cluster: -1
        });
    }
    // Outer ring
    for (let i = 0; i < 80; i++) {
        const angle = (i / 80) * Math.PI * 2;
        state.points.push({
            x: p.width / 2 + Math.cos(angle) * 150,
            y: p.height / 2 + Math.sin(angle) * 150,
            cluster: -1
        });
    }
    resetAlgorithm();
}

function generateSmiley(p) {
    state.points = [];
    // Face outline
    for (let i = 0; i < 60; i++) {
        const angle = Math.PI + (i / 60) * Math.PI; // Bottom half arc
        state.points.push({
            x: p.width / 2 + Math.cos(angle) * 100,
            y: p.height / 2 + Math.sin(angle) * 100 - 20,
            cluster: -1
        });
    }
    // Eyes
    for (let i = 0; i < 15; i++) {
        // Left eye
        state.points.push({
            x: p.width / 2 - 40 + (Math.random() - 0.5) * 20,
            y: p.height / 2 - 50 + (Math.random() - 0.5) * 20,
            cluster: -1
        });
        // Right eye
        state.points.push({
            x: p.width / 2 + 40 + (Math.random() - 0.5) * 20,
            y: p.height / 2 - 50 + (Math.random() - 0.5) * 20,
            cluster: -1
        });
    }
    resetAlgorithm();
}


// --- Main Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // Start P5
    new p5(sketch);

    // Init Chart
    initChart();

    // Event Listeners
    document.getElementById('btn-step').addEventListener('click', step);
    document.getElementById('btn-run').addEventListener('click', runToConvergence);
    document.getElementById('btn-reset').addEventListener('click', resetAlgorithm);

    document.getElementById('btn-clear').addEventListener('click', () => {
        state.points = [];
        resetAlgorithm();
    });

    document.getElementById('k-slider').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        state.k = val;
        document.getElementById('k-value').innerText = val;
        resetAlgorithm();
    });

    // Presets
    document.getElementById('preset-random').addEventListener('click', () => generateRandom(p5Instance));
    document.getElementById('preset-blobs').addEventListener('click', () => generateBlobs(p5Instance));
    document.getElementById('preset-rings').addEventListener('click', () => generateRings(p5Instance));
    document.getElementById('preset-smiley').addEventListener('click', () => generateSmiley(p5Instance));
});
