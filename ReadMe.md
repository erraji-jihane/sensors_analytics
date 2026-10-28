# Sensor Analytics Pipeline

A small analytics pipeline for factory sensor readings. Each reading has an ID, four features (temperature, vibration, pressure, rpm) and a binary fault label. 

**Important Rule:** IDs and fault labels never enter distance calculations or PCA — only the four raw features (`r["x"]`) do.

---

## Pipeline Architecture & Branching

Instead of a simple folder list, here is how the data flows and branches through the pipeline:

```text
[ data/train.xlsx ] ──────────────┐
                                  │
                                  ├──▶ (1) AGGREGATION (Part 1)
                                  │    ├─ local_summary()   ─▶ [Partitions]
                                  │    ├─ merge_summaries() ─▶ [Weighted Means]
                                  │    └─ mean_of_locals()  ─▶ [Unweighted Means]
                                  │
[ data/test.xlsx ] ───────────────┤
[ data/queries.xlsx ] ────────────┤
                                  │
                                  ├──▶ (2) PREPROCESSING
                                  │    └─ standardize(x)    ─▶ [ Z-vectors ]
                                  │
                                  ├──▶ (3) SIMILARITY SEARCH (Branching)
                                  │    ├─ topk_sort()       ─▶ [Sorted Top-5]
                                  │    └─ topk_heap()       ─▶ [Heap Top-5]  (Must Match!)
                                  │
                                  ├──▶ (4) PCA COMPRESSION
                                  │    ├─ project(Z)        ─▶ [ 2-D Vectors ]
                                  │    └─ neighbor_preservation() ─▶ [Overlap Score]
                                  │
                                  └──▶ (5) NEURAL NETWORK
                                       ├─ forward(Z)        ─▶ [ Predictions ]
                                       └─ output_update()   ─▶ [ Weight Gradients ]
Project File Tree
text
sensors_analytics/
├── data/                      # Raw Excel inputs
│   ├── train.xlsx             # 1,600 training readings
│   ├── test.xlsx              # 400 test readings
│   └── queries.xlsx           # Q1–Q5, no label
├── params/                    # Supplied artifacts, READ-ONLY
│   ├── feature_stats.csv      # Mean and std per feature
│   ├── pca_mean.csv           # PCA centering vector
│   ├── pca_projection.csv     # 4×2 projection matrix
│   └── nn_weights.txt         # Weights + learning rate η = 0.10
├── src/
│   ├── data_loader.py         # Loads Excel -> (ids, X, labels)
│   ├── starter.py             # Analytics functions + main() + writer
│   ├── check.py               # Supplied validation tests
│   └── results.md             # Generated output table
├── docs/
│   └── worked_update_R1377.md # Hand-written NN update
├── answers.md                 # Short answers + check output
└── README.md
Setup:

bash
pip install pandas openpyxl
Run (from project root):

bash
python3 src/starter.py     # runs pipeline, writes src/results.md
python3 src/check.py       # validates functions
Core Functions Explained
1. Distributed Aggregation
These functions handle the scenario where training data is split across four unequal partitions (100, 300, 500, 700 readings).

local_summary(part): Returns (sums, count) for one partition. Summarizes a partition without sending raw data.

merge_summaries(summaries): Sums features across all partitions, divides by total count (1600). Correct method. Weights by size, so big partitions matter more.

mean_of_local_means(summaries): Averages the local means equally (divides by 4). Incorrect method. Ignores partition size, biasing toward small ones.

Note: These functions use the raw X data, not standardized data.

2. Preprocessing & Similarity Search
Used to find the 5 closest training readings for each query.

standardize(x, means, stds): z = (x − mean) / std. Features have different units (RPM ~2000 vs Temp ~70). Without this, RPM dominates all distances.

squared_distance(a, b): Σ(a − b)². No square root. Cheaper than Euclidean; squaring is monotonic, so the ranking is identical.

topk_sort(query, vectors, ids, k): Scores all vectors, sorts by distance, keeps the best 5. Baseline reference method. Ties broken by smallest index.

topk_heap(query, vectors, ids, k): Scans once, keeps a size-5 max-heap of best candidates. Faster for large data. Root = worst of the best 5. Replaced only if a new point is closer.

3. PCA Compression
Applies the supplied 4→2 PCA transform to see how much information is lost.

project(z, pca_mean, proj): y = (z − μ_PCA)ᵀ P. Converts 4-D standardized vectors to 2-D. Tests if we can save storage/compute while keeping similar neighbors.

neighbor_preservation(orig_ids, pca_ids): Counts how many IDs appear in both the original top-5 and PCA top-5. Measures the cost of compression. Higher is better (max 5).

4. Neural Network Execution
A 4→3→1 network with ReLU hidden layers and sigmoid output.

forward(z, nn): a = W1·z + b1, h = relu(a), ŷ = sigmoid(v·h + c). Runs one forward pass to get the fault probability.

output_weight_update(z, y, nn, j): Computes gradient dL/dv_j and new weight v_j. Demonstrates one backpropagation step for the output layer.

Outputs
src/results.md: Results table: Means, Top-5 neighbors, PCA preservation, Network outputs. (Generated by starter.py)

answers.md: Short answers + pasted check.py output. (Written by you)

docs/worked_update_R1377.md: Handwritten/typed worked example for reading R1377. (Written by you)
