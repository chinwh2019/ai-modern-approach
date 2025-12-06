import './style.css'; // Ensure styles are loaded
import p5 from 'p5';
import Chart from 'chart.js/auto';

// --- Math & ML Utilities ---

function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
function d_sigmoid(y) { return y * (1 - y); }

const act_tanh = (x) => Math.tanh(x);
const d_act_tanh = (y) => 1 - y * y;

function randWeight() { return (Math.random() * 2 - 1); } // -1 to 1

// --- Neural Network Classes (Vanilla JS Implementation) ---

class Neuron {
    constructor(inputCount) {
        this.weights = new Array(inputCount).fill(0).map(randWeight);
        this.bias = randWeight();
        this.output = 0;
        this.delta = 0; // For backprop
    }

    forward(inputs, activationFn) {
        let sum = this.bias;
        for (let i = 0; i < this.weights.length; i++) {
            sum += inputs[i] * this.weights[i];
        }
        this.output = activationFn(sum);
        return this.output;
    }
}

class Layer {
    constructor(neuronCount, inputCount, type = 'hidden') {
        this.neurons = [];
        this.type = type;
        for (let i = 0; i < neuronCount; i++) {
            this.neurons.push(new Neuron(inputCount));
        }
    }

    forward(inputs) {
        // Output layer uses Sigmoid for classification (0-1), Hidden uses Tanh
        const actFn = (this.type === 'output') ? sigmoid : act_tanh;
        return this.neurons.map(n => n.forward(inputs, actFn));
    }
}

class Network {
    constructor(layerConfig) {
        // layerConfig example: [2, 4, 4, 1] (2 Inputs, 4 Hidden, 4 Hidden, 1 Output)
        this.layers = [];
        this.config = [...layerConfig]; // Clone config to avoid mutation references

        // Input layer doesn't have neurons/weights, just placeholders.
        // We start creating layers from index 1.
        for (let i = 1; i < layerConfig.length; i++) {
            let isOutput = (i === layerConfig.length - 1);
            let inputCount = layerConfig[i - 1];
            let neuronCount = layerConfig[i];
            this.layers.push(new Layer(neuronCount, inputCount, isOutput ? 'output' : 'hidden'));
        }
    }

    forward(inputs) {
        let currentInputs = inputs;
        for (let layer of this.layers) {
            currentInputs = layer.forward(currentInputs);
        }
        return currentInputs; // Final output array
    }

    // Backpropagation
    train(inputs, target, learningRate) {
        // 1. Forward Pass
        const outputs = this.forward(inputs);
        const prediction = outputs[0]; // Assuming 1 output neuron for binary classification

        // 2. Output Error
        const outputLayer = this.layers[this.layers.length - 1];
        const outputNeuron = outputLayer.neurons[0];

        const error = target - prediction;
        outputNeuron.delta = error * d_sigmoid(prediction);

        // 3. Backpropagate to Hidden Layers
        for (let i = this.layers.length - 2; i >= 0; i--) {
            const layer = this.layers[i];
            const nextLayer = this.layers[i + 1];

            for (let j = 0; j < layer.neurons.length; j++) {
                const neuron = layer.neurons[j];
                let sum = 0;
                // Sum of weights * delta from next layer
                for (let k = 0; k < nextLayer.neurons.length; k++) {
                    sum += nextLayer.neurons[k].weights[j] * nextLayer.neurons[k].delta;
                }
                neuron.delta = sum * d_act_tanh(neuron.output);
            }
        }

        // 4. Update Weights
        let layerInputs = inputs;
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            for (let neuron of layer.neurons) {
                // Update weights
                for (let w = 0; w < neuron.weights.length; w++) {
                    neuron.weights[w] += learningRate * neuron.delta * layerInputs[w];
                }
                // Update bias
                neuron.bias += learningRate * neuron.delta;
            }
            // Next layer's inputs are this layer's outputs
            layerInputs = layer.neurons.map(n => n.output);
        }

        return Math.abs(error);
    }
}

// --- Global State ---

const state = {
    network: null,
    points: [], // {x, y, label}
    config: [2, 4, 4, 1], // Default architecture
    learningRate: 0.03,
    isTraining: false,
    epoch: 0,
    loss: 0,
    lossHistory: []
};

// --- Visualization Instances ---
let mainSketch; // The classification plane
let netSketch;  // The network architecture
let chartInstance = null;

// --- Helper Functions ---

function resetNetwork() {
    console.log("Resetting Network...", state.config);
    state.network = new Network(state.config);
    state.epoch = 0;
    state.loss = 0;
    state.lossHistory = [];
    state.isTraining = false;

    const btn = document.getElementById('btn-train');
    if (btn) btn.innerText = "Start Training";

    if (chartInstance) {
        chartInstance.data.labels = [];
        chartInstance.data.datasets[0].data = [];
        chartInstance.update();
    }
}

function updateStats() {
    const elEpoch = document.getElementById('val-epoch');
    const elLoss = document.getElementById('val-loss');
    if (elEpoch) elEpoch.innerText = state.epoch;
    if (elLoss) elLoss.innerText = state.loss.toFixed(4);

    // Update Chart
    if (state.epoch % 10 === 0 && chartInstance) {
        chartInstance.data.labels.push(state.epoch);
        chartInstance.data.datasets[0].data.push(state.loss);
        if (chartInstance.data.labels.length > 50) {
            chartInstance.data.labels.shift();
            chartInstance.data.datasets[0].data.shift();
        }
        chartInstance.update('none');
    }
}

function generateXOR() {
    state.points = [
        { x: 0.1, y: 0.1, label: 0 },
        { x: 0.9, y: 0.9, label: 0 },
        { x: 0.1, y: 0.9, label: 1 },
        { x: 0.9, y: 0.1, label: 1 }
    ];
}

function generateCircle() {
    state.points = [];
    for (let i = 0; i < 50; i++) {
        const x = Math.random();
        const y = Math.random();
        const d = Math.sqrt((x - 0.5) ** 2 + (y - 0.5) ** 2);
        const label = d < 0.35 ? 1 : 0;
        state.points.push({ x, y, label });
    }
}

function generateSpiral() {
    state.points = [];
    for (let i = 0; i < 80; i++) {
        const r = i / 80;
        const angle = 3.5 * r * Math.PI;
        const x1 = 0.5 + r * Math.cos(angle) * 0.45;
        const y1 = 0.5 + r * Math.sin(angle) * 0.45;
        state.points.push({ x: x1, y: y1, label: 0 });

        const x2 = 0.5 + r * Math.cos(angle + Math.PI) * 0.45;
        const y2 = 0.5 + r * Math.sin(angle + Math.PI) * 0.45;
        state.points.push({ x: x2, y: y2, label: 1 });
    }
}

// --- P5 Sketches ---

const sketchMain = (p) => {
    let img;

    p.setup = () => {
        // Safe element retrieval
        const container = document.getElementById('canvas-container');
        if (!container) {
            console.error("Canvas container not found!");
            return;
        }
        const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
        canvas.parent(container);
        img = p.createImage(50, 50);
    };

    p.draw = () => {
        p.background(30);

        if (!state.network || state.points.length === 0) return;

        if (state.isTraining) {
            let totalErr = 0;
            const steps = 20;
            for (let s = 0; s < steps; s++) {
                const idx = Math.floor(Math.random() * state.points.length);
                const pt = state.points[idx];
                totalErr += state.network.train([pt.x, pt.y], pt.label, state.learningRate);
            }
            state.loss = totalErr / steps;
            state.epoch += 1;
            updateStats();
        }

        if (state.epoch % 3 === 0 || !state.isTraining) {
            img.loadPixels();
            for (let i = 0; i < img.width; i++) {
                for (let j = 0; j < img.height; j++) {
                    const x = i / img.width;
                    const y = 1 - (j / img.height);
                    const out = state.network.forward([x, y])[0];
                    let r, b, a;
                    if (out < 0.5) {
                        r = 255; b = 77; a = p.map(out, 0.5, 0, 0, 150);
                    } else {
                        r = 0; b = 255; a = p.map(out, 0.5, 1, 0, 150);
                    }
                    img.set(i, j, [r, 77, b, a + 50]);
                }
            }
            img.updatePixels();
        }
        p.image(img, 0, 0, p.width, p.height);

        // Draw points
        p.stroke(255);
        p.strokeWeight(1);
        for (let pt of state.points) {
            if (pt.label === 0) p.fill(255, 100, 100);
            else p.fill(100, 100, 255);
            const px = pt.x * p.width;
            const py = (1 - pt.y) * p.height;
            p.circle(px, py, 12);
        }
    };

    p.mousePressed = () => {
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
            const x = p.mouseX / p.width;
            const y = 1 - (p.mouseY / p.height);
            const label = p.keyIsDown(p.SHIFT) ? 1 : 0;
            state.points.push({ x, y, label });
        }
    };

    p.windowResized = () => {
        const c = document.getElementById('canvas-container');
        if (c) p.resizeCanvas(c.clientWidth, c.clientHeight);
    };
};

const sketchNet = (p) => {
    p.setup = () => {
        const container = document.getElementById('network-viz');
        if (!container) return;
        const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
        canvas.parent(container);
    };

    p.draw = () => {
        p.clear();
        if (!state.network) return;

        const allLayers = [state.config[0]].concat(state.network.layers.map(l => l.neurons.length));
        const layerGap = p.width / (allLayers.length + 1);

        // Connections
        for (let i = 1; i < allLayers.length; i++) {
            const prevCount = allLayers[i - 1];
            const currCount = allLayers[i];
            const currLayerObj = state.network.layers[i - 1];

            // Limit visualizations for massive layers to avoid lag
            if (prevCount > 20 || currCount > 20) continue;

            const x1 = i * layerGap;
            const x2 = (i + 1) * layerGap;
            const yStep1 = p.height / (prevCount + 1);
            const yStep2 = p.height / (currCount + 1);

            for (let prev = 0; prev < prevCount; prev++) {
                for (let curr = 0; curr < currCount; curr++) {
                    const y1 = (prev + 1) * yStep1;
                    const y2 = (curr + 1) * yStep2;
                    const w = currLayerObj.neurons[curr].weights[prev];
                    const wAbs = Math.abs(w);
                    p.strokeWeight(p.map(wAbs, 0, 5, 0.5, 4));
                    if (w > 0) p.stroke(100, 100, 255, 150);
                    else p.stroke(255, 100, 100, 150);
                    p.line(x1, y1, x2, y2);
                }
            }
        }

        // Nodes
        p.strokeWeight(1);
        p.stroke(255);
        for (let i = 0; i < allLayers.length; i++) {
            const count = allLayers[i];
            const x = (i + 1) * layerGap;
            const yStep = p.height / (count + 1);
            for (let j = 0; j < count; j++) {
                const y = (j + 1) * yStep;
                p.fill(30);
                if (i > 0) {
                    const neuron = state.network.layers[i - 1].neurons[j];
                    const val = neuron.output;
                    const c = p.map(val, -1, 1, 0, 255);
                    p.fill(c);
                }
                p.circle(x, y, 16);
            }
        }
    };

    p.windowResized = () => {
        const c = document.getElementById('network-viz');
        if (c) p.resizeCanvas(c.clientWidth, c.clientHeight);
    };
};


// --- UI & Init ---

function renderLayerControls() {
    const container = document.getElementById('architecture-controls');
    if (!container) return;
    container.innerHTML = '';

    // Input Layer
    const inputDiv = document.createElement('div');
    inputDiv.className = 'layer-box';
    inputDiv.innerHTML = `<span>Inbox</span><b>2</b>`;
    container.appendChild(inputDiv);

    // Hidden Layers
    for (let i = 1; i < state.config.length - 1; i++) {
        const div = document.createElement('div');
        div.className = 'layer-box';
        div.innerHTML = `
            <span>H${i}</span>
            <button class="btn-tiny" onclick="window.changeNeurons(${i}, -1)">-</button>
            <b>${state.config[i]}</b>
            <button class="btn-tiny" onclick="window.changeNeurons(${i}, 1)">+</button>
        `;
        container.appendChild(div);
    }

    // Output Layer
    const outputDiv = document.createElement('div');
    outputDiv.className = 'layer-box';
    outputDiv.innerHTML = `<span>Out</span><b>1</b>`;
    container.appendChild(outputDiv);
}

// Window Globals for inline HTML events
window.changeNeurons = (layerIdx, delta) => {
    let newVal = state.config[layerIdx] + delta;
    if (newVal < 1) newVal = 1;
    if (newVal > 8) newVal = 8;
    state.config[layerIdx] = newVal;
    resetNetwork();
    renderLayerControls(); // Re-render to show new number
};

document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("Initializing Neural Playground...");

        // 1. Setup State first
        generateXOR();
        resetNetwork();
        renderLayerControls();

        // 2. Setup Chart
        const ctx = document.getElementById('loss-chart').getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Loss', data: [], borderColor: '#ff4d4d', tension: 0.1 }] },
            options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { x: { display: false } } }
        });

        // 3. Setup P5
        new p5(sketchMain);
        new p5(sketchNet);

        // 4. Bind Events
        document.getElementById('btn-train').addEventListener('click', () => {
            console.log("Train clicked!");
            state.isTraining = !state.isTraining;
            document.getElementById('btn-train').innerText = state.isTraining ? "Pause Training" : "Resume Training";
        });

        document.getElementById('btn-reset').addEventListener('click', resetNetwork);

        document.getElementById('btn-add-layer').addEventListener('click', () => {
            if (state.config.length >= 6) return;
            const outputSize = state.config.pop();
            state.config.push(4);
            state.config.push(outputSize);
            resetNetwork();
            renderLayerControls();
        });

        document.getElementById('btn-remove-layer').addEventListener('click', () => {
            if (state.config.length <= 3) return;
            const outputSize = state.config.pop();
            state.config.pop();
            state.config.push(outputSize);
            resetNetwork();
            renderLayerControls();
        });

        document.getElementById('lr-slider').addEventListener('input', (e) => {
            state.learningRate = parseFloat(e.target.value);
            const val = document.getElementById('lr-val');
            if (val) val.innerText = state.learningRate;
        });

        document.getElementById('preset-xor').addEventListener('click', () => { generateXOR(); resetNetwork(); });
        document.getElementById('preset-circle').addEventListener('click', () => { generateCircle(); resetNetwork(); });
        document.getElementById('preset-spiral').addEventListener('click', () => { generateSpiral(); resetNetwork(); });
        document.getElementById('preset-moons').addEventListener('click', () => {
            state.points = [];
            for (let i = 0; i < 40; i++) {
                const a = (i / 40) * Math.PI;
                state.points.push({ x: 0.5 + Math.cos(a) * 0.25, y: 0.3 + Math.sin(a) * 0.25, label: 0 });
                state.points.push({ x: 0.5 + Math.cos(a + Math.PI) * 0.25, y: 0.7 + Math.sin(a + Math.PI) * 0.25, label: 1 });
            }
            resetNetwork();
        });

    } catch (e) {
        console.error("Initialization Error:", e);
        alert("Error initializing demo: " + e.message);
    }
});
