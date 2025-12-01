import './style.css';
import p5 from 'p5';
import Chart from 'chart.js/auto';

console.log('Supervised Learning script loaded');

// Chart Setup
const ctx = document.getElementById('loss-chart').getContext('2d');
const lossChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Loss',
            data: [],
            borderColor: '#ff4d4d',
            backgroundColor: 'rgba(255, 77, 77, 0.1)',
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
    let task = 'regression'; // 'regression' or 'classification'

    // Data
    let points = []; // {x, y, label} (label for classification: 0 or 1)

    // Model State
    // Regression: y = mx + b
    let m = 0;
    let b = 0;

    // Classification: Logistic Regression
    // z = w1*x + w2*y + wb
    // pred = sigmoid(z)
    let w1 = 0;
    let w2 = 0;
    let wb = 0;

    // Training State
    let isTraining = false;
    let learningRate = 0.01;
    let epoch = 0;
    let loss = 0;

    // UI Elements
    const taskSelect = document.getElementById('task-select');
    const alphaSlider = document.getElementById('alpha-slider');
    const alphaVal = document.getElementById('alpha-val');
    const btnTrain = document.getElementById('btn-train');
    const btnReset = document.getElementById('btn-reset');
    const lossVal = document.getElementById('loss-val');
    const epochVal = document.getElementById('epoch-val');
    const instructions = document.getElementById('instructions');
    const conceptGuide = document.getElementById('concept-guide');
    const equationBox = document.getElementById('equation-box');

    p.setup = () => {
        const container = document.getElementById('canvas-container');
        const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
        canvas.parent('canvas-container');

        resetModel();

        // Event Listeners
        taskSelect.onchange = (e) => {
            task = e.target.value;
            resetData();
            updateUI();
        };

        alphaSlider.oninput = (e) => {
            learningRate = parseFloat(e.target.value);
            alphaVal.innerText = learningRate;
        };

        btnTrain.onclick = () => {
            isTraining = !isTraining;
            btnTrain.innerText = isTraining ? "Pause Training" : "Start Training";
        };

        btnReset.onclick = resetData;

        updateUI();
    };

    p.draw = () => {
        p.background(20);

        if (isTraining) {
            // Speed up training
            for (let i = 0; i < 5; i++) trainStep();
            updateChart();
        }

        if (task === 'regression') {
            drawRegression();
        } else {
            drawClassification();
        }

        drawPoints();
        drawHover();
        updateStats();
        updateEquation();
    };

    p.windowResized = () => {
        const container = document.getElementById('canvas-container');
        p.resizeCanvas(container.clientWidth, container.clientHeight);
    };

    p.mousePressed = () => {
        if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
            let x = p.map(p.mouseX, 0, p.width, 0, 1);
            let y = p.map(p.mouseY, p.height, 0, 0, 1);

            if (task === 'regression') {
                points.push({ x, y });
            } else {
                let label = p.keyIsDown(p.SHIFT) ? 1 : 0;
                points.push({ x, y, label });
            }
        }
    };

    function resetData() {
        points = [];
        resetModel();
        isTraining = false;
        btnTrain.innerText = "Start Training";
        epoch = 0;
        loss = 0;
        lossChart.data.labels = [];
        lossChart.data.datasets[0].data = [];
        lossChart.update();
    }

    function resetModel() {
        m = p.random(-0.5, 0.5);
        b = p.random(0, 1);

        w1 = p.random(-1, 1);
        w2 = p.random(-1, 1);
        wb = p.random(-1, 1);
    }

    function updateUI() {
        if (task === 'regression') {
            instructions.innerText = "Click to add points. The line will try to fit them.";
            conceptGuide.innerHTML = `<p><strong>Linear Regression</strong>: Finds the best-fitting line $y = mx + b$ by minimizing the Mean Squared Error (MSE).</p>`;
        } else {
            instructions.innerText = "Click to add Red points. Hold SHIFT + Click to add Blue points.";
            conceptGuide.innerHTML = `<p><strong>Logistic Regression</strong>: Learns a probability boundary to separate two classes.</p>`;
        }
    }

    function trainStep() {
        if (points.length === 0) return;

        let totalError = 0;

        if (task === 'regression') {
            for (let pt of points) {
                let y_pred = m * pt.x + b;
                let error = pt.y - y_pred;

                m += learningRate * error * pt.x;
                b += learningRate * error;

                totalError += error * error;
            }
            loss = totalError / points.length;

        } else {
            for (let pt of points) {
                let z = w1 * pt.x + w2 * pt.y + wb;
                let pred = 1 / (1 + Math.exp(-z));
                let error = pt.label - pred;

                w1 += learningRate * error * pt.x;
                w2 += learningRate * error * pt.y;
                wb += learningRate * error;

                // Binary Cross Entropy (approx)
                // -[y log(p) + (1-y) log(1-p)]
                // Avoid log(0)
                let p_safe = Math.max(0.0001, Math.min(0.9999, pred));
                let bce = -(pt.label * Math.log(p_safe) + (1 - pt.label) * Math.log(1 - p_safe));
                totalError += bce;
            }
            loss = totalError / points.length;
        }

        epoch++;
    }

    function updateChart() {
        if (epoch % 5 === 0) {
            lossChart.data.labels.push(epoch);
            lossChart.data.datasets[0].data.push(loss);
            if (lossChart.data.labels.length > 50) {
                lossChart.data.labels.shift();
                lossChart.data.datasets[0].data.shift();
            }
            lossChart.update();
        }
    }

    function drawRegression() {
        // Draw Line
        let x1 = 0;
        let y1 = p.map(b, 0, 1, p.height, 0);
        let x2 = p.width;
        let y2 = p.map(m * 1 + b, 0, 1, p.height, 0);

        p.stroke(0, 242, 255);
        p.strokeWeight(3);
        p.line(x1, y1, x2, y2);

        // Draw Residuals
        p.stroke(255, 50, 50, 150);
        p.strokeWeight(1);
        for (let pt of points) {
            let px = p.map(pt.x, 0, 1, 0, p.width);
            let py = p.map(pt.y, 0, 1, p.height, 0);

            let y_pred = m * pt.x + b;
            let py_pred = p.map(y_pred, 0, 1, p.height, 0);

            p.line(px, py, px, py_pred);
        }
    }

    function drawClassification() {
        // Heatmap (Low Res for performance)
        const res = 20;
        p.noStroke();
        for (let i = 0; i < p.width; i += res) {
            for (let j = 0; j < p.height; j += res) {
                let x = p.map(i + res / 2, 0, p.width, 0, 1);
                let y = p.map(j + res / 2, p.height, 0, 0, 1);

                let z = w1 * x + w2 * y + wb;
                let pred = 1 / (1 + Math.exp(-z));

                // Red (0) to Blue (1)
                // 0.5 is white/neutral
                let c;
                if (pred < 0.5) {
                    // Reddish
                    let intensity = p.map(pred, 0, 0.5, 1, 0);
                    c = p.color(255, 77, 77, intensity * 50); // Low opacity
                } else {
                    // Bluish
                    let intensity = p.map(pred, 0.5, 1, 0, 1);
                    c = p.color(0, 119, 190, intensity * 50);
                }
                p.fill(c);
                p.rect(i, j, res, res);
            }
        }

        // Decision Boundary (z=0)
        if (Math.abs(w2) > 0.001) {
            let y_at_0 = (-wb) / w2;
            let y_at_1 = (-w1 - wb) / w2;

            let x1 = 0;
            let y1 = p.map(y_at_0, 0, 1, p.height, 0);
            let x2 = p.width;
            let y2 = p.map(y_at_1, 0, 1, p.height, 0);

            p.stroke(255);
            p.strokeWeight(2);
            p.line(x1, y1, x2, y2);
        }
    }

    function drawPoints() {
        p.noStroke();
        for (let pt of points) {
            let px = p.map(pt.x, 0, 1, 0, p.width);
            let py = p.map(pt.y, 0, 1, p.height, 0);

            if (task === 'regression') {
                p.fill(255);
                p.circle(px, py, 8);
            } else {
                if (pt.label === 0) p.fill(255, 77, 77);
                else p.fill(0, 119, 190);
                p.circle(px, py, 10);
                p.stroke(255);
                p.strokeWeight(1);
                p.noStroke();
            }
        }
    }

    function drawHover() {
        let mx = p.map(p.mouseX, 0, p.width, 0, 1);
        let my = p.map(p.mouseY, p.height, 0, 0, 1);

        if (mx >= 0 && mx <= 1 && my >= 0 && my <= 1) {
            // Draw cursor target
            p.noFill();
            p.stroke(255, 200);
            p.circle(p.mouseX, p.mouseY, 20);

            // Prediction Tooltip
            let text = "";
            if (task === 'regression') {
                let y_pred = m * mx + b;
                text = `y = ${y_pred.toFixed(2)}`;
            } else {
                let z = w1 * mx + w2 * my + wb;
                let pred = 1 / (1 + Math.exp(-z));
                let cls = pred > 0.5 ? "Blue" : "Red";
                let conf = Math.abs(pred - 0.5) * 2 * 100;
                text = `${cls} (${conf.toFixed(0)}%)`;
            }

            p.fill(0, 200);
            p.noStroke();
            p.rect(p.mouseX + 15, p.mouseY - 15, p.textWidth(text) + 10, 25, 4);
            p.fill(255);
            p.textAlign(p.LEFT, p.CENTER);
            p.text(text, p.mouseX + 20, p.mouseY - 2);
        }
    }

    function updateStats() {
        lossVal.innerText = loss.toFixed(4);
        epochVal.innerText = epoch;
    }

    function updateEquation() {
        if (task === 'regression') {
            equationBox.innerHTML = `y = ${m.toFixed(2)}x + ${b.toFixed(2)}`;
        } else {
            equationBox.innerHTML = `${w1.toFixed(2)}x + ${w2.toFixed(2)}y + ${wb.toFixed(2)} = 0`;
        }
    }
};

new p5(sketch);
