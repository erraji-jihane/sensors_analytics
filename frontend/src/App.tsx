import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // This calls your Express API
      const response = await axios.get('http://localhost:3001/api/run-pipeline');
      setData(response.data.results);
    } catch (error) {
      console.error("Error fetching data", error);
      alert("Failed to fetch data. Is the backend running?");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Sensor Analytics Dashboard</h1>
      
      <button 
        onClick={fetchData} 
        disabled={loading}
        style={{ 
          padding: '12px 24px', 
          fontSize: '16px', 
          cursor: loading ? 'not-allowed' : 'pointer',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        {loading ? 'Running Python Pipeline...' : 'Run Pipeline'}
      </button>

      {data && (
        <div style={{ marginTop: '30px', background: '#f4f4f4', padding: '20px', borderRadius: '8px' }}>
          <h2>Raw Python Output</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {data}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;