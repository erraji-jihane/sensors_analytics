import express from "express";
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json()); // Allows us to read JSON from React

// Mock function to simulate the Neural Network output
app.post('/api/predict', (req, res) => {
    const { temp, vib, press, rpm } = req.body;
    
    // In a real app, you would pass these to Python here.
    // For now, we simulate the output based on the R1377 example.
    const prediction = 0.3130; 
    const isFault = prediction >= 0.5;
    
    res.json({
        prediction: prediction,
        isFault: isFault,
        message: isFault ? "⚠️ FAULT DETECTED" : "✅ MACHINE NORMAL"
    });
});

// Mock function for Similarity Search
app.post('/api/similarity', (req, res) => {
    // Simulating the results
    res.json([
        { id: "R1160", distance: 0.032 },
        { id: "R0485", distance: 0.083 },
        { id: "R0325", distance: 0.097 },
        { id: "R0789", distance: 0.102 },
        { id: "R0150", distance: 0.112 }
    ]);
});

app.listen(3001, () => {
    console.log('Server is running on port 3001');
});