// Comparison tab specific functionality
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const compareFramesInput = document.getElementById('compare-frames');
    const compareReferenceStringInput = document.getElementById('compare-reference-string');
    const runComparisonBtn = document.getElementById('run-comparison');
    const comparisonResultsEl = document.getElementById('comparison-results');
    
    // Run algorithm comparison
    function runAlgorithmComparison() {
        const compareFrames = parseInt(compareFramesInput.value);
        const compareRefString = compareReferenceStringInput.value.split(',').map(page => parseInt(page.trim()));
        const selectedAlgorithms = Array.from(document.querySelectorAll('input[name="compare-algorithm"]:checked')).map(el => el.value);
        
        // Validate inputs
        if (compareRefString.some(isNaN) || compareRefString.length === 0) {
            alert('Please enter a valid reference string (comma-separated numbers)');
            return;
        }
        
        if (isNaN(compareFrames) || compareFrames < 1 || compareFrames > 10) {
            alert('Number of frames must be between 1 and 10');
            return;
        }
        
        if (selectedAlgorithms.length < 2) {
            alert('Please select at least 2 algorithms to compare');
            return;
        }
        
        // Run each algorithm and collect results
        const results = selectedAlgorithms.map(alg => {
            return runAlgorithm(alg, compareFrames, compareRefString);
        });
        
        // Display comparison results
        displayComparisonResults(results);
    }
    
    // Display comparison results
    function displayComparisonResults(results) {
        comparisonResultsEl.innerHTML = '';
        
        // Find min faults for comparison
        const minFaults = Math.min(...results.map(r => r.faults));
        
        results.forEach(result => {
            const card = document.createElement('div');
            card.classList.add('comparison-card');
            
            // Determine if this is the best algorithm
            const isBest = result.faults === minFaults;
            const bestBadge = isBest ? '<span style="color: var(--success); font-weight: bold;"> (Best)</span>' : '';
            
            card.innerHTML = `
                <h4>${result.algorithm.toUpperCase()}${bestBadge}</h4>
                <p>Page Faults: <strong>${result.faults}</strong></p>
                <p>Page Hits: <strong>${result.hits}</strong></p>
                <p>Fault Rate: <strong>${result.faultRate}%</strong></p>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${100 - result.faultRate}%"></div>
                    </div>
                    <div class="progress-labels">
                        <span>0%</span>
                        <span>Hit Rate</span>
                        <span>100%</span>
                    </div>
                </div>
            `;
            
            comparisonResultsEl.appendChild(card);
        });

        // Add details about the conditions
        const detailsCard = document.createElement('div');
        detailsCard.classList.add('comparison-card');
        detailsCard.innerHTML = `
            <h4>Comparison Details</h4>
            <p>Number of frames: <strong>${compareFramesInput.value}</strong></p>
            <p>Reference string length: <strong>${compareRefString.length}</strong></p>
            <p>Algorithms compared: <strong>${results.map(r => r.algorithm.toUpperCase()).join(', ')}</strong></p>
            <p>Best performing: <strong style="color: var(--success);">${results.filter(r => r.faults === minFaults).map(r => r.algorithm.toUpperCase()).join(', ')}</strong></p>
        `;
        
        comparisonResultsEl.appendChild(detailsCard);
    }
    
    // Event Listeners
    runComparisonBtn.addEventListener('click', runAlgorithmComparison);
}); 