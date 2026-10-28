import express from "express";
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize the app
const app = express();

// 2. Define the routes
app.get('/', (req, res) => {
    res.send('Hello World');
});

app.get('/api/run-pipeline', (req, res) => {
    const pythonScript = path.join(__dirname, '../../python/starter.py');
    
    exec(`python "${pythonScript}"`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json({ results: stdout });
    });
});

// 3. Start the server
app.listen(3001, () => {
    console.log('Server is running on port 3001');
});