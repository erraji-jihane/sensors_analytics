markdown
# Sensor Analytics Midterm

A small analytics pipeline for factory sensor readings. Each reading has an ID, four features (temperature, vibration, pressure, rpm) and a binary fault label. IDs and fault labels never enter distance calculations or PCA.

---

## Project structure

```text
sensors_analytics/
├── data/                      # raw Excel inputs
│   ├── train.xlsx             # 1,600 training readings (in collection order)
│   ├── test.xlsx              # 400 test readings
│   └── queries.xlsx           # Q1–Q5, no label
├── params/                    # supplied artifacts, READ-ONLY
│   ├── feature_stats.csv      # training mean and std per feature
│   ├── pca_mean.csv           # PCA centering vector
│   ├── pca_projection.csv     # fitted 4×2 projection matrix
│   └── nn_weights.txt         # 4→3→1 network weights + learning rate η = 0.10
├── src/
│   ├── data_loader.py         # loads Excel + cleans -> (ids, X, labels)
│   ├── starter.py             # ALL analytics functions + main() + results writer
│   ├── check.py               # supplied checks (do not edit)
│   └── results.md             # generated output table
├── docs/
│   └── worked_update_R1377.md # Part 4 Q3 worked update, by hand
├── answers.md                 # short answers (Parts 1–5) + pasted check output
└── README.md
Setup:

bash
pip install pandas openpyxl
Run (from project root):

bash
python3 src/starter.py     # runs pipeline, writes src/results.md
python3 src/check.py       # validates functions
Part 1 — Partitioned analytics
The 1,600 training readings are split, in file order, into four unequal partitions of 100, 300, 500 and 700 readings — imagined on four machines.

Function	Role
local_summary(part)	For one partition: returns (sums, count) — per-feature sums + number of readings. No division (division is deferred to the merge).
merge_summaries(summaries)	Correct method. Adds the four partitions' sums per feature, divides by the total count (1,600) → weighted global means. Each reading counts once.
mean_of_local_means(summaries)	Incorrect method (by design). Computes each partition's local mean (sums/count), then averages the four means equally (÷4). Ignores partition size.
Why the two differ: partitions are unequal (100/300/500/700). The weighted merge lets the 700-reading partition contribute 7× the small one; the unweighted average gives every partition 25%, biasing toward small partitions.

When unweighted would be correct: only if all partitions had equal size.

Part 1 uses raw X, not standardized. Its means are a demonstration; the pipeline uses the supplied feature_stats.csv for standardization.

Part 2 — Exact similarity search
For each query Q1–Q5, find the five closest training readings.

Function	Role
standardize(x, means, stds)	z[j] = (x[j] − means[j]) / stds[j] using the supplied training mean/std. Applied to train, test and queries alike (no leakage).
squared_distance(a, b)	Σ(a[j] − b[j])², no square root. Uses len(a), so it also works on 2-D PCA vectors later.
topk_sort(query, vectors, ids, k)	Scores every vector, sorts by (distance, row index) (ties → smaller index), returns best 5 as (id, distance) ascending.
topk_heap(query, vectors, ids, k)	Same output, but one pass with a size-5 max-heap. Python's heapq is a min-heap, so keys are negated (-distance, -index); the root is the worst of the best 5 and is replaced only by a closer candidate. Final sort of the 5 for output.
Why standardize: the features have different units (RPM ~2000 vs temperature ~70); without it, RPM dominates every distance.

Why squared distance: squaring is monotonic for non-negatives, so the ranking equals Euclidean distance — cheaper, no sqrt.

Complexity: sort = O(n log n) time, O(n) space; heap = O(n log k) time, O(k) space. Neither avoids scanning all n readings.

Output: top-5 per query from both methods plus a "Heap = sort?" column.

Part 3 — PCA compression
Applies the supplied PCA transform; PCA is never fitted here. For a standardized vector z: y = (z − μ_PCA)ᵀ P, with P a 4×2 matrix.

Function	Role
project(z, pca_mean, proj)	Subtracts the supplied PCA mean from z, multiplies by the 4×2 projection matrix → a 2-D vector.
neighbor_preservation(original_ids, reduced_ids)	Counts how many IDs appear in BOTH the original-space top-5 and the PCA-space top-5 (0 to 5). Measures information lost to compression.
Output: per-query neighbour sets in both spaces, preservation@5 per query and on average, and test-set 5-NN fault accuracy in both spaces.

Part 4 — Neural-network execution
A supplied 4→3→1 network: a = W1·z + b1, h = relu(a), ŷ = sigmoid(v·h + c). One forward pass and one weight update — no training.

Function	Role
forward(z, nn)	Computes a (hidden pre-activations), h = relu(a) (hidden activations), and ŷ = sigmoid(v·h + c). Returns (a, h, ŷ).
output_weight_update(z, y, nn, j)	For output weight v_j: gradient dL/dv_j = (ŷ − y)·h_j and new value v_j − η·dL/dv_j. Returns (gradient, new_value) without modifying nn.
Worked example: test reading R1377 (67.7°C, 3.56 mm/s, 6.08 bar, 2225 RPM, fault = 1), η = 0.10. The hand calculation must match the program output to 4 decimal places.

Part 5 — Interpretation
Written answers (≤200 words): is 2-D PCA acceptable for similarity search (citing preservation@5 and test accuracies), two pipeline limitations, and why an RNN/LSTM/GRU suits the "previous 20 readings" extension better than treating readings independently.

Outputs
File	Contents	Written by
src/results.md	Results table: Part 1 means, Part 2 top-5 + "Heap = sort?", Part 3 preservation + accuracies, Part 4 R1377 values	starter.py (auto)
answers.md	Short answers (Parts 1–5) + pasted check.py output	you
docs/worked_update_R1377.md	Part 4 Q3 worked update by hand, 4 dp	you
Rule: IDs and fault labels never enter distance calculations or PCA — only the four features (r["x"]) do.

text

### Why it will work now:
1. I added a blank line **before and after** every `| --- | --- |` table.
2. I added a blank line **before and after** every ` ``` ` code block.
3. The headings `##` now have space to breathe.

### One more tip for your code:
I see in your VS Code terminal that you typed `$ git push` but nothing happened. If it hung, it might be waiting for your GitHub credentials, or you haven't committed your changes yet (`git add .` then `git commit -m "Update"` then `git push`). 

Once you paste this updated README, run:
```bash
git add README.md
git commit -m "Fix README formatting for GitHub"
git push
