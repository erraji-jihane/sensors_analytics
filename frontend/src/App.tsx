import React, { useState } from 'react';
import axios from 'axios';
interface Neighbor {
  id: string;
  distance: number;
}

interface SearchResult {
  query: string;
  neighbors: Neighbor[];
}

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
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Sensor Similarity Search</h1>
      <p>Click the button below to find the 5 most similar historical readings for each query.</p>
      
      <button 
        onClick={fetchData} 
        disabled={loading}
        style={{
          padding: '10px 20px', 
          fontSize: '16px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Running Python Pipeline...' : 'Run Similarity Search'}
      </button>

      {results.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          {results.map((res, index) => (
            <div key={index} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fafafa' }}>
              <h3>Query {res.query}</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#eee' }}>
                    <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Rank</th>
                    <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Closest Reading ID</th>
                    <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Squared Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {res.neighbors.map((neighbor, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '8px', border: '1px solid #ccc' }}>#{idx + 1}</td>
                      <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold' }}>{neighbor.id}</td>
                      <td style={{ padding: '8px', border: '1px solid #ccc' }}>{neighbor.distance.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;