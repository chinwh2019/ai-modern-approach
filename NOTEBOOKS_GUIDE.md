# 📘 Student Guide: AI & Machine Learning Notebooks

Welcome! This guide is designed to walk you through the practical notebooks provided in this course. We will focus on two key areas of Unsupervised Learning: **Clustering** and **Self-Organizing Maps (SOMs)**.

All notebooks are optimized to run on **Google Colab**.

---

## 🚀 Getting Started

### 1. Google Colab
*   These notebooks are hosted on GitHub but are best run in the cloud using Google Colab.
*   **No Setup Required**: You do not need to install python or libraries locally. The notebooks install everything they need (or use libraries available in Colab).
*   **Data**: The notebooks automatically download required datasets from the web or generate synthetic data if you are offline.

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
1.  **Data Preparation**: Load "Mall Customers" data (or synthetic fallback).
2.  **Elbow Method**: Run K-Means for various $K$ to find the "elbow" (optimal $K=5$).
3.  **Model Training**: Fit KMeans with 5 clusters.
4.  **Visualize**: Plot customers colored by group (e.g., "Careless", "Sensible", "Target").

---

## 📒 Notebook 2: Synthetic Fraud Lab (SOMs)
**File**: `notebooks/som_fraud_detection.ipynb`

### 🎯 Goal
A pure "Lab" environment to experiment with SOMs for anomaly detection using **Synthetic Data**. Unlike the Credit Card notebook which uses real data, this one auto-generates data, making it perfect for understanding the *theory* without data cleaning headaches.

### 🧠 Key Concepts
1.  **Synthetic Data Generation**: Using `make_blobs` to create "Normal" clusters and manually injecting "Fraud" outliers.
2.  **Anomaly Detection**: Using the visual distance map to identify data points that don't belong.

### 👣 Step-by-Step Walkthrough
1.  **The Setup**: Notebook generates 500 normal transactions and 20 fraud cases.
2.  **Training**: Trains a Scratch-built SOM (`SimpleSOM`) on the clean data.
3.  **Visualizing**: Observe how outliers Map to "white" (high distance) nodes.
4.  **Interactive Simulator**: Use sliders to create a fake transaction and see if the SOM flags it as "Suspicious" in real-time.

---

## 📒 Notebook 3: Credit Card Fraud Detection (SOMs)
**File**: `notebooks/som_credit_card.ipynb`

### 🎯 Goal
Apply SOMs to a **Real-World** scenario using the UCI Credit Card Applications dataset. This involves real data cleaning and deeper analysis.

### 🧠 Key Concepts
1.  **Dimensionality Reduction**: Compressing many features (Age, Debt, Income) into a simple 2D map.
2.  **Outlier Detection**: Finding fraudulent applications that don't fit normal patterns.

### 👣 Step-by-Step Walkthrough
1.  **Preprocessing**: Load real UCI data, handle missing values, and use `MinMaxScaler` (Crucial for SOMs!).
2.  **Training**: Train the `SimpleSOM` on the complex real-world data.
3.  **The Distance Map**: Visualize the U-Matrix. Dark areas are normal clusters; Light areas are potential outliers.
4.  **Catching Fraud**: Identify specific neurons in outlier zones and extract the list of customers mapped to them.

---

## 💡 Student Tips
*   **Focus on Logic**: Don't just run cells. Ask "Why did we scale this data?" or "Why K=5?".
*   **Experiment**: Change `n_clusters` or SOM grid size (e.g., 5x5 vs 20x20). What happens?
*   **Interactive Controls**: Use the widgets in the SOM notebooks to build your intuition.

Happy Coding! 🤖
