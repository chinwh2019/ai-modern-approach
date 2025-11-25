import './style.css';
import p5 from 'p5';
import Chart from 'chart.js/auto';

console.log('RL script loaded');

// Chart Setup
const ctx = document.getElementById('reward-chart').getContext('2d');
const rewardChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Total Reward per Episode',
            data: [],
            borderColor: '#00f2ff',
            backgroundColor: 'rgba(0, 242, 255, 0.1)',
            tension: 0.1,
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255,255,255,0.1)' },
                ticks: { color: '#94a3b8' }
            },
            x: {
                grid: { color: 'rgba(255,255,255,0.1)' },
                ticks: { color: '#94a3b8' }
            }
        },
        plugins: {
            legend: { labels: { color: '#e0e6ed' } }
        }
    }
});

const sketch = (p) => {
    // Configuration
    const cols = 10;
    const rows = 10;
    let cellSize;
    let grid = [];
    let agent = { col: 0, row: 0 };
    const goal = { col: 9, row: 9 };
    const holes = [
        { col: 1, row: 2 }, { col: 2, row: 2 }, { col: 3, row: 2 },
        { col: 5, row: 5 }, { col: 6, row: 5 }, { col: 4, row: 8 },
        { col: 8, row: 1 }, { col: 8, row: 2 }
    ];

    // RL Params
    let qTable = {}; // Key: "col,row", Value: {0:val, 1:val, 2:val, 3:val} (Up, Right, Down, Left)
    let vTable = {}; // Key: "col,row", Value: val
    let alpha = 0.1;
    let gamma = 0.9;
    let epsilon = 0.1;
    let method = 'qlearning'; // 'qlearning' or 'valueiteration'

    // State
    let isRunning = false;
    let episode = 0;
    let episodeReward = 0;
    let steps = 0;
    const maxSteps = 100;

    // DOM Elements
    const btnTrain = document.getElementById('btn-train');
    const btnTest = document.getElementById('btn-test');
    const btnReset = document.getElementById('btn-reset');
    const btnStep = document.getElementById('btn-step');
    const btnSave = document.getElementById('btn-save');
    const btnLoad = document.getElementById('btn-load');
    const inspectorBox = document.getElementById('inspector-box');
    const inspectorContent = document.getElementById('inspector-content');
    const methodSelect = document.getElementById('method-select');
    const alphaSlider = document.getElementById('alpha-slider');
    const epsilonSlider = document.getElementById('epsilon-slider');

    const speedSlider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-val');
    let stepsPerFrame = 1;
    let isTesting = false;

    // Notification State
    let notification = {
        message: "",
        timer: 0,
        color: [0, 0, 0]
    };

    p.setup = () => {
        const container = document.getElementById('rl-canvas-container');
        const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
        canvas.parent('rl-canvas-container');

        calculateCellSize();
        resetGrid();
        initTables();

        // Event Listeners
        btnTrain.onclick = toggleTrain;
        btnTest.onclick = toggleTest;
        btnStep.onclick = singleStep;
        btnReset.onclick = resetSimulation;
        btnSave.onclick = savePolicy;
        btnLoad.onclick = loadPolicy;

        methodSelect.onchange = (e) => {
            method = e.target.value;
            resetSimulation();
        };
        alphaSlider.oninput = (e) => alpha = parseFloat(e.target.value);
        epsilonSlider.oninput = (e) => epsilon = parseFloat(e.target.value);

        speedSlider.oninput = (e) => {
            stepsPerFrame = parseInt(e.target.value);
            speedVal.innerText = stepsPerFrame + 'x';
        };
    };

    p.mouseMoved = () => {
        const col = Math.floor(p.mouseX / cellSize);
        const row = Math.floor(p.mouseY / cellSize);

        if (col >= 0 && col < cols && row >= 0 && row < rows) {
            inspectorBox.style.display = 'block';
            const key = `${col},${row}`;

            if (method === 'qlearning') {
                const q = qTable[key];
                inspectorContent.innerHTML = `
                    <strong>State (${col},${row})</strong><br>
                    Up: ${q[0].toFixed(2)}<br>
                    Right: ${q[1].toFixed(2)}<br>
                    Down: ${q[2].toFixed(2)}<br>
                    Left: ${q[3].toFixed(2)}
                `;
            } else {
                const v = vTable[key];
                inspectorContent.innerHTML = `
                    <strong>State (${col},${row})</strong><br>
                    Value: ${v.toFixed(2)}
                `;
            }
        } else {
            inspectorBox.style.display = 'none';
        }
    };

    p.draw = () => {
        p.background(20);

        if (isRunning) {
            // Speed up training by running multiple steps per frame
            // For Value Iteration, usually 1 step is enough per frame as it sweeps whole grid
            // But user might want to speed up convergence if grid is huge (not here)
            // Let's apply speed to Q-Learning mainly, or both.
            const loops = method === 'valueiteration' ? 1 : stepsPerFrame;

            for (let i = 0; i < loops; i++) {
                if (method === 'qlearning') {
                    stepQLearning();
                } else {
                    stepValueIteration();
                }
            }
        }

        drawGrid();
        drawAgent();

        // Status Overlay
        if (isTesting) {
            p.fill(0, 255, 0);
            p.noStroke();
            p.textSize(16);
            p.textAlign(p.LEFT, p.TOP);
            p.text("TESTING MODE", 10, 10);
        }

        // Notification Overlay
        if (notification.timer > 0) {
            p.push();
            p.translate(p.width / 2, p.height / 2);
            p.noStroke();
            p.fill(0, 0, 0, 200);
            p.rectMode(p.CENTER);
            p.rect(0, 0, 300, 100, 10);

            p.fill(notification.color);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(32);
            p.text(notification.message, 0, 0);
            p.pop();

            notification.timer--;
        }
    };

    p.windowResized = () => {
        const container = document.getElementById('rl-canvas-container');
        p.resizeCanvas(container.clientWidth, container.clientHeight);
        calculateCellSize();
    };

    function calculateCellSize() {
        cellSize = Math.min(p.width / cols, p.height / rows);
    }

    function resetGrid() {
        grid = [];
        for (let i = 0; i < cols; i++) {
            grid[i] = [];
            for (let j = 0; j < rows; j++) {
                let type = 'empty';
                if (i === goal.col && j === goal.row) type = 'goal';
                else if (holes.some(h => h.col === i && h.row === j)) type = 'hole';

                grid[i][j] = {
                    col: i,
                    row: j,
                    type: type
                };
            }
        }
    }

    function initTables() {
        qTable = {};
        vTable = {};
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const key = `${i},${j}`;
                qTable[key] = [0, 0, 0, 0]; // Up, Right, Down, Left
                vTable[key] = 0;
            }
        }
    }

    function resetSimulation() {
        isRunning = false;
        isTesting = false;
        notification.timer = 0;
        btnTrain.innerText = "Start Training";
        btnTest.innerText = "Test Policy";
        episode = 0;
        episodeReward = 0;
        steps = 0;
        agent = { col: 0, row: 0 };
        initTables();
        rewardChart.data.labels = [];
        rewardChart.data.datasets[0].data = [];
        rewardChart.update();
    }

    function toggleTrain() {
        if (isTesting) {
            isTesting = false;
            btnTest.innerText = "Test Policy";
        }
        isRunning = !isRunning;
        btnTrain.innerText = isRunning ? "Pause" : "Resume";
    }

    function toggleTest() {
        isTesting = !isTesting;
        if (isTesting) {
            isRunning = true;
            btnTrain.innerText = "Pause"; // Or disable?
            btnTest.innerText = "Stop Testing";
            // Reset agent to start for testing
            agent = { col: 0, row: 0 };
        } else {
            isRunning = false;
            btnTrain.innerText = "Resume";
            btnTest.innerText = "Test Policy";
        }
    }

    function savePolicy() {
        try {
            const data = {
                qTable: qTable,
                vTable: vTable,
                method: method
            };
            localStorage.setItem('rl_policy', JSON.stringify(data));
            console.log('Policy Saved!');
            showNotification('Policy Saved!', 'good');
        } catch (e) {
            console.error('Save failed:', e);
            showNotification('Save Failed!', 'bad');
        }
    }

    function loadPolicy() {
        try {
            const dataStr = localStorage.getItem('rl_policy');
            if (!dataStr) {
                showNotification('No Saved Policy', 'bad');
                return;
            }
            const data = JSON.parse(dataStr);
            if (data.qTable && data.vTable) {
                qTable = data.qTable;
                vTable = data.vTable;
                console.log('Policy Loaded!');
                showNotification('Policy Loaded!', 'good');
                p.redraw();
            } else {
                throw new Error('Invalid policy data');
            }
        } catch (e) {
            console.error('Load failed:', e);
            showNotification('Load Failed!', 'bad');
        }
    }

    function singleStep() {
        isRunning = false;
        btnTrain.innerText = "Resume";
        if (method === 'qlearning') {
            stepQLearning();
        } else {
            stepValueIteration();
        }
    }

    function showNotification(msg, type) {
        // Only show if speed is 1x (Debug Mode) OR if manually stepping (isRunning false)
        // Actually, if isRunning is true and stepsPerFrame > 1, we skip.
        if (isRunning && stepsPerFrame > 1) return;

        notification.message = msg;
        notification.timer = 60; // 1 second at 60fps
        if (type === 'good') notification.color = [50, 255, 50];
        else notification.color = [255, 50, 50];
    }

    function stepQLearning() {
        // 1. Choose Action
        const stateKey = `${agent.col},${agent.row}`;
        let action; // 0: Up, 1: Right, 2: Down, 3: Left

        // If Testing, pure greedy. If Training, Epsilon-Greedy
        const effectiveEpsilon = isTesting ? 0 : epsilon;

        if (Math.random() < effectiveEpsilon) {
            action = Math.floor(Math.random() * 4);
        } else {
            // Argmax Q
            let maxQ = -Infinity;
            let bestActions = [];
            for (let a = 0; a < 4; a++) {
                if (qTable[stateKey][a] > maxQ) {
                    maxQ = qTable[stateKey][a];
                    bestActions = [a];
                } else if (qTable[stateKey][a] === maxQ) {
                    bestActions.push(a);
                }
            }
            action = bestActions[Math.floor(Math.random() * bestActions.length)];
        }

        // 2. Take Action & Observe Reward/Next State
        let nextCol = agent.col;
        let nextRow = agent.row;

        if (action === 0) nextRow--;
        if (action === 1) nextCol++;
        if (action === 2) nextRow++;
        if (action === 3) nextCol--;

        // Boundary checks
        if (nextCol < 0) nextCol = 0;
        if (nextCol >= cols) nextCol = cols - 1;
        if (nextRow < 0) nextRow = 0;
        if (nextRow >= rows) nextRow = rows - 1;

        let reward = -0.1; // Step cost
        let done = false;

        // Check Hole
        if (holes.some(h => h.col === nextCol && h.row === nextRow)) {
            reward = -10;
            done = true;
            showNotification("FAILED!", "bad");
        }
        // Check Goal
        else if (nextCol === goal.col && nextRow === goal.row) {
            reward = 10;
            done = true;
            showNotification("GOAL!", "good");
        }

        // 3. Update Q-Table (ONLY IF NOT TESTING)
        if (!isTesting) {
            const nextKey = `${nextCol},${nextRow}`;
            const maxNextQ = Math.max(...qTable[nextKey]);
            qTable[stateKey][action] += alpha * (reward + gamma * maxNextQ - qTable[stateKey][action]);
        }

        // Update Agent
        agent = { col: nextCol, row: nextRow };
        episodeReward += reward;
        steps++;

        if (done || steps >= maxSteps) {
            // End Episode
            if (!isTesting) {
                updateChart(episode, episodeReward);
                episode++;
            }
            agent = { col: 0, row: 0 };
            episodeReward = 0;
            steps = 0;
        }
    }

    function stepValueIteration() {
        // If testing, VI doesn't really "step" in the same way, it just moves the agent
        // But let's assume VI testing means "Move Agent Greedily" without updating V

        if (!isTesting) {
            // One sweep over all states
            let delta = 0;
            const newV = {};

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const key = `${i},${j}`;

                    // Skip terminal states (Goal/Holes) in update, but they have fixed values
                    if (i === goal.col && j === goal.row) { newV[key] = 0; continue; }
                    if (holes.some(h => h.col === i && h.row === j)) { newV[key] = 0; continue; }

                    let maxVal = -Infinity;

                    // Try all 4 actions
                    const actions = [
                        { dc: 0, dr: -1 }, { dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }
                    ];

                    for (let a = 0; a < 4; a++) {
                        let nextCol = i + actions[a].dc;
                        let nextRow = j + actions[a].dr;

                        // Boundary
                        if (nextCol < 0) nextCol = 0;
                        if (nextCol >= cols) nextCol = cols - 1;
                        if (nextRow < 0) nextRow = 0;
                        if (nextRow >= rows) nextRow = rows - 1;

                        let reward = -0.1;
                        if (holes.some(h => h.col === nextCol && h.row === nextRow)) reward = -10;
                        else if (nextCol === goal.col && nextRow === goal.row) reward = 10;

                        const nextKey = `${nextCol},${nextRow}`;
                        let val = reward + gamma * vTable[nextKey];
                        if (val > maxVal) maxVal = val;
                    }

                    newV[key] = maxVal;
                    if (Math.abs(newV[key] - vTable[key]) > delta) delta = Math.abs(newV[key] - vTable[key]);
                }
            }
            vTable = newV;
        }

        // Visualize Policy via Agent moving greedily ONLY if testing
        if (isTesting) {
            moveAgentGreedy();
        }
    }

    function moveAgentGreedy() {
        const actions = [{ dc: 0, dr: -1 }, { dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }];
        let bestAction = -1;
        let maxVal = -Infinity;

        for (let a = 0; a < 4; a++) {
            let nextCol = agent.col + actions[a].dc;
            let nextRow = agent.row + actions[a].dr;

            if (nextCol < 0) nextCol = 0;
            if (nextCol >= cols) nextCol = cols - 1;
            if (nextRow < 0) nextRow = 0;
            if (nextRow >= rows) nextRow = rows - 1;

            const nextKey = `${nextCol},${nextRow}`;
            let val = vTable[nextKey];
            let reward = -0.1;
            if (holes.some(h => h.col === nextCol && h.row === nextRow)) reward = -10;
            else if (nextCol === goal.col && nextRow === goal.row) reward = 10;

            let q = reward + gamma * val;
            if (q > maxVal) {
                maxVal = q;
                bestAction = a;
            }
        }

        if (bestAction !== -1) {
            let nextCol = agent.col + actions[bestAction].dc;
            let nextRow = agent.row + actions[bestAction].dr;

            if (nextCol < 0) nextCol = 0;
            if (nextCol >= cols) nextCol = cols - 1;
            if (nextRow < 0) nextRow = 0;
            if (nextRow >= rows) nextRow = rows - 1;

            agent = { col: nextCol, row: nextRow };

            if (holes.some(h => h.col === nextCol && h.row === nextRow)) {
                showNotification("FAILED!", "bad");
                agent = { col: 0, row: 0 }; // Reset
            } else if (nextCol === goal.col && nextRow === goal.row) {
                showNotification("GOAL!", "good");
                agent = { col: 0, row: 0 }; // Reset
            }
        }
    }

    function updateChart(ep, rew) {
        rewardChart.data.labels.push(ep);
        rewardChart.data.datasets[0].data.push(rew);
        if (rewardChart.data.labels.length > 50) {
            rewardChart.data.labels.shift();
            rewardChart.data.datasets[0].data.shift();
        }
        rewardChart.update();
    }

    function drawGrid() {
        p.stroke(40);
        p.strokeWeight(1);

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const x = i * cellSize;
                const y = j * cellSize;
                const key = `${i},${j}`;

                // Reset stroke for every cell
                p.stroke(40);
                p.strokeWeight(1);

                // Check for special cells
                let isSpecial = false;
                if (i === goal.col && j === goal.row) {
                    p.fill(50, 200, 50); // Green Goal
                    p.rect(x, y, cellSize, cellSize);
                    p.fill(255);
                    p.noStroke();
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(16);
                    p.text("GOAL", x + cellSize / 2, y + cellSize / 2);
                    isSpecial = true;
                } else if (holes.some(h => h.col === i && h.row === j)) {
                    p.fill(200, 50, 50); // Red Hole
                    p.rect(x, y, cellSize, cellSize);
                    p.fill(255);
                    p.noStroke();
                    p.textAlign(p.CENTER, p.CENTER);
                    p.textSize(20);
                    p.text("☠️", x + cellSize / 2, y + cellSize / 2);
                    isSpecial = true;
                }

                if (!isSpecial) {
                    if (method === 'qlearning') {
                        // Draw 4 Triangles
                        const q = qTable[key];
                        const cx = x + cellSize / 2;
                        const cy = y + cellSize / 2;

                        // Up
                        p.fill(getColor(q[0]));
                        p.triangle(x, y, x + cellSize, y, cx, cy);

                        // Right
                        p.fill(getColor(q[1]));
                        p.triangle(x + cellSize, y, x + cellSize, y + cellSize, cx, cy);

                        // Down
                        p.fill(getColor(q[2]));
                        p.triangle(x + cellSize, y + cellSize, x, y + cellSize, cx, cy);

                        // Left
                        p.fill(getColor(q[3]));
                        p.triangle(x, y + cellSize, x, y, cx, cy);

                        // Borders
                        p.stroke(0, 0, 0, 50);
                        p.line(x, y, x + cellSize, y + cellSize);
                        p.line(x + cellSize, y, x, y + cellSize);
                    } else {
                        // Value Iteration (Single Rect)
                        const v = vTable[key];
                        p.fill(getColor(v));
                        p.rect(x, y, cellSize, cellSize);
                    }
                }
            }
        }
    }

    function drawAgent() {
        const x = agent.col * cellSize;
        const y = agent.row * cellSize;
        p.fill(0, 242, 255); // Cyan Agent
        p.noStroke();
        p.circle(x + cellSize / 2, y + cellSize / 2, cellSize * 0.5);
    }

    function getColor(val) {
        // Map -10 to 10 to Red-Green
        let n = p.map(val, -10, 10, 0, 1);
        n = p.constrain(n, 0, 1);
        return p.lerpColor(p.color(255, 50, 50), p.color(50, 255, 50), n);
    }
};

new p5(sketch);
