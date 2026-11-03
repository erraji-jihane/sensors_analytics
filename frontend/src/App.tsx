import React, { useEffect, useState } from 'react';
import {
  CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import * as api from './api';
import type { Overview, Prediction, Reading, SimilarityResult } from './api';

type View = 'predict' | 'similarity' | 'overview';

type Inputs = Record<keyof Reading, string>;

const FIELDS: { key: keyof Reading; label: string }[] = [
  { key: 'temp', label: 'Temperature (°C)' },
  { key: 'vib', label: 'Vibration (mm/s)' },
  { key: 'press', label: 'Pressure (bar)' },
  { key: 'rpm', label: 'RPM' },
];

// The five query readings from data/queries.csv and the Part 4 worked example.
const PRESETS: { name: string; values: Inputs }[] = [
  { name: 'R1377', values: { temp: '67.7', vib: '3.56', press: '6.08', rpm: '2225' } },
  { name: 'Q1', values: { temp: '52.0', vib: '2.1', press: '4.6', rpm: '1450' } },
  { name: 'Q2', values: { temp: '71.5', vib: '4.3', press: '6.4', rpm: '2850' } },
  { name: 'Q3', values: { temp: '66.0', vib: '5.2', press: '5.7', rpm: '2300' } },
  { name: 'Q4', values: { temp: '60.2', vib: '3.05', press: '6.9', rpm: '2150' } },
  { name: 'Q5', values: { temp: '74.0', vib: '3.6', press: '4.2', rpm: '2700' } },
];

const COLORS = {
  normal: '#94a3b8',
  fault: '#ef4444',
  neighbor: '#0f172a',
  query: '#2563eb',
};

const NAV: { view: View; label: string }[] = [
  { view: 'predict', label: '🧠 Fault Prediction' },
  { view: 'similarity', label: '🔍 Similarity Search' },
  { view: 'overview', label: '📊 Model Overview' },
];

const TITLES: Record<View, string> = {
  predict: 'Neural Network Prediction',
  similarity: 'Similarity Search',
  overview: 'Model Overview',
};

const card: React.CSSProperties = {
  backgroundColor: 'white', padding: '20px', borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '24px',
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function parseInputs(inputs: Inputs): Reading | string {
  const out = {} as Reading;
  for (const { key, label } of FIELDS) {
    const value = Number(inputs[key]);
    if (inputs[key].trim() === '' || !Number.isFinite(value)) return `${label} must be a number.`;
    out[key] = value;
  }
  return out;
}

function FaultBadge({ fault }: { fault: number }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold',
      backgroundColor: fault ? '#fee2e2' : '#dcfce7', color: fault ? '#991b1b' : '#166534',
    }}>
      {fault ? 'Fault' : 'Normal'}
    </span>
  );
}

function PcaMap({ map, result }: { map: Overview['pcaMap']; result?: SimilarityResult }) {
  const neighborIds = new Set(result?.pcaNeighbors.map((n) => n.id) ?? []);
  const rest = map.filter((p) => !neighborIds.has(p.id));
  const normal = rest.filter((p) => !p.fault);
  const faults = rest.filter((p) => p.fault);
  const neighbors = map.filter((p) => neighborIds.has(p.id));
  const query = result ? [{ id: 'Your reading', pc1: result.query.pca[0], pc2: result.query.pca[1] }] : [];

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
        <CartesianGrid stroke="#e2e8f0" />
        <XAxis type="number" dataKey="pc1" name="PC1" label={{ value: 'PC1', position: 'bottom' }} tickFormatter={(v: number) => v.toFixed(1)} />
        <YAxis type="number" dataKey="pc2" name="PC2" label={{ value: 'PC2', angle: -90, position: 'left' }} tickFormatter={(v: number) => v.toFixed(1)} />
        <ZAxis range={[18, 18]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(value) => (typeof value === 'number' ? value.toFixed(3) : String(value))}
          labelFormatter={() => ''}
        />
        <Legend verticalAlign="top" height={30} />
        <Scatter name="Normal" data={normal} fill={COLORS.normal} fillOpacity={0.5} isAnimationActive={false} />
        <Scatter name="Fault" data={faults} fill={COLORS.fault} fillOpacity={0.6} isAnimationActive={false} />
        {result && <Scatter name="PCA top-5 neighbours" data={neighbors} fill={COLORS.neighbor} isAnimationActive={false} />}
        {result && <Scatter name="Your reading" data={query} fill={COLORS.query} shape="star" isAnimationActive={false} />}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function App() {
  const [currentView, setCurrentView] = useState<View>('predict');
  const [inputs, setInputs] = useState<Inputs>(PRESETS[0].values);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [similarity, setSimilarity] = useState<SimilarityResult | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The PCA map and accuracies are needed by two views, so load them once.
  useEffect(() => {
    if (currentView === 'predict' || overview) return;
    api.overview().then(setOverview).catch((e: Error) => setError(e.message));
  }, [currentView, overview]);

  const switchView = (view: View) => {
    setCurrentView(view);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  };

  const run = async () => {
    const reading = parseInputs(inputs);
    if (typeof reading === 'string') {
      setError(reading);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (currentView === 'predict') setPrediction(await api.predict(reading));
      else setSimilarity(await api.similarity(reading));
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>

      {/* SIDEBAR MENU */}
      <div style={{ width: '250px', flexShrink: 0, backgroundColor: '#1e293b', color: 'white', padding: '20px' }}>
        <h2 style={{ borderBottom: '1px solid #334155', paddingBottom: '10px' }}>Sensor Analytics</h2>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px' }}>
          {NAV.map(({ view, label }) => (
            <li
              key={view}
              onClick={() => switchView(view)}
              style={{ padding: '15px', cursor: 'pointer', backgroundColor: currentView === view ? '#3b82f6' : 'transparent', borderRadius: '5px', marginBottom: '10px' }}
            >
              {label}
            </li>
          ))}
        </ul>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, padding: '40px', backgroundColor: '#f8fafc', overflowX: 'auto' }}>

        <h1 style={{ marginTop: 0 }}>{TITLES[currentView]}</h1>

        {error && (
          <div role="alert" style={{ ...card, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
            {error}
          </div>
        )}

        {/* INPUT FORM */}
        {currentView !== 'overview' && (
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Enter Machine Readings</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center' }}>Try a sample:</span>
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setInputs(p.values)}
                  style={{ padding: '4px 10px', borderRadius: '999px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontSize: '12px' }}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label htmlFor={key} style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>{label}</label>
                  <input id={key} name={key} value={inputs[key]} onChange={handleInputChange} type="number" style={{ padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              ))}
            </div>

            <button
              onClick={run}
              disabled={loading}
              style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              {loading ? 'Processing...' : (currentView === 'predict' ? 'Run Neural Network' : 'Find Similar Readings')}
            </button>
          </div>
        )}

        {/* PREDICTION RESULTS */}
        {currentView === 'predict' && prediction && (
          <>
            <div style={{ ...card, padding: '30px', backgroundColor: prediction.isFault ? '#fee2e2' : '#dcfce7', border: `1px solid ${prediction.isFault ? '#ef4444' : '#22c55e'}` }}>
              <h2 style={{ margin: 0, color: prediction.isFault ? '#991b1b' : '#166534' }}>{prediction.message}</h2>
              <p style={{ margin: '10px 0 0 0', fontSize: '18px' }}>Fault Probability: <strong>{pct(prediction.probability)}</strong></p>
            </div>
            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Inside the network (4 → 3 → 1)</h3>
              <p style={{ margin: '6px 0' }}>Standardized input z = [{prediction.z.map((v) => v.toFixed(4)).join(', ')}]</p>
              <p style={{ margin: '6px 0' }}>Hidden layer h = ReLU(W₁z + b₁) = [{prediction.hidden.map((v) => v.toFixed(4)).join(', ')}]</p>
              <p style={{ margin: '6px 0' }}>Output ŷ = σ(v·h + c) = {prediction.probability.toFixed(4)} (fault if ≥ 0.5)</p>
            </div>
          </>
        )}

        {/* SIMILARITY RESULTS */}
        {currentView === 'similarity' && similarity && (
          <>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ ...card, flex: 1, minWidth: '220px' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>5-NN vote</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: similarity.knnIsFault ? '#991b1b' : '#166534' }}>
                  {similarity.knnIsFault ? 'Fault' : 'Normal'} ({similarity.knnFaultVotes}/{similarity.k} neighbours are faults)
                </div>
              </div>
              <div style={{ ...card, flex: 1, minWidth: '220px' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Neighbours kept after PCA (4-D → 2-D)</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{similarity.preservation}/{similarity.k}</div>
              </div>
            </div>

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Top 5 Closest Matches</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Rank</th>
                    <th style={{ padding: '12px' }}>Reading ID</th>
                    <th style={{ padding: '12px' }}>Sq. distance</th>
                    <th style={{ padding: '12px' }}>Temp / Vib / Press / RPM</th>
                    <th style={{ padding: '12px' }}>Label</th>
                    <th style={{ padding: '12px' }}>Also in PCA top-5?</th>
                  </tr>
                </thead>
                <tbody>
                  {similarity.neighbors.map((item, index) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px' }}>#{index + 1}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.id}</td>
                      <td style={{ padding: '12px', color: '#64748b' }}>{item.distance.toFixed(3)}</td>
                      <td style={{ padding: '12px', color: '#64748b' }}>
                        {item.reading.temperature} / {item.reading.vibration} / {item.reading.pressure} / {item.reading.rpm}
                      </td>
                      <td style={{ padding: '12px' }}><FaultBadge fault={item.fault} /></td>
                      <td style={{ padding: '12px' }}>{similarity.pcaNeighbors.some((n) => n.id === item.id) ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Where your reading lands in PCA space</h3>
              {overview ? <PcaMap map={overview.pcaMap} result={similarity} /> : <p>Loading map…</p>}
            </div>
          </>
        )}

        {/* MODEL OVERVIEW */}
        {currentView === 'overview' && (
          overview ? (
            <>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Neural network (4→3→1)', value: overview.accuracy.neuralNetwork },
                  { label: '5-NN, original 4-D space', value: overview.accuracy.knnOriginal },
                  { label: '5-NN, PCA 2-D space', value: overview.accuracy.knnPca },
                  { label: "Baseline: always 'no fault'", value: overview.accuracy.alwaysNoFault },
                ].map(({ label, value }) => (
                  <div key={label} style={{ ...card, flex: 1, minWidth: '180px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{label}</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{pct(value)}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>test accuracy ({overview.testSize} readings)</div>
                  </div>
                ))}
              </div>
              <div style={card}>
                <h3 style={{ marginTop: 0 }}>Training set in PCA space</h3>
                <p style={{ marginTop: 0, color: '#64748b', fontSize: '14px' }}>
                  {overview.trainSize} training readings projected from 4-D to 2-D; {pct(overview.trainFaultRate)} are faults.
                </p>
                <PcaMap map={overview.pcaMap} />
              </div>
            </>
          ) : !error && <p>Loading…</p>
        )}

      </div>
    </div>
  );
}

export default App;
