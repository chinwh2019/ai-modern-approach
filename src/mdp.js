import './style.css';
import p5 from 'p5';
import katex from 'katex';

import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';

console.log('MDP p5.js script loaded');

// Auto-render LaTeX in text
renderMathInElement(document.body, {
    delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false }
    ]
});

// Render Bellman Equation (Keep this for specific control if needed, or rely on auto-render if we put text in HTML)
katex.render("V(s) = \\max_a \\sum_{s'} P(s'|s,a) [R(s,a,s') + \\gamma V(s')]", document.getElementById('bellman-eq'), {
    throwOnError: false,
    displayMode: true,
    color: '#e0e6ed'
});

const sketch = (p) => {
    // Configuration
    const cols = 8;
    const rows = 6;
    let cellSize;
    let grid = [];
    let gamma = 0.9;
    let currentTerrain = 'empty';

    // Simulation State
    let agent = null; // {col, row}
    let isSimulating = false;
    let isManual = false;
    let simInterval = null;

    // UI Elements
    const gammaSlider = document.getElementById('gamma-slider');
    const gammaVal = document.getElementById('gamma-val');
    const btnReset = document.getElementById('btn-reset-mdp');
    const btnRunPolicy = document.getElementById('btn-run-policy');
    const btnManual = document.getElementById('btn-manual-mode');
    const simStatus = document.getElementById('sim-status');
    const terrainBtns = document.querySelectorAll('.btn-terrain');

    p.setup = () => {
        const container = document.getElementById('mdp-viz');
        // Clear previous content (like the D3 svg if it existed)
        container.innerHTML = '';

        const canvas = p.createCanvas(container.clientWidth || 800, container.clientHeight || 600);
        canvas.parent('mdp-viz');

        calculateCellSize();
        initGrid();

        // Event Listeners
        gammaSlider.oninput = (e) => {
            gamma = parseFloat(e.target.value);
            gammaVal.innerText = gamma;
            runValueIteration();
        };

        btnReset.onclick = initGrid;
        btnRunPolicy.onclick = startSimulation;
        btnManual.onclick = startManualMode;

        terrainBtns.forEach(btn => {
            btn.onclick = () => {
                terrainBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTerrain = btn.dataset.type;
            };
        });
    };

    p.draw = () => {
        p.background(20);
        drawGrid();
        drawAgent();
    };

    p.windowResized = () => {
        const container = document.getElementById('mdp-viz');
        p.resizeCanvas(container.clientWidth, container.clientHeight);
        calculateCellSize();
    };

    p.mousePressed = () => {
        const col = Math.floor(p.mouseX / cellSize);
        const row = Math.floor(p.mouseY / cellSize);

        if (col >= 0 && col < cols && row >= 0 && row < rows) {
            // Edit Terrain
            grid[col][row].type = currentTerrain;
            runValueIteration();
        }
    };

    // Manual Input (Global Listener)
    window.addEventListener('keydown', (e) => {
        if (!isManual || !agent) return;

        let action = null;
        if (e.key === 'ArrowUp') action = { dx: 0, dy: -1 };
        if (e.key === 'ArrowRight') action = { dx: 1, dy: 0 };
        if (e.key === 'ArrowDown') action = { dx: 0, dy: 1 };
        if (e.key === 'ArrowLeft') action = { dx: -1, dy: 0 };

        if (action) {
            e.preventDefault(); // Prevent scrolling
            executeAction(action);
        }
    });

    function calculateCellSize() {
        // Center grid logic
        // We want to fit cols*rows into width*height
        // But let's just fill the canvas for now or keep aspect ratio
        cellSize = Math.min(p.width / cols, p.height / rows);
    }

    function initGrid() {
        stopSimulation();
        grid = [];
        for (let i = 0; i < cols; i++) {
            grid[i] = [];
            for (let j = 0; j < rows; j++) {
                grid[i][j] = {
                    col: i,
                    row: j,
                    type: 'empty', // empty, ice, fire, gold
                    v: 0,
                    policy: null // {dx, dy}
                };
            }
        }

        // Default Scenario
        grid[cols - 1][0].type = 'gold';
        grid[cols - 1][1].type = 'fire';
        grid[2][2].type = 'ice';

        runValueIteration();
    }

    function runValueIteration() {
        // Reset V
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                if (isTerminal(grid[i][j])) {
                    grid[i][j].v = getReward(grid[i][j]);
                } else {
                    grid[i][j].v = 0;
                }
            }
        }

        let delta = 0;
        for (let k = 0; k < 100; k++) { // Max iterations
            delta = 0;
            const newV = [];

            // Copy current V
            for (let i = 0; i < cols; i++) {
                newV[i] = [];
                for (let j = 0; j < rows; j++) {
                    newV[i][j] = grid[i][j].v;
                }
            }

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    if (isTerminal(grid[i][j])) continue;

                    let maxVal = -Infinity;
                    let bestAction = null;

                    const actions = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];

                    for (let action of actions) {
                        let val = calculateQ(i, j, action);
                        if (val > maxVal) {
                            maxVal = val;
                            bestAction = action;
                        }
                    }

                    if (Math.abs(newV[i][j] - maxVal) > delta) delta = Math.abs(newV[i][j] - maxVal);
                    newV[i][j] = maxVal;
                    grid[i][j].policy = bestAction;
                }
            }

            // Update Grid V
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    grid[i][j].v = newV[i][j];
                }
            }

            if (delta < 0.001) break;
        }
    }

    function calculateQ(col, row, action) {
        const cell = grid[col][row];
        let transitions = [];

        if (cell.type === 'ice') {
            // Slippery!
            transitions.push({ prob: 0.5, dx: action.dx, dy: action.dy });
            transitions.push({ prob: 0.25, dx: -action.dy, dy: action.dx });
            transitions.push({ prob: 0.25, dx: action.dy, dy: -action.dx });
        } else {
            transitions.push({ prob: 1.0, dx: action.dx, dy: action.dy });
        }

        let qVal = 0;

        for (let t of transitions) {
            let nextCol = col + t.dx;
            let nextRow = row + t.dy;

            // Boundary Check: Bounce back
            if (nextCol < 0 || nextCol >= cols || nextRow < 0 || nextRow >= rows) {
                nextCol = col;
                nextRow = row;
            }

            const nextCell = grid[nextCol][nextRow];
            const reward = getReward(nextCell);

            let targetV = nextCell.v;
            if (isTerminal(nextCell)) targetV = 0;

            qVal += t.prob * (reward + gamma * targetV);
        }

        return qVal;
    }

    function getReward(cell) {
        if (cell.type === 'fire') return -50;
        if (cell.type === 'gold') return 50;
        return -1; // Step cost
    }

    function isTerminal(cell) {
        return cell.type === 'fire' || cell.type === 'gold';
    }

    function startSimulation() {
        if (isSimulating) return;
        isSimulating = true;
        isManual = false;
        agent = { col: 0, row: rows - 1 };
        simStatus.innerText = "Running Policy...";

        if (simInterval) clearInterval(simInterval);
        simInterval = setInterval(stepSimulation, 500);
    }

    function startManualMode() {
        stopSimulation();
        isManual = true;
        agent = { col: 0, row: rows - 1 };
        simStatus.innerText = "Manual Mode: Use Arrow Keys";
        // p5 handles key events globally on the canvas
    }

    function stopSimulation() {
        isSimulating = false;
        isManual = false;
        agent = null;
        if (simInterval) clearInterval(simInterval);
        simStatus.innerText = "Ready";
    }

    function stepSimulation() {
        if (!agent) return;

        const cell = grid[agent.col][agent.row];
        if (isTerminal(cell)) {
            simStatus.innerText = `Finished! Reward: ${getReward(cell)}`;
            isSimulating = false;
            clearInterval(simInterval);
            return;
        }

        const action = cell.policy;
        if (!action) return;

        executeAction(action);
    }

    function executeAction(action) {
        const cell = grid[agent.col][agent.row];
        let actualDx = action.dx;
        let actualDy = action.dy;
        let msg = "";

        if (cell.type === 'ice') {
            const r = Math.random();
            if (r < 0.5) {
                // Intended
            } else if (r < 0.75) {
                actualDx = -action.dy;
                actualDy = action.dx;
                msg = " (Slipped!)";
            } else {
                actualDx = action.dy;
                actualDy = -action.dx;
                msg = " (Slipped!)";
            }
        }

        let nextCol = agent.col + actualDx;
        let nextRow = agent.row + actualDy;

        if (nextCol < 0 || nextCol >= cols || nextRow < 0 || nextRow >= rows) {
            nextCol = agent.col;
            nextRow = agent.row;
            msg += " (Bumped Wall)";
        }

        agent = { col: nextCol, row: nextRow };
        simStatus.innerText = isManual ? `Moved${msg}` : `Running Policy${msg}`;

        const nextCell = grid[agent.col][agent.row];
        if (isTerminal(nextCell)) {
            simStatus.innerText = `Finished! Reward: ${getReward(nextCell)}`;
            if (isSimulating) {
                isSimulating = false;
                clearInterval(simInterval);
            }
        }
    }

    function drawGrid() {
        p.stroke(40);
        p.strokeWeight(1);

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const x = i * cellSize;
                const y = j * cellSize;
                const cell = grid[i][j];

                // Draw Cell Background
                if (cell.type === 'fire') {
                    p.fill(255, 77, 77);
                } else if (cell.type === 'gold') {
                    p.fill(255, 189, 0);
                } else if (cell.type === 'ice') {
                    p.fill(165, 243, 252);
                } else {
                    // Heatmap
                    const maxV = 50;
                    const minV = -50;
                    let norm = (cell.v - minV) / (maxV - minV);
                    norm = p.constrain(norm, 0, 1);
                    // Grey scale
                    let c = p.lerpColor(p.color(30), p.color(200), norm);
                    p.fill(c);
                }

                if (cell.type === 'ice') {
                    p.stroke(0, 242, 255);
                    p.strokeWeight(2);
                } else {
                    p.stroke(40);
                    p.strokeWeight(1);
                }

                p.rect(x, y, cellSize, cellSize, 4);

                // Draw Icons
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(20);
                p.fill(255);
                p.noStroke();
                if (cell.type === 'fire') p.text('🔥', x + cellSize / 2, y + cellSize / 2);
                if (cell.type === 'gold') p.text('🏆', x + cellSize / 2, y + cellSize / 2);
                if (cell.type === 'ice') p.text('❄️', x + cellSize / 2, y + cellSize / 2);

                // Draw Policy Arrow
                if (!isTerminal(cell) && cell.policy) {
                    drawArrow(x + cellSize / 2, y + cellSize / 2, cell.policy);
                }
            }
        }
    }

    function drawArrow(cx, cy, policy) {
        p.push();
        p.translate(cx, cy);
        let angle = 0;
        if (policy.dx === 1) angle = 0;
        if (policy.dx === -1) angle = p.PI;
        if (policy.dy === 1) angle = p.HALF_PI;
        if (policy.dy === -1) angle = -p.HALF_PI;

        p.rotate(angle);
        p.stroke(0, 242, 255);
        p.strokeWeight(2);
        p.noFill();

        const len = 15;
        p.line(-len / 2, 0, len / 2, 0);
        p.line(len / 2, 0, len / 2 - 5, -5);
        p.line(len / 2, 0, len / 2 - 5, 5);

        p.pop();
    }

    function drawAgent() {
        if (!agent) return;
        const x = agent.col * cellSize;
        const y = agent.row * cellSize;

        p.fill(0, 242, 255);
        p.noStroke();
        p.circle(x + cellSize / 2, y + cellSize / 2, cellSize * 0.5);
    }
};

new p5(sketch);
