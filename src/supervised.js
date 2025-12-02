import './style.css';
import p5 from 'p5';
import Chart from 'chart.js/auto';
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';

console.log('Supervised Learning script loaded');

// Auto-render LaTeX
renderMathInElement(document.body, {
    delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false }
    ]
});

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
    let polyDegree = 1; // 1 = Linear, 2 = Quadratic, etc.

    // Data
    let points = []; // {x, y, label} (label for classification: 0 or 1)

    // Model State
    // Regression: y = w0 + w1*x + w2*x^2 + ...
    let weights = [];

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
    const degreeControl = document.getElementById('degree-control');
    const degreeSlider = document.getElementById('degree-slider');
    const degreeVal = document.getElementById('degree-val');
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

        degreeSlider.oninput = (e) => {
            polyDegree = parseInt(e.target.value);
            degreeVal.innerText = polyDegree;
            resetModel();
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

            // Safety Check
            if (isNaN(loss) || !isFinite(loss)) {
                isTraining = false;
                btnTrain.innerText = "Start Training";
                alert("Training diverged! Try lowering the learning rate.");
                return;
            }

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
        // Regression: Initialize weights for polynomial
        weights = [];
        for (let i = 0; i <= polyDegree; i++) {
            weights.push(p.random(-0.5, 0.5));
        }

        // Classification
        w1 = p.random(-1, 1);
        w2 = p.random(-1, 1);
        wb = p.random(-1, 1);
    }

    function updateUI() {
        if (task === 'regression') {
            degreeControl.style.display = 'block';
            instructions.innerText = "Click to add points. The curve will try to fit them.";
            conceptGuide.innerHTML = `<p><strong>Polynomial Regression (Degree ${polyDegree})</strong>: Fits a curve $y = w_0 + w_1x + ... + w_nx^n$. Higher degrees can fit more complex shapes but risk overfitting.</p>`;
        } else {
            degreeControl.style.display = 'none';
            instructions.innerText = "Click to add Red points. Hold SHIFT + Click to add Blue points.";
            conceptGuide.innerHTML = `<p><strong>Logistic Regression</strong>: Learns a probability boundary to separate two classes.</p>`;
        }

        // Re-render math in concept guide
        renderMathInElement(conceptGuide, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false }
            ]
        });
    }

    function predictPoly(x) {
        let y = 0;
        for (let i = 0; i < weights.length; i++) {
            y += weights[i] * Math.pow(x, i);
        }
        return y;
    }

    function trainStep() {
        if (points.length === 0) return;

        let totalError = 0;

        if (task === 'regression') {
            // Gradient Descent for Polynomial Regression
            // y_pred = sum(w_i * x^i)
            // Error = (y - y_pred)
            // dE/dw_i = -2 * Error * x^i (ignoring 2 for constant)
            // Update: w_i += alpha * Error * x^i

            // Accumulate gradients
            let gradients = new Array(weights.length).fill(0);

            for (let pt of points) {
                let y_pred = predictPoly(pt.x);
                let error = pt.y - y_pred;
                totalError += error * error;

                for (let i = 0; i < weights.length; i++) {
                    gradients[i] += error * Math.pow(pt.x, i);
                }
            }

            // Update weights
            for (let i = 0; i < weights.length; i++) {
                // Scale learning rate for higher degrees to prevent explosion?
                // Simple approach: just use global learning rate
                weights[i] += learningRate * gradients[i];
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
                let p_safe = Math.max(0.0001, Math.min(0.9999, pred));
                let bce = -(pt.label * Math.log(p_safe) + (1 - pt.label) * Math.log(1 - p_safe));
                totalError += bce;
            }
            loss = totalError / points.length;
        }

        epoch++;
    }

    function updateChart() {
        // Throttle: Update only once every 60 frames (approx 1 sec)
        if (epoch % 60 === 0) {
            lossChart.data.labels.push(epoch);
            lossChart.data.datasets[0].data.push(loss);
            if (lossChart.data.labels.length > 20) { // Keep fewer points for performance
                lossChart.data.labels.shift();
                lossChart.data.datasets[0].data.shift();
            }
            lossChart.update('none'); // 'none' mode for performance
        }
    }

    function drawRegression() {
        // Draw Curve
        p.stroke(0, 242, 255);
        p.strokeWeight(3);
        p.noFill();
        p.beginShape();
        for (let px = 0; px <= p.width; px += 5) {
            let x = p.map(px, 0, p.width, 0, 1);
            let y = predictPoly(x);
            let py = p.map(y, 0, 1, p.height, 0);
            p.vertex(px, py);
        }
        p.endShape();

        // Draw Residuals
        p.stroke(255, 50, 50, 150);
        p.strokeWeight(1);
        for (let pt of points) {
            let px = p.map(pt.x, 0, 1, 0, p.width);
            let py = p.map(pt.y, 0, 1, p.height, 0);

            let y_pred = predictPoly(pt.x);
            let py_pred = p.map(y_pred, 0, 1, p.height, 0);

            p.line(px, py, px, py_pred);
        }
    }

    function drawClassification() {
        // Optimized Heatmap: Draw to small image and scale up
        const lowResW = 50;
        const lowResH = 50;
        const img = p.createImage(lowResW, lowResH);
        img.loadPixels();

        for (let i = 0; i < lowResW; i++) {
            for (let j = 0; j < lowResH; j++) {
                let x = i / lowResW;
                let y = 1 - (j / lowResH); // Invert Y

                let z = w1 * x + w2 * y + wb;
                let pred = 1 / (1 + Math.exp(-z));

                let r, g, b, a;
                // Red (0) to Blue (1)
                if (pred < 0.5) {
                    let intensity = p.map(pred, 0, 0.5, 1, 0);
                    r = 255; g = 77; b = 77; a = intensity * 50;
                } else {
                    let intensity = p.map(pred, 0.5, 1, 0, 1);
                    r = 0; g = 119; b = 190; a = intensity * 50;
                }

                img.set(i, j, [r, g, b, a]);
            }
        }
        img.updatePixels();
        p.image(img, 0, 0, p.width, p.height);

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
                let y_pred = predictPoly(mx);
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
            // Build polynomial string
            let str = "y = ";
            for (let i = weights.length - 1; i >= 0; i--) {
                let w = weights[i];
                let sign = w >= 0 ? "+" : "-";
                let val = Math.abs(w).toFixed(2);

                if (i === weights.length - 1) {
                    // First term (highest degree), don't show + if positive
                    sign = w >= 0 ? "" : "-";
                }

                if (i === 0) str += `${sign} ${val}`;
                else if (i === 1) str += `${sign} ${val}x `;
                else str += `${sign} ${val}x^${i} `;
            }
            equationBox.innerHTML = str;
        } else {
            equationBox.innerHTML = `${w1.toFixed(2)}x + ${w2.toFixed(2)}y + ${wb.toFixed(2)} = 0`;
        }

        // Re-render math in equation box (if we used LaTeX there, but currently it's plain text mostly)
        // However, if we want to support LaTeX in equation box later:
        /*
        renderMathInElement(equationBox, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false }
            ]
        });
        */
    }
};

new p5(sketch);
