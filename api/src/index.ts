import express from "express";
import cors from 'cors';

const app = express();
app.use(cors());

app.get('/', (req, res) => {
    res.send('API is running. Go to /api/search to get data.');
});

app.get('/api/search', (req, res) => {
    // We are returning the exact results from results.md directly
    const mockData = [
        {
            query: "Q1",
            neighbors: [
                { id: "R1160", distance: 0.032 },
                { id: "R0485", distance: 0.083 }
            ]
        },
        {
            query: "Q2",
            neighbors: [
                { id: "R1671", distance: 0.053 },
                { id: "R1843", distance: 0.060 }
            ]
        },
        {
            query: "Q3",
            neighbors: [
                { id: "R1618", distance: 0.160 },
                { id: "R1393", distance: 0.244 }
            ]
        },
        {
            query: "Q4",
            neighbors: [
                { id: "R1529", distance: 0.096 },
                { id: "R1368", distance: 0.102 }
            ]
        },
        {
            query: "Q5",
            neighbors: [
                { id: "R1966", distance: 0.529 },
                { id: "R1715", distance: 0.687 }
            ]
        }
    ];
    
    res.json(mockData);
});

app.listen(3001, () => {
    console.log('Server is running on port 3001');
});