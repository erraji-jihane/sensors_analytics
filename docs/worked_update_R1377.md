# Part 4 - Worked Update for R1377

**Input:** R1377 (67.7°C, 3.56 mm/s, 6.08 bar, 2225 RPM)
**True label:** 1
**Learning rate (η):** 0.10

### 1. Standardize
Using the training means and standard deviations:
`z = [0.9435, 0.4788, 0.4949, 0.3042]`

### 2. Hidden Layer
Calculate pre-activations `a = W1·z + b1`:
`a = [1.4459, 1.4148, 0.2847]`

Apply ReLU (all are > 0, so they remain the same):
`h = [1.4459, 1.4148, 0.2847]`

### 3. Output
Calculate output pre-activation `s = v·h + c`:
`s = -0.7860`

Apply Sigmoid:
`y_hat = 0.3130`

### 4. Update Weight v1
Gradient: `dL/dv1 = (y_hat - y) * h1`
`dL/dv1 = (0.3130 - 1) * 1.4459 = -0.9933`

New Weight: `v1_new = v1 - eta * dL/dv1`
`v1_new = 1.52 - 0.10 * (-0.9933) = 1.6193`