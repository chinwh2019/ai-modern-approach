# Learning Activity: Advanced AI Concepts Report

## Instructions
Continue your exploration of AI with the advanced modules in the **Introduction to AI in Modern Approach** platform. Answer the following questions to deepen your understanding of unsupervised learning, supervised learning, and neural networks.

---

## Part 1: Unsupervised Learning (Clustering) 🌀

### Conceptual Understanding
1.  **K-Means Intuition**: Describe the "Expectation-Maximization" steps in K-Means. What happens during the "Assignment" step versus the "Update" step?

2.  **Choosing K**: Why is choosing the correct number of clusters ($K$) difficult? What happens to the "Total Inertia" (error) as $K$ increases, and why isn't $K=N$ (where $N$ is the number of points) the best solution?

3.  **Limitations**: K-Means assumes clusters are spherical and roughly equal in size. Why might it fail on shapes like concentric rings or crescents?

### Practical Observations
4.  **Convergence**: Use the "Random" preset. Run the algorithm multiple times (resetting each time) with the same $K$.
    -   Do the final centroids always end up in the exact same place?
    -   If not, why does the initialization matter?

5.  **Failure Cases**: Load the "Rings" preset.
    -   Run K-Means with $K=2$.
    -   Describe the result. Does it successfully separate the inner ring from the outer ring?
    -   Explain why the algorithm behaves this way based on how it calculates distance.

---

## Part 2: Supervised Learning 📈

### Conceptual Understanding
6.  **Regression vs. Classification**: What is the fundamental difference in the *output* of a regression model versus a classification model? Give an example of each from the real world.

7.  **Overfitting (Polynomial Degrees)**:
    -   What happens if you try to fit a simple linear pattern with a degree 10 polynomial?
    -   Why is a model that passes through *every* data point often considered "bad" for generalization?

8.  **Decision Boundary**: In Logistic Regression, what does the "decision boundary" represent? How does the linear equation $w_1x + w_2y + b = 0$ create a straight line separation?

### Practical Observations
9.  **Learning Rate Effects**:
    -   Set the Learning Rate ($\alpha$) to very high (0.1) and try to train a Regression model. What happens to the loss?
    -   Set it to very low (0.001). What happens to the training speed?

10. **The "Outlier" Problem**:
    -   Create a nice linear set of points. Train a Degree 1 model.
    -   Add a single outlier point far away from the line.
    -   Retrain. How much does that single point "pull" the line? What does this tell you about the robustness of Mean Squared Error?

---

## Part 3: Deep Learning (Neural Networks) 🧠

### Conceptual Understanding
11. **Hidden Layers**: Why do we need "hidden layers"? Why can't a single-layer network (just input connected to output) solve the XOR problem?

12. **Activation Functions**: The playground uses `Tanh` for hidden layers. What would happen if we removed the non-linear activation functions and just used linear arithmetic? Could the network still learn curved boundaries?

13. **"Glass Box" Interpretability**: In the visualization, you can see the output of every neuron. How does an early layer's representation differ from a deeper layer's representation?

### Practical Observations
14. **Solving XOR**:
    -   Load the "XOR" preset (4 points, diagonal classes).
    -   Try to train with **0 hidden layers** (just Input -> Output). Can it reach 0 loss?
    -   Add **1 hidden layer** with 4 neurons. Train again. Can it solve it now?
    -   Sketch or take a screenshot of the decision boundary.

15. **Manifold Manipulation**:
    -   Load the "Spiral" preset. This is a hard problem!
    -   Experiment with the architecture: How many layers and neurons do you need to solve it reasonably well? (Hint: Try 2 hidden layers with 6-8 neurons each).
    -   Watch the "Network Viz" (bottom panel) while training. Describe how the internal neurons change color as they specialize.

---

## Part 4: Synthesis and Reflection 🎓

### Critical Thinking
16. **The "Black Box" Problem**: You used the "Glass Box" features to see inside the network. In real-world massive networks (like LLMs), we can't easily visualize every neuron. What challenges does this lack of interpretability create for AI safety?

17. **Algorithm Selection**:
    -   You have a dataset of customer purchase histories labeled "Fraud" or "Legit". Which module's technique is most relevant?
    -   You have a dataset of customer purchase histories *without* any labels and want to find "types" of shoppers. Which module would you use?

### Design Challenge
18. **Feature Engineering**: In the Snake RL module (previous activity), we engineered features (danger left, food right, etc.). In the Deep Learning module, we fed raw $(x, y)$ coordinates.
    -   Does Deep Learning remove the need for manual feature engineering? Why or why not?
