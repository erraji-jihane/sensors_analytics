import React, { useEffect, useState } from 'react';
import {
  CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import * as api from './api';
import type { Overview, Prediction, Reading, SimilarityResult } from './api';
import './App.css';

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

// Pastel chart colors matching App.css
const COLORS = {
  normal: '#b8c6ec',
  fault: '#f3a9b3',
  neighbor: '#8f7ad6',
  query: '#4f6fd6',
};

const NAV: { view: View; label: string }[] = [
  { view: 'predict', label: 'Fault Prediction' },
  { view: 'similarity', label: 'Similarity Search' },
  { view: 'overview', label: 'Model Overview' },
];

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
  return <span className={`badge ${fault ? 'fault' : 'normal'}`}>{fault ? 'Fault' : 'Normal'}</span>;
}

function Verdict({ prediction }: { prediction: Prediction }) {
  const outside = prediction.outOfRange ?? [];
  if (outside.length) {
    return (
      <div className="verdict unknown">
        <div>
          <h2>Out of range</h2>
          {outside.map((o) => (
            <p key={o.feature}>{o.feature} {o.value} is outside the training range ({o.min} to {o.max})</p>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={`verdict ${prediction.isFault ? 'fault' : 'normal'}`}>
      <h2>{prediction.isFault ? 'Fault' : 'Normal'}</h2>
      <div style={{ textAlign: 'right' }}>
        <div className="big">{pct(prediction.probability)}</div>
        <p>fault probability</p>
      </div>
    </div>
  );
}

function PcaMap({ map, result }: { map: Overview['pcaMap']; result?: SimilarityResult }) {
  const neighborIds = new Set(result?.pcaNeighbors.map((n) => n.id) ?? []);
  const rest = map.filter((p) => !neighborIds.has(p.id));
  const normal = rest.filter((p) => !p.fault);
  const faults = rest.filter((p) => p.fault);
  const neighbors = map.filter((p) => neighborIds.has(p.id));
  const query = result ? [{ id: 'Your reading', pc1: result.query.pca[0], pc2: result.query.pca[1] }] : [];
  const axis = { stroke: '#d6d9e3', tick: { fill: '#8d90a6', fontSize: 12 } };

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
        <CartesianGrid stroke="#f0f1f6" />
        <XAxis type="number" dataKey="pc1" name="PC1" {...axis} tickFormatter={(v: number) => v.toFixed(1)} />
        <YAxis type="number" dataKey="pc2" name="PC2" {...axis} tickFormatter={(v: number) => v.toFixed(1)} />
        <ZAxis range={[22, 22]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(value) => (typeof value === 'number' ? value.toFixed(3) : String(value))}
          labelFormatter={() => ''}
        />
        <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: 12, color: '#8d90a6' }} />
        <Scatter name="Normal" data={normal} fill={COLORS.normal} fillOpacity={0.7} isAnimationActive={false} />
        <Scatter name="Fault" data={faults} fill={COLORS.fault} fillOpacity={0.8} isAnimationActive={false} />
        {result && <Scatter name="Neighbours" data={neighbors} fill={COLORS.neighbor} isAnimationActive={false} />}
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
    <div className="app">
      <header className="top">
        <div className="brand">Sensor <span>Analytics</span></div>
        <nav className="tabs">
          {NAV.map(({ view, label }) => (
            <button key={view} className={`tab ${currentView === view ? 'active' : ''}`} onClick={() => switchView(view)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {error && <div role="alert" className="alert">{error}</div>}

      {currentView !== 'overview' && (
        <section className="card">
          <div className="presets">
            {PRESETS.map((p) => (
              <button key={p.name} className="chip" onClick={() => setInputs(p.values)}>{p.name}</button>
            ))}
          </div>
          <div className="fields">
            {FIELDS.map(({ key, label }) => (
              <div key={key} className="field">
                <label htmlFor={key} className="label">{label}</label>
                <input id={key} name={key} value={inputs[key]} onChange={handleInputChange} type="number" />
              </div>
            ))}
          </div>
          <button className="run" onClick={run} disabled={loading}>
            {loading ? 'Running…' : currentView === 'predict' ? 'Predict' : 'Find similar'}
          </button>
        </section>
      )}

      {currentView === 'predict' && prediction && (
        <>
          <Verdict prediction={prediction} />
          <details className="card">
            <summary>Inside the network (4 → 3 → 1)</summary>
            <p className="mono">z = [{prediction.z.map((v) => v.toFixed(3)).join(', ')}]</p>
            <p className="mono">h = ReLU(W₁z + b₁) = [{prediction.hidden.map((v) => v.toFixed(3)).join(', ')}]</p>
            <p className="mono">ŷ = σ(v·h + c) = {prediction.probability.toFixed(4)}</p>
          </details>
        </>
      )}

      {currentView === 'similarity' && similarity && (
        <>
          <div className="stats">
            <div className="card">
              <div className="label">5-NN vote</div>
              <div className="stat-value">{similarity.knnIsFault ? 'Fault' : 'Normal'}</div>
              <div className="muted" style={{ fontSize: 12 }}>{similarity.knnFaultVotes}/{similarity.k} neighbours are faults</div>
            </div>
            <div className="card">
              <div className="label">Neighbours kept after PCA</div>
              <div className="stat-value">{similarity.preservation}/{similarity.k}</div>
            </div>
          </div>

          <section className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Reading</th>
                  <th>Distance</th>
                  <th>Temp / Vib / Press / RPM</th>
                  <th>Label</th>
                  <th>In PCA top 5</th>
                </tr>
              </thead>
              <tbody>
                {similarity.neighbors.map((item, index) => (
                  <tr key={item.id}>
                    <td className="muted">{index + 1}</td>
                    <td>{item.id}</td>
                    <td className="muted">{item.distance.toFixed(3)}</td>
                    <td className="muted">
                      {item.reading.temperature} / {item.reading.vibration} / {item.reading.pressure} / {item.reading.rpm}
                    </td>
                    <td><FaultBadge fault={item.fault} /></td>
                    <td className="muted">{similarity.pcaNeighbors.some((n) => n.id === item.id) ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            {overview ? <PcaMap map={overview.pcaMap} result={similarity} /> : <p className="muted">Loading map…</p>}
          </section>
        </>
      )}

      {currentView === 'overview' && (
        overview ? (
          <>
            <div className="stats">
              {[
                { label: 'Neural network', value: overview.accuracy.neuralNetwork },
                { label: '5-NN (4-D)', value: overview.accuracy.knnOriginal },
                { label: '5-NN (PCA 2-D)', value: overview.accuracy.knnPca },
                { label: "Always 'normal'", value: overview.accuracy.alwaysNoFault },
              ].map(({ label, value }) => (
                <div key={label} className="card">
                  <div className="label">{label}</div>
                  <div className="stat-value">{pct(value)}</div>
                </div>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12, margin: '-8px 0 20px' }}>
              Test accuracy on {overview.testSize} readings · {overview.trainSize} training readings, {pct(overview.trainFaultRate)} faults
            </p>
            <section className="card">
              <PcaMap map={overview.pcaMap} />
            </section>
          </>
        ) : !error && <p className="muted">Loading…</p>
      )}
    </div>
  );
}

export default App;
