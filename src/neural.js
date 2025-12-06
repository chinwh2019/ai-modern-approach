import './style.css';
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
    constructor(inputCount, layerIdx, neuronIdx) {
        this.weights = new Array(inputCount).fill(0).map(randWeight);
        this.bias = randWeight();
        this.output = 0;
        this.delta = 0;

        // Identity for visualization
        this.id = `L${layerIdx}-N${neuronIdx}`;
        this.layerIdx = layerIdx;
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
    constructor(neuronCount, inputCount, layerIdx, type = 'hidden') {
        this.neurons = [];
        this.type = type;
        for (let i = 0; i < neuronCount; i++) {
            this.neurons.push(new Neuron(inputCount, layerIdx, i));
        }
    }

    forward(inputs) {
        const actFn = (this.type === 'output') ? sigmoid : act_tanh;
        return this.neurons.map(n => n.forward(inputs, actFn));
    }
}

class Network {
    constructor(layerConfig) {
        this.layers = [];
        this.config = [...layerConfig];

        // Input layer doesn't have neurons/weights, just placeholders.
        // We start creating layers from index 1.
        for (let i = 1; i < layerConfig.length; i++) {
            let isOutput = (i === layerConfig.length - 1);
            let inputCount = layerConfig[i - 1];
            let neuronCount = layerConfig[i];
            // Pass actual layer index (i) mainly for ID generation
            this.layers.push(new Layer(neuronCount, inputCount, i, isOutput ? 'output' : 'hidden'));
        }
    }

    forward(inputs) {
        let currentInputs = inputs;
        for (let layer of this.layers) {
            currentInputs = layer.forward(currentInputs);
        }
        return currentInputs;
    }

    train(inputs, target, learningRate) {
        const outputs = this.forward(inputs);
        const prediction = outputs[0];

        const outputLayer = this.layers[this.layers.length - 1];
        const outputNeuron = outputLayer.neurons[0];

        const error = target - prediction;
        outputNeuron.delta = error * d_sigmoid(prediction);

        for (let i = this.layers.length - 2; i >= 0; i--) {
            const layer = this.layers[i];
            const nextLayer = this.layers[i + 1];

            for (let j = 0; j < layer.neurons.length; j++) {
                const neuron = layer.neurons[j];
                let sum = 0;
                for (let k = 0; k < nextLayer.neurons.length; k++) {
                    sum += nextLayer.neurons[k].weights[j] * nextLayer.neurons[k].delta;
                }
                neuron.delta = sum * d_act_tanh(neuron.output);
            }
        }

        let layerInputs = inputs;
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            for (let neuron of layer.neurons) {
                for (let w = 0; w < neuron.weights.length; w++) {
                    neuron.weights[w] += learningRate * neuron.delta * layerInputs[w];
                }
                neuron.bias += learningRate * neuron.delta;
            }
            layerInputs = layer.neurons.map(n => n.output);
        }

        return Math.abs(error);
    }

    countParameters() {
        let count = 0;
        for (let layer of this.layers) {
            for (let neuron of layer.neurons) {
                count += neuron.weights.length + 1; // Weights + Bias
            }
        }
        return count;
    }
}

// --- Global State ---

const state = {
    network: null,
    points: [],
    config: [2, 4, 4, 1],
    learningRate: 0.03,
    isTraining: false,
    epoch: 0,
    loss: 0,
    lossHistory: [],

    // Glass Box State
    selectedNeuron: null, // If null, show final output. If set, show this neuron's output.
    hoverInput: null,     // {x, y} from mouse hover on main canvas
};


// --- Visualization Instances ---
let mainSketch;
let netSketch;
let chartInstance = null;

// --- Helper Functions ---

function resetNetwork() {
    state.network = new Network(state.config);
    state.epoch = 0;
    state.loss = 0;
    state.lossHistory = [];
    state.isTraining = false;
    state.selectedNeuron = null; // Reset selection

    const btn = document.getElementById('btn-train');
    if (btn) btn.innerText = "Start Training";

    if (chartInstance) {
        chartInstance.data.labels = [];
        chartInstance.data.datasets[0].data = [];
        chartInstance.update();
    }

    updateStats();
}

function updateStats() {
    const elEpoch = document.getElementById('val-epoch');
    const elLoss = document.getElementById('val-loss');
    const elParams = document.getElementById('val-params');

    if (elEpoch) elEpoch.innerText = state.epoch;
    if (elLoss) elLoss.innerText = state.loss.toFixed(4);
    if (elParams && state.network) elParams.innerText = state.network.countParameters();

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
    const resolution = 50;

    p.setup = () => {
        const container = document.getElementById('canvas-container');
        if (!container) return;
        const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
        canvas.parent(container);
        img = p.createImage(resolution, resolution);
    };

    p.draw = () => {
        p.background(30);

        if (!state.network) return;

        // Training Step
        if (state.isTraining && state.points.length > 0) {
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

        // Draw Heatmap
        // If a neuron is selected, we want to visualize output of THAT neuron
        // But we need to run forward pass for every pixel effectively

        const viewingNeuron = state.selectedNeuron; // null means final output

        if (state.epoch % 3 === 0 || !state.isTraining || viewingNeuron) {
            img.loadPixels();
            for (let i = 0; i < img.width; i++) {
                for (let j = 0; j < img.height; j++) {
                    const x = i / img.width;
                    const y = 1 - (j / img.height);

                    // Run full forward pass to populate all neuron outputs
                    const finalOuts = state.network.forward([x, y]);

                    let val;
                    if (viewingNeuron) {
                        // Find the neuron instance in current network state and get its output
                        // (It was updated by forward call above)
                        val = viewingNeuron.output;
                    } else {
                        val = finalOuts[0];
                    }

                    let r, b, a;
                    // Color Logic
                    // For hidden neurons (Tanh), range is -1 to 1.
                    // For output neuron (Sigmoid), range is 0 to 1.

                    if (viewingNeuron && viewingNeuron.layerIdx < state.config.length - 1) {
                        // Tanh Range (-1 to 1)
                        // -1 -> Red, 1 -> Blue, 0 -> Transparent/Black
                        if (val < 0) {
                            r = 255; b = 0; a = p.map(val, 0, -1, 0, 200);
                        } else {
                            r = 0; b = 255; a = p.map(val, 0, 1, 0, 200);
                        }
                    } else {
                        // Sigmoid Range (0 to 1) -> typical binary class logic
                        if (val < 0.5) {
                            r = 255; b = 77; a = p.map(val, 0.5, 0, 0, 150);
                        } else {
                            r = 0; b = 255; a = p.map(val, 0.5, 1, 0, 150);
                        }
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

        // Handle Mouse Hover for "Live Activation"
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
            const hx = p.mouseX / p.width;
            const hy = 1 - (p.mouseY / p.height);
            state.hoverInput = { x: hx, y: hy };
            // Run forward pass once for this point so network state reflects it
            state.network.forward([hx, hy]);
        } else {
            state.hoverInput = null;
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
    // We need to store node positions to detect clicks
    let nodePositions = [];

    p.setup = () => {
        const container = document.getElementById('network-viz');
        if (!container) return;
        const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
        canvas.parent(container);
    };

    p.draw = () => {
        p.clear();
        if (!state.network) return;

        // "Live Activation" Logic
        // If hovering, we use the current state of neurons (updated by mainSketch hover)
        // If NOT hovering, visualization might be static or flickering with training.
        // Let's stick to showing whatever is in neuron.output. 

        const allLayers = [state.config[0]].concat(state.network.layers.map(l => l.neurons.length));
        const layerGap = p.width / (allLayers.length + 1);

        nodePositions = []; // Reset for this frame

        // Connections
        for (let i = 1; i < allLayers.length; i++) {
            const prevCount = allLayers[i - 1];
            const currCount = allLayers[i];
            const currLayerObj = state.network.layers[i - 1]; // Index shift in storage

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

                    // Dim connections if hovering and they aren't active?
                    // Complexity: just show weights for now.
                    let connAlpha = 150;

                    p.strokeWeight(p.map(wAbs, 0, 5, 0.5, 4));
                    if (w > 0) p.stroke(100, 100, 255, connAlpha);
                    else p.stroke(255, 100, 100, connAlpha);
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

                // Determine color
                // Input nodes: just show input value if hovering
                let val = 0;
                let isSelected = false;

                if (i === 0) {
                    // Input Layer
                    if (state.hoverInput) {
                        val = (j === 0) ? state.hoverInput.x : state.hoverInput.y;
                        // Map 0-1 to -1-1 for uniform color logic? or separate?
                        // Let's keep 0-1 range for inputs
                        const c = p.map(val, 0, 1, 0, 255);
                        p.fill(c);
                    } else {
                        p.fill(50);
                    }
                } else {
                    // Hidden/Output Layers
                    const neuron = state.network.layers[i - 1].neurons[j];
                    val = neuron.output;

                    // Highlight selected
                    if (state.selectedNeuron === neuron) {
                        isSelected = true;
                    }

                    // Activation Color
                    // Tanh: -1 (Red) to 1 (Blue)
                    // Sigmoid: 0 (Red) to 1 (Blue)

                    // Unified visualization: Map -1..1 range to color
                    // For Sigmoid (0..1), 0 is "low", 1 is "high".
                    // Let's us Blue for High, Red for Low/Negative.

                    let r, b;
                    if (val < 0) {
                        // Negative (Tanh only really)
                        r = p.map(val, 0, -1, 50, 255);
                        b = 50;
                    } else {
                        // Positive
                        r = 50;
                        b = p.map(val, 0, 1, 50, 255);
                    }

                    // If not hovering and not training, dim it?
                    // No, keeping it always visible is better for Glass Box
                    p.fill(r, 50, b);

                    // Store position for click detection
                    nodePositions.push({
                        x: x, y: y, r: 20,
                        neuron: neuron // Reference to actual object
                    });
                }

                // Draw Node
                if (isSelected) {
                    p.stroke(255, 255, 0); // Yellow highlight for selection
                    p.strokeWeight(3);
                } else {
                    p.stroke(255);
                    p.strokeWeight(1);
                }

                p.circle(x, y, 20);

                // Optional: Tooltip on hover over node?
            }
        }
    };

    p.mousePressed = () => {
        // Detect click on nodes
        let clickedNode = null;
        console.log(`[NetViz] Click at ${p.mouseX}, ${p.mouseY}. Total nodes tracked: ${nodePositions.length}`);

        for (let np of nodePositions) {
            const d = p.dist(p.mouseX, p.mouseY, np.x, np.y);
            // console.log(`Checking node at ${np.x}, ${np.y}, dist=${d}`); // Commented out to avoid spam
            if (d < np.r / 2 + 5) {
                console.log("[NetViz] Hit node!", np.neuron.id);
                clickedNode = np.neuron;
                break;
            }
        }

        if (clickedNode) {
            if (state.selectedNeuron === clickedNode) {
                console.log("[NetViz] Deselecting neuron");
                state.selectedNeuron = null; // Toggle off
            } else {
                console.log("[NetViz] Selecting neuron", clickedNode.id);
                state.selectedNeuron = clickedNode;
            }
        } else {
            if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
                console.log("[NetViz] Clicked background, clearing selection");
                state.selectedNeuron = null;
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

    const inputDiv = document.createElement('div');
    inputDiv.className = 'layer-box';
    inputDiv.innerHTML = `<span>Inbox</span><b>2</b>`;
    container.appendChild(inputDiv);

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

    const outputDiv = document.createElement('div');
    outputDiv.className = 'layer-box';
    outputDiv.innerHTML = `<span>Out</span><b>1</b>`;
    container.appendChild(outputDiv);
}

window.changeNeurons = (layerIdx, delta) => {
    let newVal = state.config[layerIdx] + delta;
    if (newVal < 1) newVal = 1;
    if (newVal > 8) newVal = 8;
    state.config[layerIdx] = newVal;
    resetNetwork();
    renderLayerControls();
};

document.addEventListener('DOMContentLoaded', () => {
    try {
        generateXOR();
        resetNetwork();
        renderLayerControls();

        const ctx = document.getElementById('loss-chart').getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Loss', data: [], borderColor: '#ff4d4d', tension: 0.1 }] },
            options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { x: { display: false } } }
        });

        new p5(sketchMain);
        new p5(sketchNet);

        document.getElementById('btn-train').addEventListener('click', () => {
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
