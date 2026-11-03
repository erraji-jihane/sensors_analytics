# Sensor Analytics

**Live demo: [sensor-analytics-lilac.vercel.app](https://sensor-analytics-lilac.vercel.app)**

Fault detection and similarity search for factory sensor readings, implemented in plain Python (no NumPy or pandas), served through a TypeScript/Express API and explored in a React dashboard. Built as the midterm project of the Big Data Analytics course.

Each reading has an ID, four features (**temperature, vibration, pressure, rpm**) and a binary **fault** label. The pipeline covers distributed aggregation, standardization, top-k nearest-neighbour search (sort vs. heap), PCA compression, and a small neural network with a hand-derived backpropagation step.

> Only the four raw features enter distance calculations and PCA. IDs and fault labels never do.

---

## Results

Measured on the 400-reading test set:

| Model | Test accuracy |
|---|---|
| Neural network (4 → 3 → 1) | **96.5%** |
| 5-NN, original 4-D space | 95.3% |
| 5-NN, after PCA to 2-D | 87.5% |
| Baseline: always predict "no fault" | 89.5% |

Compressing to 2-D keeps on average only 1.6 of the 5 true nearest neighbours for the query readings (32%), which is why k-NN drops below the baseline in PCA space.

## Highlights

- **Distributed means done right:** aggregates four unequal partitions (100 / 300 / 500 / 700 readings) by merging `(sums, count)` summaries, and shows why averaging local means is biased toward small partitions.
- **Two top-k strategies:** a sort-based baseline and a single-pass size-k max-heap, verified to return identical results, including ties.
- **Compression cost, measured:** projects standardized vectors from 4-D to 2-D with PCA and reports *neighbour preservation@5*.
- **Neural network from first principles:** forward pass and output-layer gradient, checked against a finite-difference estimate.
- **End-to-end app:** the dashboard sends a reading to the API, which runs it through the same tested Python functions. Nothing is mocked.
- **CI:** GitHub Actions runs the 13 pipeline checks, builds the API, and tests and builds the dashboard on every push.

## Architecture

```text
React dashboard  ──HTTP/JSON──▶  Express API (TypeScript)  ──stdin/stdout JSON──▶  python/service.py
  frontend/ :3000                  server/ :3001                                       │
                                                                                        ▼
                                                                         python/starter.py (pipeline)
                                                                         data/  params/
```

| Endpoint | Method | Body | Returns |
|---|---|---|---|
| `/api/health` | GET | — | `{ status: "ok" }` |
| `/api/predict` | POST | `{ temp, vib, press, rpm }` | fault probability, verdict, standardized input, hidden activations |
| `/api/similarity` | POST | `{ temp, vib, press, rpm }` | top-5 neighbours (original and PCA space) with labels, preservation@5, 5-NN vote |
| `/api/overview` | GET | — | test-set accuracies and the 2-D PCA map of the training set |

Invalid input returns HTTP 400 with `{ error }`.

**In production (Vercel)**, the same endpoints are served by small Python functions in `api/` that call `python/service.py` directly, so the deployed site and local development run identical analytics code. The Express server in `server/` is used for local development.

## Project structure

```text
sensors_analytics/
├── data/
│   ├── train.csv            # 1,600 labelled readings
│   ├── test.csv             # 400 labelled readings
│   └── queries.csv          # 5 unlabelled query readings (Q1–Q5)
├── params/                  # Supplied artifacts (read-only)
│   ├── feature_stats.csv    # Training mean and std per feature
│   ├── pca_mean.csv         # PCA centering vector
│   ├── pca_projection.csv   # 4×2 projection matrix
│   └── nn_weights.txt       # Network weights and learning rate η = 0.10
├── python/
│   ├── starter.py           # Pipeline implementation + report generator
│   ├── service.py           # JSON bridge used by the API
│   └── check.py             # 13 validation checks
├── api/                     # Vercel Python functions (production API)
├── server/                  # Express + TypeScript API (local development)
├── frontend/                # React + TypeScript dashboard (Recharts)
├── docs/
│   └── worked_update_R1377.md   # Forward pass + weight update worked by hand
└── .github/workflows/ci.yml
```

## Quick start

Requires Python 3 and Node.js 18+. The Python side uses the standard library only.

```bash
# 1. Pipeline
python3 python/check.py      # 13 validation checks
python3 python/starter.py    # full report, also written to python/results.md

# 2. API  (new terminal)
cd server
npm install
npm run build
npm start                    # http://localhost:3001

# 3. Dashboard  (new terminal)
cd frontend
npm install
npm start                    # http://localhost:3000
```

Configuration: `PORT` and `PYTHON` (path to the Python executable) for the API; `REACT_APP_API_URL` for the dashboard.

## How it works

### 1. Distributed aggregation
- `local_summary(part)` returns `(sums, count)` for one partition, so raw data never has to leave the partition.
- `merge_summaries(summaries)` sums across partitions and divides by the total count (1,600). This is the **correct** global mean.
- `mean_of_local_means(summaries)` averages the four local means equally. This is **incorrect**: it ignores partition size, and the code keeps it to show the bias.

### 2. Standardization and similarity search
- `standardize(x, means, stds)` computes `z = (x − mean) / std` using the training statistics. Without it, RPM (≈2,000) would dominate every distance.
- `squared_distance(a, b)` computes `Σ(a − b)²`. The square root is skipped because it is monotonic, so the ranking is unchanged.
- `topk_sort(...)` scores every reading, sorts, and keeps the best 5 (ties go to the smaller index).
- `topk_heap(...)` makes one pass with a size-5 max-heap whose root is the worst of the current best 5. It gives the same output with O(n log k) work instead of O(n log n).

### 3. PCA compression
- `project(z, pca_mean, proj)` computes `y = (z − μ_PCA)ᵀ P`, which maps 4-D to 2-D.
- `neighbor_preservation(orig_ids, pca_ids)` returns the overlap between the original and the PCA top-5 (0–5).

### 4. Neural network
- `forward(z, nn)` computes `a = W₁z + b₁`, then `h = ReLU(a)`, then `ŷ = σ(v·h + c)`.
- `output_weight_update(z, y, nn, j)` computes `∂L/∂vⱼ = (ŷ − y)·hⱼ` and returns `vⱼ − η·∂L/∂vⱼ`, leaving the network unchanged.

A full hand-worked example for reading **R1377** (true label 1, ŷ = 0.3130) is in [`docs/worked_update_R1377.md`](docs/worked_update_R1377.md).

## Next steps

- [ ] Add screenshots of the dashboard here.
- [ ] Keep the Python process warm instead of starting one per request.

## Tech stack

Python 3 (standard library only) · TypeScript · Node.js / Express · React · Recharts · GitHub Actions
