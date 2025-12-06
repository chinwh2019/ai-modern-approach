# Introduction to AI in Modern Approach

An interactive web-based educational platform for learning core Artificial Intelligence concepts through visual demonstrations and hands-on experimentation.

🌐 **Live Demo**: [https://chinwh2019.github.io/ai-modern-approach/](https://chinwh2019.github.io/ai-modern-approach/)

## Features

This platform provides interactive visualizations for four core AI domains:

### 🔍 Search Algorithms
Visualize and compare classic pathfinding algorithms:
- **Breadth-First Search (BFS)**: Explores level by level
- **Depth-First Search (DFS)**: Explores as deep as possible before backtracking
- **A* Search**: Optimal pathfinding using heuristics
- **Uniform Cost Search (UCS)**: Finds minimum cost paths

**Interactive Controls:**
- Edit terrain costs (walls, swamp, grass, road)
- Randomize map layouts
- Randomize start/goal positions
- Real-time path visualization with step-by-step exploration

### 🎯 Markov Decision Processes (MDPs)
Explore Value Iteration on a grid world with dynamic terrain:
- **Value Iteration**: Compute optimal values for each state
- **Policy Visualization**: See the best action at each state
- **Discount Factor (γ)**: Control how much the agent values future rewards
- **Grid Editor**: Paint walls, goals, and holes to create custom environments
- **Probability Dynamics**: Non-deterministic movements (intended action has 80% success rate)

### 🤖 Reinforcement Learning (Q-Learning)
Train an agent to navigate a grid world using Q-Learning:
- **Training Mode**: Watch the agent learn through trial and error
- **Testing Mode**: Observe the learned policy in action
- **Value Iteration Comparison**: Compare Q-Learning vs. Value Iteration
- **Hyperparameter Tuning**: Adjust learning rate (α), discount factor (γ), and exploration (ε)
- **Save/Load Policy**: Persist and restore trained Q-tables
- **Reward Chart**: Track learning progress over episodes

### 🐍 Snake RL
A Snake game environment demonstrating Q-Learning with simplified state representation:
- **Q-Learning Agent**: Learns to play Snake from scratch
- **Simplified State Space**: Uses danger detection and relative food direction for efficient learning
- **Training Speed Control**: Accelerate training up to 50x speed
- **Save/Load Policy**: Save trained snakes and load them back
- **Test Mode**: Automatically runs the agent without further learning after loading a policy
- **Real-time Visualization**: Watch the snake learn and improve over time

### 🌀 Unsupervised Learning
Interactive K-Means clustering playground to discover patterns in data:
- **K-Means Algorithm**: Visualize assignment and update steps in real-time
- **Interactive Data**: Paint data points directly on the canvas
- **Live Metrics**: Track Convergence and Inertia (Total Error)
- **Datasets**: Presets for Random, Blobs, Rings (failure case), and Smiley
- **Adjustable K**: Dynamically change the number of clusters

## Technologies Used

- **Vite**: Fast build tool and dev server
- **p5.js**: Canvas-based visualizations and animations
- **Chart.js**: Interactive reward/performance charts
- **D3.js**: Data manipulation and utilities
- **KaTeX**: Beautiful math rendering for equations
- **Vanilla JavaScript**: No heavy frameworks, just clean JS

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/chinwh2019/ai-modern-approach.git
cd ai-modern-approach
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Usage Guide

### Search Algorithms
1. Select an algorithm from the dropdown
2. (Optional) Click on the grid to edit terrain types
3. (Optional) Use "Randomize Map" or "Randomize Positions" for variety
4. Click "Run Search" to visualize the pathfinding process
5. Observe the explored nodes (light blue) and final path (cyan)

### MDP (Value Iteration)
1. Adjust the discount factor (γ) to control future reward valuation
2. Use the grid editor to paint custom environments:
   - **Wall**: Impassable obstacles
   - **Goal**: Target destination (+1 reward)
   - **Hole**: Dangerous areas (-1 reward)
3. Click "Reset VI" to compute the optimal value function
4. Watch the arrows showing the optimal policy at each state

### Reinforcement Learning
1. **Training**:
   - Adjust hyperparameters (α, γ, ε) as needed
   - Click "Start Training" to begin learning
   - Increase speed for faster training
   - Watch the reward chart to track progress
2. **Testing**:
   - Click "Start Testing" to see the learned policy
   - The agent will exploit its knowledge without exploring
3. **Persistence**:
   - Click "Save Policy" to store the Q-table
   - Click "Load Policy" to restore a saved policy

### Snake RL
1. **Training**:
   - Click "Start Training" to begin training
   - Adjust "Training Speed" (1-50x) to speed up learning
   - Adjust "Exploration (ε)" to control exploration vs. exploitation
   - Watch the episode reward chart for learning progress
2. **Testing**:
   - Train for 500-1000 episodes for good performance
   - Click "Save Policy" to save your trained snake
   - Click "Load Policy" to restore and watch it play automatically
   - The snake will enter "Test Mode" and play using the learned policy
3. **Tips**:
   - Higher scores (10+) typically appear after 500+ episodes
   - Lower exploration (ε ≈ 0.05) during later training improves performance
   - The agent uses a simplified state representation for fast learning

### Unsupervised Learning
1. **Setup**:
   - Choose a preset (Blobs, Rings, etc.) or click on the canvas to draw points
   - Adjust "Number of Clusters (K)" using the slider
2. **Execution**:
   - Click "Step" to see a single iteration
   - Click "Run to Convergence" to animate the full process
3. **Observation**:
   - Watch the centroids (squares) move to the center of their clusters
   - Observe the "Total Inertia" graph decrease as the algorithm improves
   - Try the "Rings" preset to see where K-Means fails!

## Project Structure

```
intro-ai-modern/
├── index.html          # Landing page
├── search.html         # Search algorithms page
├── mdp.html           # MDP page
├── rl.html            # Reinforcement Learning page
├── snake.html         # Snake RL page
├── unsupervised.html  # Unsupervised Learning page
├── src/
│   ├── main.js        # Landing page logic
│   ├── search.js      # Search algorithms implementation
│   ├── mdp.js         # MDP and Value Iteration
│   ├── rl.js          # Q-Learning implementation
│   ├── snake.js       # Snake RL implementation
│   ├── unsupervised.js # K-Means implementation
│   └── style.css      # Global styles
├── public/
│   └── logo.png       # Project logo
└── vite.config.js     # Vite configuration
```

## Key Concepts

### State Representation (Snake RL)
The Snake agent uses a simplified 7-bit state representation:
- **Danger Detection (3 bits)**: Is there danger straight ahead, to the right, or to the left?
- **Food Direction (4 bits)**: Is food ahead, to the right, to the left, or behind?

This relative encoding (rather than absolute grid positions) dramatically reduces the state space from 20×20×20×20 = 160,000 states to just 2^7 = 128 states, enabling rapid learning.

### Q-Learning Update Rule
```
Q(s,a) ← Q(s,a) + α[r + γ·max(Q(s',a')) - Q(s,a)]
```
Where:
- `α` (alpha): Learning rate
- `γ` (gamma): Discount factor
- `r`: Reward
- `s`: Current state
- `a`: Action taken
- `s'`: Next state

## Author

**Dr. Chin Wei Hong**  
GitHub: [@chinwh2019](https://github.com/chinwh2019)

## License

This project is open source and available for educational purposes.

## Acknowledgments

Inspired by classic AI textbooks and modern reinforcement learning research. Built to make AI concepts accessible and interactive for learners.
