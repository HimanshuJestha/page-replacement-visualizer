// Visualization tab specific functionality
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const algorithmSelect = document.getElementById('algorithm');
    const framesInput = document.getElementById('frames');
    const referenceStringInput = document.getElementById('reference-string');
    const visualizeBtn = document.getElementById('visualize');
    const generatePatternBtn = document.getElementById('generate-pattern');
    const resetBtn = document.getElementById('reset');
    const referenceDisplay = document.getElementById('reference-display');
    const framesContainer = document.getElementById('frames-container');
    const timelineContainer = document.getElementById('timeline');
    const prevStepBtn = document.getElementById('prev-step');
    const nextStepBtn = document.getElementById('next-step');
    const autoRunBtn = document.getElementById('auto-run');
    const faultCountEl = document.getElementById('fault-count');
    const hitCountEl = document.getElementById('hit-count');
    const currentStepEl = document.getElementById('current-step');
    const totalStepsEl = document.getElementById('total-steps');
    const resultFaultsEl = document.getElementById('result-faults');
    const resultHitsEl = document.getElementById('result-hits');
    const resultTotalEl = document.getElementById('result-total');
    const resultFaultRateEl = document.getElementById('result-fault-rate');
    const algorithmDescriptionEl = document.getElementById('algorithm-description');
    const efficiencyBarEl = document.getElementById('efficiency-bar');
    
    // Pattern generation elements
    const patternTypeSelect = document.getElementById('pattern-type');
    const patternLengthInput = document.getElementById('pattern-length');
    const patternMaxInput = document.getElementById('pattern-max');
    
    // Variables
    let referenceString = [];
    let frameCount = 3;
    let algorithm = 'fifo';
    let currentStep = 0;
    let simulationHistory = [];
    let pageHits = 0;
    let pageFaults = 0;
    let autoRunInterval = null;
    
    // Initialize
    function initialize() {
        referenceString = referenceStringInput.value.split(',').map(page => parseInt(page.trim()));
        frameCount = parseInt(framesInput.value);
        algorithm = algorithmSelect.value;
        currentStep = 0;
        simulationHistory = [];
        pageHits = 0;
        pageFaults = 0;
        
        // Validate inputs
        if (referenceString.some(isNaN) || referenceString.length === 0) {
            alert('Please enter a valid reference string (comma-separated numbers)');
            return false;
        }
        
        if (isNaN(frameCount) || frameCount < 1 || frameCount > 10) {
            alert('Number of frames must be between 1 and 10');
            return false;
        }
        
        // Update algorithm description
        updateAlgorithmInfo();
        
        return true;
    }
    
    // Update algorithm information
    function updateAlgorithmInfo() {
        const info = algorithmInfo[algorithm] || algorithmInfo.fifo;
        algorithmDescriptionEl.textContent = info.description;
        efficiencyBarEl.style.width = `${info.efficiency}%`;
    }
    
    // Run simulation
    function runSimulation() {
        if (!initialize()) return;
        
        // Initialize frames with empty state
        let frames = Array(frameCount).fill(null);
        let frameInfo = Array(frameCount).fill(null); // Additional info (timestamp, frequency, reference bit, etc.)
        let clockPointer = 0; // For Clock algorithm
        
        simulationHistory = [];
        pageHits = 0;
        pageFaults = 0;
        
        // For each page in reference string
        for (let i = 0; i < referenceString.length; i++) {
            const page = referenceString[i];
            
            // Check if page is already in frames (hit)
            const frameIndex = frames.indexOf(page);
            const isHit = frameIndex !== -1;
            
            // Copy current state for history
            const currentFrames = [...frames];
            let replacedIndex = -1;
            
            if (isHit) {
                // Page hit - update frameInfo based on algorithm
                if (algorithm === 'lru') {
                    frameInfo[frameIndex] = i; // Update timestamp for LRU
                } else if (algorithm === 'lfu') {
                    frameInfo[frameIndex]++; // Increment usage count for LFU
                } else if (algorithm === 'second-chance' || algorithm === 'clock') {
                    frameInfo[frameIndex] = 1; // Set reference bit
                }
                pageHits++;
            } else {
                // Page fault - need to replace a page or find empty frame
                pageFaults++;
                
                // Find empty frame if available
                const emptyIndex = frames.indexOf(null);
                
                if (emptyIndex !== -1) {
                    // Empty frame available
                    frames[emptyIndex] = page;
                    
                    // Set initial info based on algorithm
                    if (algorithm === 'fifo' || algorithm === 'lru') {
                        frameInfo[emptyIndex] = i; // Set timestamp
                    } else if (algorithm === 'lfu') {
                        frameInfo[emptyIndex] = 1; // Set initial frequency
                    } else if (algorithm === 'second-chance' || algorithm === 'clock') {
                        frameInfo[emptyIndex] = 1; // Set reference bit
                    }
                    replacedIndex = emptyIndex;
                    
                    // Update clock pointer for Clock algorithm
                    if (algorithm === 'clock') {
                        clockPointer = (emptyIndex + 1) % frameCount;
                    }
                } else {
                    // Need to replace a page based on algorithm
                    switch (algorithm) {
                        case 'fifo':
                            // First-In-First-Out: Replace the oldest page
                            const oldestIndex = frameInfo.indexOf(Math.min(...frameInfo));
                            frames[oldestIndex] = page;
                            frameInfo[oldestIndex] = i; // Update timestamp
                            replacedIndex = oldestIndex;
                            break;
                            
                        case 'lru':
                            // Least Recently Used: Replace the page that was used longest time ago
                            const lruIndex = frameInfo.indexOf(Math.min(...frameInfo));
                            frames[lruIndex] = page;
                            frameInfo[lruIndex] = i; // Update timestamp
                            replacedIndex = lruIndex;
                            break;
                            
                        case 'optimal':
                            // Optimal: Replace the page that will not be used for the longest time
                            let farthestIndex = -1;
                            let farthestDistance = -1;
                            
                            for (let j = 0; j < frames.length; j++) {
                                let nextUse = referenceString.indexOf(frames[j], i + 1);
                                if (nextUse === -1) {
                                    // Page will not be used again
                                    farthestIndex = j;
                                    break;
                                } else if (nextUse > farthestDistance) {
                                    farthestDistance = nextUse;
                                    farthestIndex = j;
                                }
                            }
                            
                            frames[farthestIndex] = page;
                            replacedIndex = farthestIndex;
                            break;
                            
                        case 'lfu':
                            // Least Frequently Used: Replace the page with the lowest usage count
                            const minFrequency = Math.min(...frameInfo);
                            const candidates = frameInfo.map((freq, idx) => freq === minFrequency ? idx : -1).filter(idx => idx !== -1);
                            
                            // If multiple candidates, use LRU as tie-breaker
                            if (candidates.length > 1) {
                                const timestamps = candidates.map(idx => frameInfo[idx]);
                                const lfuLruIndex = candidates[timestamps.indexOf(Math.min(...timestamps))];
                                frames[lfuLruIndex] = page;
                                frameInfo[lfuLruIndex] = 1; // Reset frequency
                                replacedIndex = lfuLruIndex;
                            } else {
                                frames[candidates[0]] = page;
                                frameInfo[candidates[0]] = 1; // Reset frequency
                                replacedIndex = candidates[0];
                            }
                            break;
                            
                        case 'mru':
                            // Most Recently Used: Replace the most recently used page
                            const mruIndex = frameInfo.indexOf(Math.max(...frameInfo));
                            frames[mruIndex] = page;
                            frameInfo[mruIndex] = i; // Update timestamp
                            replacedIndex = mruIndex;
                            break;
                            
                        case 'second-chance':
                            // Second Chance: FIFO but with reference bit
                            let replaced = false;
                            let pointer = 0;
                            
                            while (!replaced) {
                                const currentIndex = pointer % frameCount;
                                
                                if (frameInfo[currentIndex] === 0) {
                                    // Replace this page
                                    frames[currentIndex] = page;
                                    frameInfo[currentIndex] = 1; // Set reference bit for new page
                                    replacedIndex = currentIndex;
                                    replaced = true;
                                } else {
                                    // Give a second chance
                                    frameInfo[currentIndex] = 0;
                                }
                                
                                pointer++;
                            }
                            break;
                            
                        case 'clock':
                            // Clock: Practical implementation of Second Chance
                            let replacedClock = false;
                            
                            while (!replacedClock) {
                                if (frameInfo[clockPointer] === 0) {
                                    // Replace this page
                                    frames[clockPointer] = page;
                                    frameInfo[clockPointer] = 1; // Set reference bit for new page
                                    replacedIndex = clockPointer;
                                    replacedClock = true;
                                } else {
                                    // Give a second chance
                                    frameInfo[clockPointer] = 0;
                                }
                                
                                clockPointer = (clockPointer + 1) % frameCount;
                            }
                            break;
                    }
                }
            }
            
            // Save state to history
            simulationHistory.push({
                frames: [...frames],
                frameInfo: [...frameInfo],
                currentPage: page,
                isHit,
                replacedIndex,
                faults: pageFaults,
                hits: pageHits,
                step: i,
                clockPointer: algorithm === 'clock' ? clockPointer : null
            });
        }
        
        // Display initial state
        renderSimulation();
        updateButtons();
        showResults();
    }
    
    // Render simulation at current step
    function renderSimulation() {
        // Clear previous content
        referenceDisplay.innerHTML = '';
        framesContainer.innerHTML = '';
        timelineContainer.innerHTML = '';
        
        // Render reference string with hit/fault indicators
        referenceString.forEach((page, index) => {
            const pageEl = document.createElement('div');
            pageEl.classList.add('page-reference');
            
            // Check if this step has been processed
            if (index <= currentStep && simulationHistory[index]) {
                if (simulationHistory[index].isHit) {
                    pageEl.classList.add('hit');
                } else {
                    pageEl.classList.add('fault');
                }
            }
            
            if (index === currentStep) {
                pageEl.classList.add('active');
            }
            
            pageEl.textContent = page;
            referenceDisplay.appendChild(pageEl);
        });
        
        // Create timeline view
        const timelineRow = document.createElement('div');
        timelineRow.classList.add('timeline');
        
        // Add reference row to timeline
        const refRow = document.createElement('div');
        refRow.classList.add('timeline-step');
        
        const refLabel = document.createElement('div');
        refLabel.classList.add('timeline-label');
        refLabel.textContent = 'Ref';
        refRow.appendChild(refLabel);
        
        for (let i = 0; i < referenceString.length; i++) {
            const pageEl = document.createElement('div');
            pageEl.classList.add('timeline-page');
            
            if (i <= currentStep && simulationHistory[i]) {
                if (simulationHistory[i].isHit) {
                    pageEl.classList.add('hit');
                } else {
                    pageEl.classList.add('fault');
                }
            }
            
            if (i === currentStep) {
                pageEl.style.border = '2px solid var(--warning)';
            }
            
            pageEl.textContent = referenceString[i];
            refRow.appendChild(pageEl);
        }
        
        timelineContainer.appendChild(refRow);
        
        // Add frame rows to timeline
        for (let f = 0; f < frameCount; f++) {
            const frameRow = document.createElement('div');
            frameRow.classList.add('timeline-step');
            
            const frameLabel = document.createElement('div');
            frameLabel.classList.add('timeline-label');
            frameLabel.textContent = `F${f+1}`;
            frameRow.appendChild(frameLabel);
            
            for (let i = 0; i < referenceString.length; i++) {
                const frameEl = document.createElement('div');
                frameEl.classList.add('timeline-frame');
                
                if (i <= currentStep && simulationHistory[i]) {
                    const frameValue = simulationHistory[i].frames[f];
                    
                    if (frameValue !== null) {
                        frameEl.textContent = frameValue;
                        
                        // Show reference bit for Second Chance and Clock
                        if ((algorithm === 'second-chance' || algorithm === 'clock') && 
                            simulationHistory[i].frameInfo && simulationHistory[i].frameInfo[f] === 1) {
                            const bitEl = document.createElement('div');
                            bitEl.classList.add('reference-bit');
                            bitEl.textContent = 'R';
                            frameEl.appendChild(bitEl);
                        }
                        
                        // Show clock pointer for Clock algorithm
                        if (algorithm === 'clock' && simulationHistory[i].clockPointer === f) {
                            frameEl.style.border = '2px solid var(--primary)';
                        }
                        
                        if (i === currentStep && simulationHistory[i].replacedIndex === f) {
                            frameEl.classList.add('replaced');
                        }
                        
                        if (i === currentStep && referenceString[i] === frameValue) {
                            if (simulationHistory[i].isHit) {
                                frameEl.classList.add('hit');
                            } else {
                                frameEl.classList.add('fault');
                            }
                        }
                    } else {
                        frameEl.classList.add('empty');
                    }
                } else {
                    frameEl.classList.add('empty');
                }
                
                frameRow.appendChild(frameEl);
            }
            
            timelineContainer.appendChild(frameRow);
        }
        
        // Create detailed view headers
        const headerRow = document.createElement('div');
        headerRow.classList.add('frame-row');
        
        // Add reference header
        const refHeader = document.createElement('div');
        refHeader.classList.add('frame-cell', 'frame-header');
        refHeader.textContent = 'Reference';
        headerRow.appendChild(refHeader);
        
        // Add frame headers
        for (let i = 0; i < frameCount; i++) {
            const frameHeader = document.createElement('div');
            frameHeader.classList.add('frame-cell', 'frame-header');
            frameHeader.textContent = `Frame ${i+1}`;
            headerRow.appendChild(frameHeader);
        }
        
        // Add status header
        const statusHeader = document.createElement('div');
        statusHeader.classList.add('frame-cell', 'frame-header');
        statusHeader.textContent = 'Status';
        headerRow.appendChild(statusHeader);
        
        // Add info header for algorithms that need it
        if (algorithm === 'second-chance' || algorithm === 'clock') {
            const infoHeader = document.createElement('div');
            infoHeader.classList.add('frame-cell', 'frame-header');
            infoHeader.textContent = 'Reference Bit';
            headerRow.appendChild(infoHeader);
        }
        
        if (algorithm === 'clock') {
            const clockHeader = document.createElement('div');
            clockHeader.classList.add('frame-cell', 'frame-header');
            clockHeader.textContent = 'Clock Pointer';
            headerRow.appendChild(clockHeader);
        }
        
        framesContainer.appendChild(headerRow);
        
        // Only display steps up to current step
        for (let i = 0; i <= Math.min(currentStep, simulationHistory.length - 1); i++) {
            const state = simulationHistory[i];
            
            const row = document.createElement('div');
            row.classList.add('frame-row');
            
            // Add reference cell
            const refCell = document.createElement('div');
            refCell.classList.add('frame-cell');
            refCell.textContent = state.currentPage;
            row.appendChild(refCell);
            
            // Add frame cells
            for (let j = 0; j < frameCount; j++) {
                const frameCell = document.createElement('div');
                frameCell.classList.add('frame-cell');
                
                if (state.frames[j] !== null) {
                    frameCell.textContent = state.frames[j];
                }
                
                if (i === currentStep && j === state.replacedIndex) {
                    frameCell.classList.add('replaced');
                }
                
                row.appendChild(frameCell);
            }
            
            // Add status cell
            const statusCell = document.createElement('div');
            statusCell.classList.add('frame-cell');
            if (state.isHit) {
                statusCell.classList.add('page-hit');
                statusCell.textContent = 'Hit';
            } else {
                statusCell.classList.add('page-fault');
                statusCell.textContent = 'Fault';
            }
            row.appendChild(statusCell);
            
            // Add info cell for Second Chance and Clock
            if (algorithm === 'second-chance' || algorithm === 'clock') {
                const infoCell = document.createElement('div');
                infoCell.classList.add('frame-cell');
                if (state.frameInfo && state.frameInfo.length > 0) {
                    infoCell.textContent = state.frameInfo.map(bit => bit ? '1 (Set)' : '0 (Cleared)').join(', ');
                }
                row.appendChild(infoCell);
            }
            
            // Add clock pointer cell for Clock algorithm
            if (algorithm === 'clock') {
                const clockCell = document.createElement('div');
                clockCell.classList.add('frame-cell');
                if (state.clockPointer !== null) {
                    clockCell.textContent = `Points to Frame ${state.clockPointer + 1}`;
                }
                row.appendChild(clockCell);
            }
            
            framesContainer.appendChild(row);
        }
        
        // Update counters
        if (currentStep < simulationHistory.length) {
            const state = simulationHistory[currentStep];
            faultCountEl.textContent = state.faults;
            hitCountEl.textContent = state.hits;
        } else {
            faultCountEl.textContent = pageFaults;
            hitCountEl.textContent = pageHits;
        }
        
        // Update step counter
        currentStepEl.textContent = currentStep + 1;
        totalStepsEl.textContent = referenceString.length;
    }
    
    // Update button states
    function updateButtons() {
        prevStepBtn.disabled = currentStep === 0;
        nextStepBtn.disabled = currentStep >= simulationHistory.length - 1;
        
        // Update auto-run button text
        if (autoRunInterval) {
            autoRunBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Auto Run';
            autoRunBtn.classList.remove('btn-success');
            autoRunBtn.classList.add('btn-danger');
        } else {
            autoRunBtn.innerHTML = '<i class="fas fa-forward"></i> Auto Run';
            autoRunBtn.classList.remove('btn-danger');
            autoRunBtn.classList.add('btn-success');
        }
    }
    
    // Show final results
    function showResults() {
        const total = pageHits + pageFaults;
        const faultRate = (pageFaults / total * 100).toFixed(1);
        
        resultFaultsEl.textContent = pageFaults;
        resultHitsEl.textContent = pageHits;
        resultTotalEl.textContent = total;
        resultFaultRateEl.textContent = `${faultRate}%`;
    }
    
    // Auto-run simulation
    function toggleAutoRun() {
        if (autoRunInterval) {
            clearInterval(autoRunInterval);
            autoRunInterval = null;
        } else {
            if (currentStep >= simulationHistory.length - 1) {
                currentStep = 0;
                renderSimulation();
            }
            
            autoRunInterval = setInterval(() => {
                if (currentStep < simulationHistory.length - 1) {
                    currentStep++;
                    renderSimulation();
                    updateButtons();
                } else {
                    clearInterval(autoRunInterval);
                    autoRunInterval = null;
                    updateButtons();
                }
            }, 1000);
        }
        
        updateButtons();
    }
    
    // Event Listeners
    visualizeBtn.addEventListener('click', runSimulation);
    
    generatePatternBtn.addEventListener('click', function() {
        const pattern = patternTypeSelect.value;
        const length = parseInt(patternLengthInput.value);
        const maxPage = parseInt(patternMaxInput.value);
        
        if (pattern === 'custom') return;
        
        const refString = generateReferenceString(pattern, length, maxPage);
        referenceStringInput.value = refString.join(',');
    });
    
    resetBtn.addEventListener('click', function() {
        if (autoRunInterval) {
            clearInterval(autoRunInterval);
            autoRunInterval = null;
        }
        currentStep = 0;
        renderSimulation();
        updateButtons();
    });
    
    prevStepBtn.addEventListener('click', function() {
        if (currentStep > 0) {
            currentStep--;
            renderSimulation();
            updateButtons();
        }
    });
    
    nextStepBtn.addEventListener('click', function() {
        if (currentStep < simulationHistory.length - 1) {
            currentStep++;
            renderSimulation();
            updateButtons();
        }
    });
    
    autoRunBtn.addEventListener('click', toggleAutoRun);
    
    algorithmSelect.addEventListener('change', function() {
        algorithm = algorithmSelect.value;
        updateAlgorithmInfo();
    });
    
    // Initialize
    updateAlgorithmInfo();
    prevStepBtn.disabled = true;
    nextStepBtn.disabled = true;
}); 