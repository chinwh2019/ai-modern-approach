import './style.css';
import p5 from 'p5';

console.log('Search script loaded');

const sketch = (p) => {
    // Configuration
    const cols = 20;
    const rows = 15;
    let cellSize;
    let grid = [];
    let startNode = { col: 2, row: 7 };
    let endNode = { col: 17, row: 7 };

    // State
    let isRunning = false;
    let currentAlgo = 'bfs';
    let currentTerrain = 'wall'; // 'wall', 'mud', 'water', 'empty'
    let openSet = [];
    let closedSet = [];
    let path = [];
    let dragging = null; // 'start', 'end', 'paint'

    const terrainCosts = {
        'empty': 1,
        'wall': Infinity,
        'mud': 5,
        'water': 10
    };

    // Stats
    let visitedCount = 0;
    let pathCost = 0;

    // Notification
    let notification = {
        message: "",
        timer: 0,
        color: [0, 0, 0]
    };

    // DOM Elements
    const algoSelect = document.getElementById('algo-select');
    const btnRun = document.getElementById('btn-run');
    const btnReset = document.getElementById('btn-reset');
    const btnRandMap = document.getElementById('btn-rand-map');
    const btnRandPos = document.getElementById('btn-rand-pos');
    const statsVisited = document.getElementById('stats-visited');
    const statsCost = document.getElementById('stats-cost');

    p.setup = () => {
        const container = document.getElementById('canvas-container');
        const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
        canvas.parent('canvas-container');

        calculateCellSize();
        resetGrid();

        // Event Listeners
        btnRun.onclick = startSearch;
        btnReset.onclick = resetGrid;
        btnRandMap.onclick = randomizeMap;
        btnRandPos.onclick = randomizePositions;
        algoSelect.onchange = (e) => currentAlgo = e.target.value;

        // Terrain Selector
        const terrainBtns = document.querySelectorAll('.btn-terrain');
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

        if (isRunning) {
            stepAlgo();
        }

        drawGrid();

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
            p.textSize(24);
            p.text(notification.message, 0, 0);
            p.pop();

            notification.timer--;
        }
    };

    p.windowResized = () => {
        const container = document.getElementById('canvas-container');
        p.resizeCanvas(container.clientWidth, container.clientHeight);
        calculateCellSize();
    };

    p.mousePressed = () => {
        if (isRunning) return;

        const col = Math.floor(p.mouseX / cellSize);
        const row = Math.floor(p.mouseY / cellSize);

        if (isValid(col, row)) {
            if (col === startNode.col && row === startNode.row) {
                dragging = 'start';
            } else if (col === endNode.col && row === endNode.row) {
                dragging = 'end';
            } else {
                dragging = 'paint';
                paintCell(col, row);
            }
        }
    };

    p.mouseDragged = () => {
        if (isRunning || !dragging) return;

        const col = Math.floor(p.mouseX / cellSize);
        const row = Math.floor(p.mouseY / cellSize);

        if (isValid(col, row)) {
            if (dragging === 'start') {
                if (grid[col][row].type !== 'wall' && (col !== endNode.col || row !== endNode.row)) {
                    startNode = { col, row };
                }
            } else if (dragging === 'end') {
                if (grid[col][row].type !== 'wall' && (col !== startNode.col || row !== startNode.row)) {
                    endNode = { col, row };
                }
            } else if (dragging === 'paint') {
                paintCell(col, row);
            }
        }
    };

    p.mouseReleased = () => {
        dragging = null;
    };

    function paintCell(col, row) {
        // Don't overwrite start/end
        if ((col === startNode.col && row === startNode.row) ||
            (col === endNode.col && row === endNode.row)) return;

        grid[col][row].type = currentTerrain;
    }
    function calculateCellSize() {
        cellSize = Math.min(p.width / cols, p.height / rows);
    }

    function resetGrid() {
        grid = [];
        for (let i = 0; i < cols; i++) {
            grid[i] = [];
            for (let j = 0; j < rows; j++) {
                grid[i][j] = {
                    col: i,
                    row: j,
                    type: 'empty',
                    g: Infinity,
                    f: Infinity,
                    parent: null
                };
            }
        }

        isRunning = false;
        openSet = [];
        closedSet = [];
        path = [];
        visitedCount = 0;
        pathCost = 0;
        updateStats();
    }

    function randomizeMap() {
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            resetGrid();
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    // Keep start and end clear
                    if ((i === startNode.col && j === startNode.row) ||
                        (i === endNode.col && j === endNode.row)) continue;

                    if (Math.random() < 0.3) {
                        grid[i][j].type = 'wall';
                    }
                }
            }

            // Check solvability
            if (checkSolvability()) {
                return;
            }
            attempts++;
        }

        console.log("Could not generate solvable map in attempts, clearing path");
        showNotification("Complex Map Generated", [255, 165, 0]);
    }

    function checkSolvability() {
        // BFS to check if End is reachable from Start
        let q = [grid[startNode.col][startNode.row]];
        let visited = new Set();
        visited.add(`${startNode.col},${startNode.row}`);
        let found = false;

        while (q.length > 0) {
            let curr = q.shift();
            if (curr.col === endNode.col && curr.row === endNode.row) {
                found = true;
                break;
            }

            let neighbors = getNeighbors(curr);
            for (let n of neighbors) {
                if (n.type !== 'wall' && !visited.has(`${n.col},${n.row}`)) {
                    visited.add(`${n.col},${n.row}`);
                    q.push(n);
                }
            }
        }
        return found;
    }

    function randomizePositions() {
        let attempts = 0;
        while (attempts < 100) {
            // 1. Pick random Start
            let sCol = Math.floor(Math.random() * cols);
            let sRow = Math.floor(Math.random() * rows);

            if (grid[sCol][sRow].type === 'wall') {
                attempts++;
                continue;
            }

            // 2. Find all reachable nodes using BFS
            let reachable = getReachable(grid[sCol][sRow]);

            // 3. If enough reachable nodes, pick End
            if (reachable.length > 1) {
                // Filter out start node
                let validEnds = reachable.filter(n => !(n.col === sCol && n.row === sRow));

                if (validEnds.length > 0) {
                    let randEnd = validEnds[Math.floor(Math.random() * validEnds.length)];
                    startNode = { col: sCol, row: sRow };
                    endNode = { col: randEnd.col, row: randEnd.row };
                    clearPath();
                    return;
                }
            }
            attempts++;
        }
        console.log("Could not find valid start/end pair after 100 attempts");
        showNotification("Could not find valid positions", [255, 50, 50]);
    }

    function showNotification(msg, color) {
        notification.message = msg;
        notification.color = color || [255, 255, 255];
        notification.timer = 120; // 2 seconds
    }

    function getReachable(startNode) {
        let reachable = [];
        let q = [startNode];
        let visited = new Set();
        visited.add(`${startNode.col},${startNode.row}`);

        while (q.length > 0) {
            let curr = q.shift();
            reachable.push(curr);

            let neighbors = getNeighbors(curr);
            for (let neighbor of neighbors) {
                if (neighbor.type !== 'wall' && !visited.has(`${neighbor.col},${neighbor.row}`)) {
                    visited.add(`${neighbor.col},${neighbor.row}`);
                    q.push(neighbor);
                }
            }
        }
        return reachable;
    }

    function clearPath() {
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                grid[i][j].g = Infinity;
                grid[i][j].f = Infinity;
                grid[i][j].parent = null;
            }
        }
        openSet = [];
        closedSet = [];
        path = [];
        visitedCount = 0;
        pathCost = 0;
        updateStats();
    }

    function isValid(col, row) {
        return col >= 0 && col < cols && row >= 0 && row < rows;
    }

    function drawGrid() {
        p.stroke(40); // Grid lines

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const x = i * cellSize;
                const y = j * cellSize;
                const cell = grid[i][j];

                // Default color
                p.fill(20); // Background

                // Terrain
                if (cell.type === 'wall') p.fill(60);
                else if (cell.type === 'mud') p.fill(101, 67, 33); // Brown
                else if (cell.type === 'water') p.fill(0, 119, 190); // Blue

                // Visited (Closed Set)
                if (closedSet.includes(cell)) p.fill(50, 0, 100, 100); // Dark Purple

                // Frontier (Open Set)
                if (openSet.includes(cell)) p.fill(0, 242, 255, 100); // Cyan

                // Path
                if (path.includes(cell)) p.fill(255, 189, 0); // Amber

                // Start & End (Overlay)
                if (i === startNode.col && j === startNode.row) p.fill(0, 255, 157); // Green
                if (i === endNode.col && j === endNode.row) p.fill(255, 77, 77); // Red

                p.rect(x, y, cellSize, cellSize);
            }
        }
    }

    function startSearch() {
        clearPath();
        isRunning = true;

        const start = grid[startNode.col][startNode.row];
        start.g = 0;
        start.f = heuristic(start, grid[endNode.col][endNode.row]);
        openSet.push(start);
    }

    function stepAlgo() {
        if (openSet.length === 0) {
            isRunning = false;
            console.log("No path found");
            return;
        }

        // Get node with lowest score (depends on algo)
        let current;
        let currentIndex = 0;

        if (currentAlgo === 'astar' || currentAlgo === 'ucs') {
            // Priority Queue behavior
            let lowestIndex = 0;
            for (let i = 0; i < openSet.length; i++) {
                if (openSet[i].f < openSet[lowestIndex].f) {
                    lowestIndex = i;
                }
            }
            current = openSet[lowestIndex];
            currentIndex = lowestIndex;
        } else if (currentAlgo === 'bfs') {
            // Queue (FIFO)
            current = openSet[0];
            currentIndex = 0;
        } else if (currentAlgo === 'dfs') {
            // Stack (LIFO)
            current = openSet[openSet.length - 1];
            currentIndex = openSet.length - 1;
        }

        // Check goal
        if (current.col === endNode.col && current.row === endNode.row) {
            isRunning = false;
            reconstructPath(current);
            return;
        }

        // Move from open to closed
        openSet.splice(currentIndex, 1);
        closedSet.push(current);
        visitedCount++;
        updateStats();

        // Neighbors
        const neighbors = getNeighbors(current);
        for (let neighbor of neighbors) {
            if (closedSet.includes(neighbor) || neighbor.type === 'wall') continue;

            // Cost calculation
            let stepCost = terrainCosts[neighbor.type] || 1;
            let tempG = current.g + stepCost;
            let newPath = false;

            if (openSet.includes(neighbor)) {
                if (tempG < neighbor.g) {
                    neighbor.g = tempG;
                    newPath = true;
                }
            } else {
                neighbor.g = tempG;
                newPath = true;
                openSet.push(neighbor);
            }

            if (newPath) {
                neighbor.parent = current;
                if (currentAlgo === 'astar') {
                    neighbor.f = neighbor.g + heuristic(neighbor, grid[endNode.col][endNode.row]);
                } else if (currentAlgo === 'ucs') {
                    neighbor.f = neighbor.g;
                } else {
                    // BFS/DFS don't use f/g for priority, but we track it for stats
                    // NOTE: BFS is NOT optimal on weighted graphs, it just finds shortest # of steps.
                    // So for BFS we should NOT use cost in priority? 
                    // Actually BFS queue logic is separate.
                    neighbor.f = 0;
                }
            }
        }
    }

    function getNeighbors(node) {
        const neighbors = [];
        const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // 4-connected

        for (let dir of dirs) {
            const c = node.col + dir[0];
            const r = node.row + dir[1];

            if (isValid(c, r)) {
                neighbors.push(grid[c][r]);
            }
        }
        return neighbors;
    }

    function heuristic(a, b) {
        // Manhattan distance
        return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
    }

    function reconstructPath(current) {
        let temp = current;
        path.push(temp);
        pathCost = 0; // Reset

        // Cost of end node? Usually we count cost to enter.
        // Start node cost is 0.

        while (temp.parent) {
            pathCost += terrainCosts[temp.type] || 1;
            path.push(temp.parent);
            temp = temp.parent;
        }
        // pathCost is sum of costs of nodes in path (excluding start)
        updateStats();
    }

    function updateStats() {
        statsVisited.innerText = visitedCount;
        statsCost.innerText = pathCost;
    }
};

new p5(sketch);
