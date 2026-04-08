const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// API endpoint for running algorithm simulations
app.get('/api/simulate', (req, res) => {
    const { algorithm, frames, referenceString } = req.query;
    
    if (!algorithm || !frames || !referenceString) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    try {
        const frameCount = parseInt(frames);
        const refString = referenceString.split(',').map(page => parseInt(page.trim()));
        
        // Import algorithm implementation
        const { runAlgorithm } = require('./algorithms');
        
        // Run the algorithm
        const result = runAlgorithm(algorithm, frameCount, refString);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API endpoint for comparing multiple algorithms
app.get('/api/compare', (req, res) => {
    const { frames, referenceString, algorithms } = req.query;
    
    if (!frames || !referenceString || !algorithms) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    try {
        const frameCount = parseInt(frames);
        const refString = referenceString.split(',').map(page => parseInt(page.trim()));
        const algs = algorithms.split(',');
        
        // Import algorithm implementation
        const { runAlgorithm } = require('./algorithms');
        
        // Run each algorithm
        const results = algs.map(alg => runAlgorithm(alg, frameCount, refString));
        
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API endpoint for generating reference strings
app.get('/api/generate-pattern', (req, res) => {
    const { pattern, length, maxPage } = req.query;
    
    if (!pattern || !length || !maxPage) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    try {
        const patternLength = parseInt(length);
        const max = parseInt(maxPage);
        
        // Import pattern generator
        const { generateReferenceString } = require('./algorithms');
        
        // Generate the reference string
        const refString = generateReferenceString(pattern, patternLength, max);
        
        res.json({ referenceString: refString });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Handle all other requests by sending the index.html file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 