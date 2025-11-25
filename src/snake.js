import './style.css';
import p5 from 'p5';
import Chart from 'chart.js/auto';

console.log('Snake RL script loaded');

const sketch = (p) => {
    // Configuration
    const cols = 20;
    const rows = 20;
    let cellSize;

    // Game State
    let snake = [];
    let food = null;
    let direction = { x: 1, y: 0 }; // Moving right
    let score = 0;
    let highScore = 0;
    let isGameOver = false;

    // RL State
    let isTraining = false;
    let episode = 0;
    let qTable = {}; // State string -> [Q(up), Q(right), Q(down), Q(left)]? 
    // Actually actions are relative: [Straight, Right, Left] to simplify?
    // Let's stick to absolute actions [Up, Right, Down, Left] for simplicity first,
    // but mapping state relative to head is better.
    // Let's use absolute actions: 0: Up, 1: Right, 2: Down, 3: Left

    // Hyperparameters
    let alpha = 0.1;
    let gamma = 0.9;
    let epsilon = 0.1;
    let speed = 1;

    // Chart
    let chart;
    let episodeRewards = [];
    let currentEpisodeReward = 0;

    // DOM Elements
    const btnTrain = document.getElementById('btn-train');
    const btnReset = document.getElementById('btn-reset');
    const btnSave = document.getElementById('btn-save');
    const btnLoad = document.getElementById('btn-load');
    const speedSlider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-val');
    const epsilonSlider = document.getElementById('epsilon-slider');
    const epsilonVal = document.getElementById('epsilon-val');
    const scoreEl = document.getElementById('score-val');
    const highScoreEl = document.getElementById('high-score-val');
    const episodeEl = document.getElementById('episode-val');

    p.setup = () => {
        const container = document.getElementById('snake-canvas-container');
        if (!container) {
            return;
        }

        let w = container.clientWidth || 400;
        let h = container.clientHeight || 400;

        const canvas = p.createCanvas(w, h);
        canvas.parent('snake-canvas-container');

        calculateCellSize();
        resetGame();
        initChart();

        // Event Listeners
        btnTrain.onclick = toggleTraining;
        btnReset.onclick = () => {
            resetGame();
            qTable = {};
            episode = 0;
            episodeRewards = [];
            chart.data.labels = [];
            chart.data.datasets[0].data = [];
            chart.update();
            updateStats();
        };

        btnSave.onclick = savePolicy;
        btnLoad.onclick = loadPolicy;

        speedSlider.oninput = (e) => {
            speed = parseInt(e.target.value);
            speedVal.innerText = speed + 'x';
            p.frameRate(Math.min(60, 10 * speed)); // Cap at 60fps, but logic can run faster
        };

        epsilonSlider.oninput = (e) => {
            epsilon = parseFloat(e.target.value);
            epsilonVal.innerText = epsilon;
        };

        p.frameRate(10);
    };

    p.draw = () => {
        p.background(20);

        // Logic loop (run multiple times if speed is high)
        const steps = speed > 5 ? speed : 1;
        // If speed is low, frameRate handles it. If speed is high, we loop logic.
        // Actually p5 frameRate is capped by screen refresh.
        // Better:
        if (isTraining) {
            for (let i = 0; i < steps; i++) {
                gameStep();
                if (!isTraining) break;
            }
        } else {
            // Manual play or paused
            // For manual play we need slower updates
            if (p.frameCount % Math.max(1, Math.floor(10 / speed)) === 0) {
                // gameStep(); // Manual play not implemented yet, just RL
            }
        }

        drawGrid();
        drawSnake();
        drawFood();
    };

    p.windowResized = () => {
        const container = document.getElementById('snake-canvas-container');
        p.resizeCanvas(container.clientWidth, container.clientHeight);
        calculateCellSize();
    };

    function calculateCellSize() {
        cellSize = Math.min(p.width / cols, p.height / rows);
    }

    function resetGame() {
        snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        direction = { x: 1, y: 0 };
        score = 0;
        currentEpisodeReward = 0;
        isGameOver = false;
        spawnFood();
        updateStats();
    }

    function spawnFood() {
        let valid = false;
        while (!valid) {
            food = {
                x: Math.floor(Math.random() * cols),
                y: Math.floor(Math.random() * rows)
            };
            // Check if food is on snake
            valid = !snake.some(part => part.x === food.x && part.y === food.y);
        }
    }

    function toggleTraining() {
        isTraining = !isTraining;
        btnTrain.innerText = isTraining ? "Pause Training" : "Start Training";
        btnTrain.classList.toggle('primary');
        btnTrain.classList.toggle('secondary');
    }

    // --- RL Logic ---

    function getState() {
        // Simplified State:
        // 1. Danger [Straight, Right, Left]
        // 2. Food Direction [Left, Right, Up, Down]

        const head = snake[0];

        // Helper to check collision
        const isCollision = (pt) => {
            // Walls
            if (pt.x < 0 || pt.x >= cols || pt.y < 0 || pt.y >= rows) return true;
            // Self (ignore tail as it will move, but simpler to just check all)
            // Actually tail moves, so collision with last segment is impossible unless length 2?
            // Let's just check body.
            for (let i = 0; i < snake.length - 1; i++) {
                if (pt.x === snake[i].x && pt.y === snake[i].y) return true;
            }
            return false;
        };

        // Relative directions
        // Current dir: direction
        // Right turn: { x: -direction.y, y: direction.x }
        // Left turn: { x: direction.y, y: -direction.x }

        const straightPt = { x: head.x + direction.x, y: head.y + direction.y };
        const rightPt = { x: head.x - direction.y, y: head.y + direction.x };
        const leftPt = { x: head.x + direction.y, y: head.y - direction.x };

        const dangerStraight = isCollision(straightPt) ? 1 : 0;
        const dangerRight = isCollision(rightPt) ? 1 : 0;
        const dangerLeft = isCollision(leftPt) ? 1 : 0;

        // Food direction relative to head (absolute)
        const foodLeft = food.x < head.x ? 1 : 0;
        const foodRight = food.x > head.x ? 1 : 0;
        const foodUp = food.y < head.y ? 1 : 0;
        const foodDown = food.y > head.y ? 1 : 0;

        return `${dangerStraight}${dangerRight}${dangerLeft}${foodLeft}${foodRight}${foodUp}${foodDown}`;
    }

    function getAction(state) {
        // Actions: 0: Straight, 1: Right, 2: Left (Relative actions are easier for state mapping)
        // Let's use relative actions!

        if (!qTable[state]) {
            qTable[state] = [0, 0, 0]; // [Straight, Right, Left]
        }

        if (Math.random() < epsilon) {
            return Math.floor(Math.random() * 3);
        } else {
            // Argmax
            let maxVal = Math.max(...qTable[state]);
            // Random tie-breaking
            let bestActions = [];
            qTable[state].forEach((val, idx) => {
                if (val === maxVal) bestActions.push(idx);
            });
            return bestActions[Math.floor(Math.random() * bestActions.length)];
        }
    }

    function gameStep() {
        if (isGameOver) {
            episode++;
            episodeRewards.push(currentEpisodeReward);
            updateChart();
            resetGame();
            return;
        }

        const state = getState();
        const action = getAction(state); // 0: Straight, 1: Right, 2: Left

        // Perform Action
        let oldDir = { ...direction };
        if (action === 1) { // Turn Right
            direction = { x: -oldDir.y, y: oldDir.x };
        } else if (action === 2) { // Turn Left
            direction = { x: oldDir.y, y: -oldDir.x };
        }
        // action 0 is straight, no change

        // Move
        const head = snake[0];
        const newHead = { x: head.x + direction.x, y: head.y + direction.y };

        // Check Collision (Death)
        let reward = 0;
        let done = false;

        // Wall or Self collision
        if (newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows ||
            snake.some(part => part.x === newHead.x && part.y === newHead.y)) {
            reward = -10;
            done = true;
            isGameOver = true;
        } else {
            // Move snake
            snake.unshift(newHead);

            // Check Food
            if (newHead.x === food.x && newHead.y === food.y) {
                score++;
                if (score > highScore) highScore = score;
                reward = 10;
                spawnFood();
            } else {
                snake.pop(); // Remove tail
                reward = -0.1; // Step penalty to encourage efficiency? Or 0?
                // Small penalty encourages finding food faster.
            }
        }

        currentEpisodeReward += reward;

        // Q-Learning Update
        const nextState = done ? null : getState(); // If done, next state doesn't matter (terminal)
        const oldQ = qTable[state][action];
        let maxNextQ = 0;
        if (!done) {
            if (!qTable[nextState]) qTable[nextState] = [0, 0, 0];
            maxNextQ = Math.max(...qTable[nextState]);
        }

        // Bellman Equation
        const newQ = oldQ + alpha * (reward + gamma * maxNextQ - oldQ);
        qTable[state][action] = newQ;

        updateStats();
    }

    // --- Visualization ---

    function drawGrid() {
        p.stroke(30);
        p.noFill();
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                p.rect(i * cellSize, j * cellSize, cellSize, cellSize);
            }
        }
    }

    function drawSnake() {
        // Body
        p.noStroke();
        p.fill(0, 242, 255); // Cyan
        for (let i = 1; i < snake.length; i++) {
            p.rect(snake[i].x * cellSize, snake[i].y * cellSize, cellSize, cellSize);
        }

        // Head
        p.fill(255, 255, 255);
        p.rect(snake[0].x * cellSize, snake[0].y * cellSize, cellSize, cellSize);
    }

    function drawFood() {
        p.fill(255, 77, 77); // Red
        p.rect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
    }

    function updateStats() {
        scoreEl.innerText = score;
        highScoreEl.innerText = highScore;
        episodeEl.innerText = episode;
    }

    function initChart() {
        const ctx = document.getElementById('reward-chart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Episode Reward',
                    data: [],
                    borderColor: 'rgb(0, 242, 255)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
    }

    function updateChart() {
        if (episode % 10 === 0) { // Update every 10 episodes to save performance
            chart.data.labels.push(episode);
            chart.data.datasets[0].data.push(currentEpisodeReward);

            if (chart.data.labels.length > 50) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            chart.update();
        }
    }
    // --- Policy Management ---

    function savePolicy() {
        try {
            const data = {
                qTable: qTable,
                episode: episode,
                highScore: highScore
            };
            localStorage.setItem('snake_rl_policy', JSON.stringify(data));
            console.log('Policy Saved!');
            showNotification('Policy Saved!', 'good');
        } catch (e) {
            console.error('Save failed:', e);
            showNotification('Save Failed!', 'bad');
        }
    }

    function loadPolicy() {
        try {
            const dataStr = localStorage.getItem('snake_rl_policy');
            if (!dataStr) {
                showNotification('No Saved Policy', 'bad');
                return;
            }
            const data = JSON.parse(dataStr);
            if (data.qTable) {
                qTable = data.qTable;
                episode = data.episode || 0;
                highScore = data.highScore || 0;
                console.log('Policy Loaded!');
                showNotification('Policy Loaded!', 'good');
                updateStats();
            } else {
                throw new Error('Invalid policy data');
            }
        } catch (e) {
            console.error('Load failed:', e);
            showNotification('Load Failed!', 'bad');
        }
    }

    let notification = { message: '', timer: 0, color: 'white' };

    function showNotification(msg, type) {
        notification.message = msg;
        notification.timer = 120; // 2 seconds at 60fps
        if (type === 'good') notification.color = '#00ff9d';
        else if (type === 'bad') notification.color = '#ff4d4d';
        else notification.color = 'white';
    }

    // Hook into draw to show notification
    const originalDraw = p.draw;
    p.draw = () => {
        originalDraw();

        if (notification.timer > 0) {
            p.push();
            p.fill(0, 0, 0, 200);
            p.noStroke();
            p.rectMode(p.CENTER);
            p.rect(p.width / 2, p.height / 2, 300, 60, 10);

            p.fill(notification.color);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(24);
            p.text(notification.message, p.width / 2, p.height / 2);
            p.pop();

            notification.timer--;
        }
    };
};

const initP5 = () => {
    const container = document.getElementById('snake-canvas-container');
    if (container) {
        new p5(sketch, 'snake-canvas-container');
    }
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initP5();
} else {
    document.addEventListener('DOMContentLoaded', initP5);
}
