import React, { useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Neighbor {
  id: string;
  distance: number;
}

interface SearchResult {
  query: string;
  neighbors: Neighbor[];
}

// Data for the Part 1 Chart
const part1Data = [
  { feature: 'Temp', Correct: 60.36, Incorrect: 57.18 },
  { feature: 'Vibration', Correct: 3.12, Incorrect: 2.80 },
  { feature: 'Pressure', Correct: 5.50, Incorrect: 5.17 },
  { feature: 'RPM', Correct: 2090.62, Incorrect: 1904.83 },
];

function App() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:3001/api/search');
      setResults(response.data);
    } catch (error) {
      console.error(error);
      alert("Failed to fetch data. Is the backend running?");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      
      <header style={{ marginBottom: '40px', borderBottom: '2px solid #ddd', paddingBottom: '20px' }}>
        <h1 style={{ color: '#1a1a1a', margin: 0 }}>Factory Sensor Analytics</h1>
        <p style={{ color: '#666', marginTop: '10px' }}>Interactive Dashboard for Machine Fault Detection</p>
      </header>

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        
        {/* Left Column: The Chart */}
        <div style={{ flex: 1, minWidth: '400px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', color: '#333' }}>Part 1: Mean Calculation Error</h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Why unweighted averaging is wrong. Notice the difference in RPM.
          </p>
          <div style={{ height: '300px', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={part1Data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="feature" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Correct" fill="#007bff" name="Merged Global Mean" />
                <Bar dataKey="Incorrect" fill="#dc3545" name="Mean of Local Means" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: The Search */}
        <div style={{ flex: 1, minWidth: '400px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', color: '#333' }}>Part 2 & 3: Similarity Search</h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Find the closest historical readings to detect anomalies.
          </p>
          
          <button 
            onClick={fetchData} 
            disabled={loading}
            style={{
              marginTop: '10px',
              padding: '10px 20px', 
              fontSize: '16px', 
              backgroundColor: loading ? '#ccc' : '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Searching...' : 'Run Similarity Search'}
          </button>

          <div style={{ marginTop: '20px', maxHeight: '300px', overflowY: 'auto' }}>
            {results.length > 0 ? (
              results.map((res, index) => (
                <div key={index} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>Query {res.query}</h4>
                  <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                    <tbody>
                      {res.neighbors.map((n, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '5px 0' }}><strong>{n.id}</strong></td>
                          <td style={{ padding: '5px 0', color: '#666', textAlign: 'right' }}>{n.distance.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: '#999', marginTop: '40px' }}>Click the button to see results</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;