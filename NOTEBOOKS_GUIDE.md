# 📘 Student Guide: AI & Machine Learning Notebooks

Welcome! This guide is designed to walk you through the practical notebooks provided in this course. We will focus on two key areas of Unsupervised Learning: **Clustering** and **Self-Organizing Maps (SOMs)**.

All notebooks are optimized to run on **Google Colab**.

---

## 🚀 Getting Started

### 1. Google Colab
*   These notebooks are hosted on GitHub but are best run in the cloud using Google Colab.
*   **No Setup Required**: You do not need to install python or libraries locally. The notebooks install everything they need (or use standard libraries).
*   **Data**: The notebooks automatically download required datasets from the web or generate synthetic data if you are offline.

### 2. Common Libraries
You will frequently see these libraries:
*   `pandas`: For data manipulation (like Excel for Python).
*   `numpy`: For math and matrix operations.
*   `matplotlib` / `seaborn`: For visualization and plotting graphs.
*   `scikit-learn` (`sklearn`): The industry standard for classical machine learning algorithms.

---

## 📒 Notebook 1: Unsupervised Learning (Clustering)
**File**: `notebooks/unsupervised_learning.ipynb`

### 🎯 Goal
Understand how to group unlabeled data into meaningful "clusters." We use a dataset of Mall Customers to segment them based on **Annual Income** and **Spending Score**.

### 🧠 Key Concepts
1.  **K-Means Clustering**: An algorithm that partitions data into $K$ distinct clusters.
2.  **Elbow Method**: A technique to determine the optimal number of clusters ($K$).
3.  **Hierarchical Clustering**: Building a tree of clusters (Dendrogram) to see data relationships at different levels.

### 👣 Step-by-Step Walkthrough

#### Step 1: Data Preparation
*   We load the "Mall Customers" dataset.
*   **Synthetic Fallback**: If the internet is down or the dataset URL changes, the notebook detects this and automatically generates "fake" mall data so you can still learn the concepts!

#### Step 2: The Elbow Method (Finding K)
*   **Question**: How many groups of customers are there? 3? 5? 10?
*   **Logic**: We run K-Means for $K=1$ to $K=10$ and calculate the **WCSS** (Within-Cluster Sum of Squares). This measures how "tight" the clusters are.
*   **Visual**: Look for the "elbow" (bend) in the graph. Adding more clusters after this point gives diminishing returns. Usually, **K=5** is the sweet spot for this dataset.

#### Step 3: Training the Model
*   We initialize `KMeans(n_clusters=5)` and fit it to our Income/Score data.
*   The model assigns a cluster label (0-4) to every customer.

#### Step 4: Visualization
*   The final plot shows customers colored by their group.
*   **Interpretation**:
    *   **High Income, Low Spending**: "Misers" (Potential savers).
    *   **High Income, High Spending**: "Target" (VIPs).
    *   **Low Income, High Spending**: "Careless" (Risk of debt).

---

## 📒 Notebook 2: Credit Card Fraud Detection (SOMs)
**File**: `notebooks/som_credit_card.ipynb`

### 🎯 Goal
Use a **Self-Organizing Map (SOM)** to detect outliers in credit card applications. Outliers in this context are potential fraud cases.

### 🧠 Key Concepts
1.  **Self-Organizing Map (SOM)**: A type of Artificial Neural Network trained using unsupervised learning to produce a low-dimensional (usually 2D) representation of the input space.
2.  **Dimensionality Reduction**: Compressing complex data (many features like Age, Debt, Income) into a simple map.
3.  **Outlier Detection**: Fraudulent patterns often don't fit the "normal" clusters and end up isolated.

### 👣 Step-by-Step Walkthrough

#### Step 1: Data Preprocessing
*   **Data**: The "Credit Card Applications" dataset from the UCI Machine Learning Repository.
*   **Scaling**: SOMs are very sensitive to scale. We use `MinMaxScaler` to squeeze all values (Age 20-80, Income 0-100k) into a **0 to 1** range. This prevents high-value columns like "Income" from dominating the map.

#### Step 2: Training the SOM
*   **Custom Class**: We use a `SimpleSOM` class written from scratch! This helps you see the math inside (finding the winning neuron, updating weights).
*   **Training**: The SOM adjusts its grid of neurons to match the shape of the data. Similar customers "pull" neurons closer to them.

#### Step 3: The Distance Map (U-Matrix)
*   **Logic**: We measure the distance between each neuron and its neighbors.
*   **Visual**: The background of the map (dark to light).
*   **Interpretation**:
    *   **Dark Areas**: Neurons are close to each other. This is a dense cluster of "normal" data.
    *   **Light/White Areas**: Large distances. These neurons are far from their neighbors. Any data point landing here is an **Outlier** (Potential Fraud).

#### Step 4: Catching the Bad Guys
*   We plot markers on the map:
    *   **Green Squares**: Approved Applications.
    *   **Red Circles**: Rejected Applications.
*   **The detective work**: Look for winning neurons that are in the "White" (outlier) areas. We extract the list of customers associated with these specific neurons—these are our fraud suspects.

### 💡 Tips for Students
*   **Don't memorize code**: Focus on the *logic*. Why did we scale the data? Why did we pick K=5?
*   **Experiment**: Try changing `n_clusters` in K-Means to 3 or 8. What happens to the customer groups? Do they still make sense?
*   **Interactive Controls**: Use the interactive sliders in the SOM notebook to see how changing "Age" or "Income" moves your position on the risk map.

---
Happy Coding! 🤖
