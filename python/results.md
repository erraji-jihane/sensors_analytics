# Results

## Part 1 - Partitioned analytics

| Partition | Count | Local mean temperature | Local mean vibration | Local mean pressure | Local mean rpm |
|---|---|---|---|---|---|
| P1 | 100 | 50.9350 | 2.1632 | 4.4778 | 1539.7700 |
| P2 | 300 | 53.2273 | 2.4131 | 4.8151 | 1674.6867 |
| P3 | 500 | 58.3762 | 2.8919 | 5.3016 | 1973.9860 |
| P4 | 700 | 66.1840 | 3.7291 | 6.0866 | 2430.8786 |

| Feature | Merged global mean | Mean of local means | Error |
|---|---|---|---|
| temperature | 60.3616 | 57.1806 | -3.1810 |
| vibration | 3.1228 | 2.7993 | -0.3235 |
| pressure | 5.5023 | 5.1703 | -0.3320 |
| rpm | 2090.6194 | 1904.8303 | -185.7891 |

## Parts 2-3 - Exact similarity search and PCA

| Query | Original-space top-5 (ID: sq. dist) | PCA-space top-5 (ID: sq. dist) | Preservation@5 | Heap = sort? |
|---|---|---|---|---|
| Q1 | R1160: 0.032, R0485: 0.083, R0325: 0.097, R0789: 0.102, R0150: 0.112 | R0099: 0.001, R0307: 0.005, R0789: 0.014, R0493: 0.015, R1160: 0.018 | 2/5 | yes |
| Q2 | R1671: 0.053, R1843: 0.060, R1564: 0.087, R1210: 0.117, R1548: 0.161 | R1585: 0.009, R1210: 0.036, R1724: 0.038, R1961: 0.047, R1671: 0.053 | 2/5 | yes |
| Q3 | R1618: 0.160, R1393: 0.244, R1907: 0.367, R1489: 0.372, R1185: 0.423 | R1964: 0.002, R1618: 0.010, R1832: 0.011, R1217: 0.036, R1644: 0.041 | 1/5 | yes |
| Q4 | R1529: 0.096, R1368: 0.102, R0955: 0.107, R1487: 0.108, R1181: 0.133 | R1181: 0.016, R1091: 0.037, R1221: 0.040, R1487: 0.040, R0955: 0.054 | 3/5 | yes |
| Q5 | R1966: 0.529, R1715: 0.687, R1666: 0.708, R1503: 0.777, R1863: 0.883 | R1028: 0.002, R1910: 0.069, R1653: 0.104, R1920: 0.116, R1688: 0.128 | 0/5 | yes |

Mean neighbor preservation@5: 1.6/5 (32%)

Test-set 5-NN fault accuracy: original 0.953, PCA 0.875, always-'no fault' baseline 0.895

## Part 4 - Worked update for R1377 (fault = 1)

z = [0.9435, 0.4788, 0.4949, 0.3042]
a = [1.4459, 1.4148, 0.2847]
h = [1.4459, 1.4148, 0.2847]
output pre-activation s = -0.7860;  y_hat = 0.3130;  loss = 1.1615
v_1: dL/dv = (0.3130 - 1) x 1.4459 = -0.9933;  v_new = 1.52 - 0.10 x -0.9933 = 1.6193
v_2: dL/dv = (0.3130 - 1) x 1.4148 = -0.9719;  v_new = -3.11 - 0.10 x -0.9719 = -3.0128
v_3: dL/dv = (0.3130 - 1) x 0.2847 = -0.1956;  v_new = -0.68 - 0.10 x -0.1956 = -0.6604

Test-set accuracy of the supplied network (threshold 0.5): 0.965
