"""JSON bridge between the API and the analytics pipeline in starter.py.

Usage (one request per process):
    echo '{"action": "predict", "reading": {"temperature": 67.7, "vibration": 3.56,
           "pressure": 6.08, "rpm": 2225}}' | python3 python/service.py

Actions:
    predict     -> fault probability from the 4-3-1 network, plus its hidden activations
    similarity  -> top-5 neighbours in the original and PCA spaces, preservation, k-NN vote
    overview    -> model accuracies on the test set and the 2-D PCA map of the training set

Standard library only, like the rest of the pipeline. Reads one JSON object from
stdin and writes one JSON object to stdout; errors are returned as {"error": "..."}
with exit code 1.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import starter as S  # noqa: E402

ROOT = S.ROOT
FEATURES = S.FEATURES


def _path(*parts):
    return os.path.join(ROOT, *parts)


def load_context():
    train = S.load_readings(_path("data", "train.csv"))
    means, stds = S.load_stats(_path("params", "feature_stats.csv"))
    pca_mean, proj = S.load_pca(_path("params", "pca_mean.csv"), _path("params", "pca_projection.csv"))
    nn = S.load_nn(_path("params", "nn_weights.txt"))
    ids = [r["id"] for r in train]
    Z = [S.standardize(r["x"], means, stds) for r in train]
    Y = [S.project(z, pca_mean, proj) for z in Z]
    # The network only saw readings inside these ranges, so outside them its output means nothing
    ranges = [(min(r["x"][i] for r in train), max(r["x"][i] for r in train)) for i in range(len(FEATURES))]
    return {
        "train": train, "ids": ids, "Z": Z, "Y": Y,
        "means": means, "stds": stds, "pca_mean": pca_mean, "proj": proj, "nn": nn, "ranges": ranges,
        "by_id": {r["id"]: (r, z, y) for r, z, y in zip(train, Z, Y)},
    }


def parse_reading(payload):
    reading = payload.get("reading")
    if not isinstance(reading, dict):
        raise ValueError("'reading' must be an object with " + ", ".join(FEATURES))
    x = []
    for f in FEATURES:
        v = reading.get(f)
        if isinstance(v, bool) or not isinstance(v, (int, float)):
            raise ValueError(f"'{f}' must be a number")
        x.append(float(v))
    return x


def _round(values, n=4):
    return [round(v, n) for v in values]


def predict(ctx, x):
    z = S.standardize(x, ctx["means"], ctx["stds"])
    a, h, y_hat = S.forward(z, ctx["nn"])
    return {
        "probability": round(y_hat, 4),
        "isFault": y_hat >= 0.5,
        "z": _round(z),
        "hidden": _round(h),
        "outOfRange": [
            {"feature": f, "value": v, "min": lo, "max": hi}
            for f, v, (lo, hi) in zip(FEATURES, x, ctx["ranges"]) if not lo <= v <= hi
        ],
    }


def similarity(ctx, x, k=S.K):
    z = S.standardize(x, ctx["means"], ctx["stds"])
    y = S.project(z, ctx["pca_mean"], ctx["proj"])
    original = S.topk_heap(z, ctx["Z"], ctx["ids"], k)
    reduced = S.topk_heap(y, ctx["Y"], ctx["ids"], k)

    def describe(results):
        out = []
        for rid, dist in results:
            r, _, ry = ctx["by_id"][rid]
            out.append({
                "id": rid,
                "distance": round(dist, 4),
                "fault": r["fault"],
                "reading": dict(zip(FEATURES, r["x"])),
                "pca": _round(ry),
            })
        return out

    votes = sum(ctx["by_id"][rid][0]["fault"] for rid, _ in original)
    preserved = S.neighbor_preservation([i for i, _ in original], [i for i, _ in reduced])
    return {
        "query": {"z": _round(z), "pca": _round(y)},
        "neighbors": describe(original),
        "pcaNeighbors": describe(reduced),
        "preservation": preserved,
        "k": k,
        "knnFaultVotes": votes,
        "knnIsFault": votes * 2 > k,
    }


def overview(ctx):
    test = S.load_readings(_path("data", "test.csv"))
    labels = [r["fault"] for r in ctx["train"]]
    Zt = [S.standardize(r["x"], ctx["means"], ctx["stds"]) for r in test]
    Yt = [S.project(z, ctx["pca_mean"], ctx["proj"]) for z in Zt]
    tl = [r["fault"] for r in test]
    nn_acc = sum(int((S.forward(z, ctx["nn"])[2] >= 0.5) == bool(y)) for z, y in zip(Zt, tl)) / len(tl)
    return {
        "trainSize": len(ctx["train"]),
        "testSize": len(test),
        "trainFaultRate": round(sum(labels) / len(labels), 4),
        "accuracy": {
            "neuralNetwork": round(nn_acc, 4),
            "knnOriginal": round(S.knn_fault_accuracy(ctx["Z"], labels, Zt, tl, S.topk_heap, ctx["ids"]), 4),
            "knnPca": round(S.knn_fault_accuracy(ctx["Y"], labels, Yt, tl, S.topk_heap, ctx["ids"]), 4),
            "alwaysNoFault": round(1 - sum(tl) / len(tl), 4),
        },
        "pcaMap": [
            {"id": r["id"], "pc1": round(y[0], 4), "pc2": round(y[1], 4), "fault": r["fault"]}
            for r, y in zip(ctx["train"], ctx["Y"])
        ],
    }


def handle(payload):
    action = payload.get("action")
    if action not in ("predict", "similarity", "overview"):
        raise ValueError("'action' must be one of: predict, similarity, overview")
    ctx = load_context()
    if action == "overview":
        return overview(ctx)
    x = parse_reading(payload)
    return predict(ctx, x) if action == "predict" else similarity(ctx, x)


def main():
    try:
        payload = json.loads(sys.stdin.read() or "{}")
        if not isinstance(payload, dict):
            raise ValueError("request must be a JSON object")
        result = handle(payload)
    except (ValueError, json.JSONDecodeError) as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
