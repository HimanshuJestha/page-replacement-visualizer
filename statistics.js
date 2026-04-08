// Statistics tab specific functionality
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const statsPatternTypeSelect = document.getElementById('stats-pattern-type');
    const statsPatternLengthInput = document.getElementById('stats-pattern-length');
    const statsPatternMaxInput = document.getElementById('stats-pattern-max');
    const statsMinFramesInput = document.getElementById('stats-min-frames');
    const statsMaxFramesInput = document.getElementById('stats-max-frames');
    const runStatisticsBtn = document.getElementById('run-statistics');
    const statisticsResultsEl = document.getElementById('statistics-results');
    const statsTableBody = document.getElementById('stats-table-body');
    const statsInsightsEl = document.getElementById('stats-insights');
    const statsTabs = document.querySelectorAll('.stats-tab');
    const statsContents = document.querySelectorAll('.stats-content');
    
    let faultChart = null;
    let hitRatioChart = null;
    
    // Generate performance statistics
    function generateStatistics() {
        const pattern = statsPatternTypeSelect.value;
        const length = parseInt(statsPatternLengthInput.value);
        const maxPage = parseInt(statsPatternMaxInput.value);
        const minFrames = parseInt(statsMinFramesInput.value);
        const maxFrames = parseInt(statsMaxFramesInput.value);
        const selectedAlgorithms = Array.from(document.querySelectorAll('input[name="stats-algorithm"]:checked')).map(el => el.value);
        
        // Validate inputs
        if (isNaN(minFrames) || minFrames < 1 || minFrames > 10) {
            alert('Minimum frames must be between 1 and 10');
            return;
        }
        
        if (isNaN(maxFrames) || maxFrames < 1 || maxFrames > 10) {
            alert('Maximum frames must be between 1 and 10');
            return;
        }
        
        if (minFrames > maxFrames) {
            alert('Minimum frames cannot be greater than maximum frames');
            return;
        }
        
        if (selectedAlgorithms.length < 1) {
            alert('Please select at least one algorithm to analyze');
            return;
        }
        
        // Generate reference string based on pattern
        const refString = generateReferenceString(pattern, length, maxPage);
        
        // Run analysis for each frame count and algorithm
        const statsData = [];
        
        for (let frames = minFrames; frames <= maxFrames; frames++) {
            const frameStats = { frames };
            
            selectedAlgorithms.forEach(alg => {
                const result = runAlgorithm(alg, frames, refString);
                frameStats[alg] = result.faults;
                frameStats[`${alg}_hitrate`] = (result.hits / result.total * 100).toFixed(1);
            });
            
            statsData.push(frameStats);
        }
        
        // Display statistics results
        displayStatisticsResults(statsData, refString.length, selectedAlgorithms);
    }
    
    // Display statistics results
    function displayStatisticsResults(statsData, totalReferences, algorithms) {
        // Generate HTML for table view
        let tableHtml = '';
        
        statsData.forEach(row => {
            tableHtml += `
                <tr>
                    <td>${row.frames}</td>
                    ${algorithms.map(alg => `<td>${row[alg]}</td>`).join('')}
                </tr>
            `;
        });
        
        statsTableBody.innerHTML = tableHtml;
        
        // Generate insights
        let insightsHtml = `
            <h4>Analysis Insights</h4>
            <p>Reference string length: ${totalReferences} pages</p>
            <p>Frames tested: ${statsData[0].frames} to ${statsData[statsData.length - 1].frames}</p>
            <ul>
        `;
        
        // Find best algorithm for each frame count
        const bestAlgorithms = {};
        
        statsData.forEach(row => {
            let minFaults = Infinity;
            let bestAlgs = [];
            
            algorithms.forEach(alg => {
                if (row[alg] < minFaults) {
                    minFaults = row[alg];
                    bestAlgs = [alg];
                } else if (row[alg] === minFaults) {
                    bestAlgs.push(alg);
                }
            });
            
            bestAlgorithms[row.frames] = bestAlgs;
        });
        
        // Generate insights based on best algorithms
        insightsHtml += `<li>Best performing algorithms by frame count:</li><ul>`;
        
        for (const [frames, algs] of Object.entries(bestAlgorithms)) {
            insightsHtml += `<li>${frames} frames: ${algs.map(alg => alg.toUpperCase()).join(', ')}</li>`;
        }
        
        insightsHtml += `</ul>`;
        
        // Check for Belady's anomaly in FIFO
        if (algorithms.includes('fifo') && statsData.length > 1) {
            let anomalyDetected = false;
            for (let i = 1; i < statsData.length; i++) {
                if (statsData[i].fifo > statsData[i-1].fifo) {
                    anomalyDetected = true;
                    insightsHtml += `<li style="color: var(--danger);">Belady's anomaly detected with FIFO: Increasing frames from ${statsData[i-1].frames} to ${statsData[i].frames} increased faults from ${statsData[i-1].fifo} to ${statsData[i].fifo}.</li>`;
                }
            }
            if (!anomalyDetected) {
                insightsHtml += `<li>No Belady's anomaly detected in FIFO for this reference string.</li>`;
            }
        }
        
        // General observations
        insightsHtml += `
            <li>As expected, increasing the number of frames generally reduces page faults for all algorithms.</li>
        `;
        
        if (algorithms.includes('optimal') && algorithms.includes('lru')) {
            insightsHtml += `<li>The Optimal algorithm consistently provides the lowest number of page faults (as it has future knowledge).</li>`;
            
            // Calculate average performance difference between LRU and Optimal
            const avgDiff = statsData.reduce((sum, row) => sum + (row.lru - row.optimal), 0) / statsData.length;
            insightsHtml += `<li>LRU performs ${avgDiff.toFixed(1)} page faults worse than Optimal on average.</li>`;
        }
        
        if (algorithms.includes('lru') && algorithms.includes('fifo')) {
            // Calculate how often LRU outperforms FIFO
            const lruWins = statsData.filter(row => row.lru < row.fifo).length;
            const percentage = (lruWins / statsData.length * 100).toFixed(0);
            insightsHtml += `<li>LRU outperforms FIFO in ${lruWins} of ${statsData.length} frame counts (${percentage}%).</li>`;
        }
        
        if (algorithms.includes('second-chance') && algorithms.includes('clock')) {
            // Check if Second Chance and Clock perform similarly
            const identical = statsData.every(row => row['second-chance'] === row.clock);
            if (identical) {
                insightsHtml += `<li>Second Chance and Clock algorithms perform identically for this reference string.</li>`;
            } else {
                insightsHtml += `<li>Second Chance and Clock algorithms show slight performance differences with this reference string.</li>`;
            }
        }
        
        insightsHtml += `</ul>`;
        
        statsInsightsEl.innerHTML = insightsHtml;
        
        // Initialize charts
        const frameCounts = statsData.map(d => d.frames);
        const chartColors = algorithms.map(alg => getAlgorithmColor(alg));
        
        // Clean up old charts if they exist
        if (faultChart) {
            faultChart.destroy();
        }
        
        if (hitRatioChart) {
            hitRatioChart.destroy();
        }
        
        // Faults chart
        const faultCtx = document.getElementById('fault-chart').getContext('2d');
        faultChart = new Chart(faultCtx, {
            type: 'line',
            data: {
                labels: frameCounts,
                datasets: algorithms.map((alg, idx) => ({
                    label: alg.toUpperCase(),
                    data: statsData.map(d => d[alg]),
                    borderColor: chartColors[idx],
                    backgroundColor: 'transparent',
                    tension: 0.1
                }))
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Page Faults vs Number of Frames'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Page Faults'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Number of Frames'
                        }
                    }
                }
            }
        });
        
        // Hit ratio chart
        const hitRatioCtx = document.getElementById('hit-ratio-chart').getContext('2d');
        hitRatioChart = new Chart(hitRatioCtx, {
            type: 'line',
            data: {
                labels: frameCounts,
                datasets: algorithms.map((alg, idx) => ({
                    label: alg.toUpperCase(),
                    data: statsData.map(d => d[`${alg}_hitrate`]),
                    borderColor: chartColors[idx],
                    backgroundColor: 'transparent',
                    tension: 0.1
                }))
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Hit Ratio (%) vs Number of Frames'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Hit Ratio (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Number of Frames'
                        }
                    }
                }
            }
        });
    }
    
    // Event Listeners
    runStatisticsBtn.addEventListener('click', generateStatistics);
    
    // Stats tab switching
    statsTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-stats-tab');
            
            // Update active tab
            statsTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update active content
            statsContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabId}-view`).classList.add('active');
        });
    });
}); 