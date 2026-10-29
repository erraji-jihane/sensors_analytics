import React, { useState } from 'react';
import axios from 'axios';

type View = 'predict' | 'similarity';

function App() {
  const [currentView, setCurrentView] = useState<View>('predict');
  const [inputs, setInputs] = useState({ temp: '67.7', vib: '3.56', press: '6.08', rpm: '2225' });
  const [prediction, setPrediction] = useState<any>(null);
  const [similarity, setSimilarity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  };

  const handlePredict = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:3001/api/predict', {
        temp: parseFloat(inputs.temp),
        vib: parseFloat(inputs.vib),
        press: parseFloat(inputs.press),
        rpm: parseFloat(inputs.rpm)
      });
      setPrediction(res.data);
    } catch (e) {
      alert("Error connecting to API");
    }
    setLoading(false);
  };

  const handleSimilarity = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:3001/api/similarity', {
        temp: parseFloat(inputs.temp),
        vib: parseFloat(inputs.vib),
        press: parseFloat(inputs.press),
        rpm: parseFloat(inputs.rpm)
      });
      setSimilarity(res.data);
    } catch (e) {
      alert("Error connecting to API");
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* SIDEBAR MENU */}
      <div style={{ width: '250px', backgroundColor: '#1e293b', color: 'white', padding: '20px' }}>
        <h2 style={{ borderBottom: '1px solid #334155', paddingBottom: '10px' }}>Sensor Analytics</h2>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px' }}>
          <li 
            onClick={() => { setCurrentView('predict'); setPrediction(null); }} 
            style={{ padding: '15px', cursor: 'pointer', backgroundColor: currentView === 'predict' ? '#3b82f6' : 'transparent', borderRadius: '5px', marginBottom: '10px' }}
          >
            🧠 Fault Prediction
          </li>
          <li 
            onClick={() => { setCurrentView('similarity'); setSimilarity([]); }} 
            style={{ padding: '15px', cursor: 'pointer', backgroundColor: currentView === 'similarity' ? '#3b82f6' : 'transparent', borderRadius: '5px' }}
          >
            🔍 Similarity Search
          </li>
        </ul>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, padding: '40px', backgroundColor: '#f8fafc' }}>
        
        <h1 style={{ marginTop: 0 }}>{currentView === 'predict' ? 'Neural Network Prediction' : 'Similarity Search'}</h1>

        {/* INPUT FORM */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
          <h3 style={{ marginTop: 0 }}>Enter Machine Readings</h3>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Temperature (°C)</label>
              <input name="temp" value={inputs.temp} onChange={handleInputChange} type="number" style={{ padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Vibration (mm/s)</label>
              <input name="vib" value={inputs.vib} onChange={handleInputChange} type="number" style={{ padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Pressure (bar)</label>
              <input name="press" value={inputs.press} onChange={handleInputChange} type="number" style={{ padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>RPM</label>
              <input name="rpm" value={inputs.rpm} onChange={handleInputChange} type="number" style={{ padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
          </div>

          <button 
            onClick={currentView === 'predict' ? handlePredict : handleSimilarity} 
            disabled={loading}
            style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            {loading ? 'Processing...' : (currentView === 'predict' ? 'Run Neural Network' : 'Find Similar Readings')}
          </button>
        </div>

        {/* PREDICTION RESULTS */}
        {currentView === 'predict' && prediction && (
          <div style={{ padding: '30px', borderRadius: '8px', backgroundColor: prediction.isFault ? '#fee2e2' : '#dcfce7', border: `1px solid ${prediction.isFault ? '#ef4444' : '#22c55e'}` }}>
            <h2 style={{ margin: 0, color: prediction.isFault ? '#991b1b' : '#166534' }}>{prediction.message}</h2>
            <p style={{ margin: '10px 0 0 0', fontSize: '18px' }}>Fault Probability: <strong>{(prediction.prediction * 100).toFixed(1)}%</strong></p>
          </div>
        )}

        {/* SIMILARITY RESULTS */}
        {currentView === 'similarity' && similarity.length > 0 && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0 }}>Top 5 Closest Matches</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Rank</th>
                  <th style={{ padding: '12px' }}>Reading ID</th>
                  <th style={{ padding: '12px' }}>Distance</th>
                </tr>
              </thead>
              <tbody>
                {similarity.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px' }}>#{index + 1}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.id}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{item.distance.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;