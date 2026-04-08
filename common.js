// Common functionality shared across all pages

// Algorithm descriptions and efficiency values
const algorithmInfo = {
    fifo: {
        description: "FIFO (First-In-First-Out) replaces the oldest page in memory. Simple to implement but may not be efficient as it doesn't consider usage patterns. Suffers from Belady's anomaly where increasing frames can sometimes increase faults.",
        efficiency: 60
    },
    lru: {
        description: "LRU (Least Recently Used) replaces the page that hasn't been used for the longest time. Better performance than FIFO but requires more overhead to track usage. Approximates optimal in many cases.",
        efficiency: 85
    },
    optimal: {
        description: "Optimal algorithm replaces the page that won't be used for the longest time in the future. Provides the theoretical minimum page faults but not practical as it requires future knowledge. Used as a benchmark for other algorithms.",
        efficiency: 100
    },
    lfu: {
        description: "LFU (Least Frequently Used) replaces the page that has been used the least often. Good for workloads with stable frequency patterns but may not adapt quickly to changing access patterns. Can be combined with aging to improve adaptability.",
        efficiency: 75
    },
    mru: {
        description: "MRU (Most Recently Used) replaces the most recently used page. Works well in specific scenarios where older pages are more likely to be used again (like sequential access with loops). Generally performs worse than LRU for most workloads.",
        efficiency: 50
    },
    'second-chance': {
        description: "Second Chance is an enhancement to FIFO that gives pages a 'second chance' before replacement. Pages are marked with a reference bit that is checked before replacement. If the bit is set, the page gets a second chance and the bit is cleared. Better than FIFO but generally worse than LRU.",
        efficiency: 70
    },
    clock: {
        description: "Clock algorithm is a practical implementation of Second Chance that uses a circular buffer (like a clock face) to track pages and their reference bits. More efficient to implement than pure Second Chance and performs similarly. The 'clock hand' rotates through frames looking for a page to replace.",
        efficiency: 70
    }
};

// Get color for algorithm (used in charts)
function getAlgorithmColor(algorithm) {
    const colors = {
        fifo: '#4361ee',
        lru: '#4cc9f0',
        optimal: '#f72585',
        lfu: '#4895ef',
        mru: '#f8961e',
        'second-chance': '#3a0ca3',
        clock: '#7209b7'
    };
    
    return colors[algorithm] || '#6c757d';
}

// Dark mode toggle functionality
function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    
    if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        document.getElementById('dark-mode-toggle').innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        document.getElementById('dark-mode-toggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// Check for saved theme preference
function checkThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('dark-mode-toggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// Run a single algorithm and return results
function runAlgorithm(algorithm, frames, refString) {
    let frameState = Array(frames).fill(null);
    let frameInfo = Array(frames).fill(null);
    let clockPointer = 0;
    let faults = 0;
    let hits = 0;
    
    for (let i = 0; i < refString.length; i++) {
        const page = refString[i];
        const frameIndex = frameState.indexOf(page);
        const isHit = frameIndex !== -1;
        
        if (isHit) {
            hits++;
            if (algorithm === 'lru') {
                frameInfo[frameIndex] = i;
            } else if (algorithm === 'lfu') {
                frameInfo[frameIndex]++;
            } else if (algorithm === 'second-chance' || algorithm === 'clock') {
                frameInfo[frameIndex] = 1;
            }
        } else {
            faults++;
            const emptyIndex = frameState.indexOf(null);
            
            if (emptyIndex !== -1) {
                frameState[emptyIndex] = page;
                if (algorithm === 'fifo' || algorithm === 'lru') {
                    frameInfo[emptyIndex] = i;
                } else if (algorithm === 'lfu') {
                    frameInfo[emptyIndex] = 1;
                } else if (algorithm === 'second-chance' || algorithm === 'clock') {
                    frameInfo[emptyIndex] = 1;
                }
                
                if (algorithm === 'clock') {
                    clockPointer = (emptyIndex + 1) % frames;
                }
            } else {
                switch (algorithm) {
                    case 'fifo':
                        const oldestIndex = frameInfo.indexOf(Math.min(...frameInfo));
                        frameState[oldestIndex] = page;
                        frameInfo[oldestIndex] = i;
                        break;
                        
                    case 'lru':
                        const lruIndex = frameInfo.indexOf(Math.min(...frameInfo));
                        frameState[lruIndex] = page;
                        frameInfo[lruIndex] = i;
                        break;
                        
                    case 'optimal':
                        let farthestIndex = -1;
                        let farthestDistance = -1;
                        
                        for (let j = 0; j < frameState.length; j++) {
                            let nextUse = refString.indexOf(frameState[j], i + 1);
                            if (nextUse === -1) {
                                farthestIndex = j;
                                break;
                            } else if (nextUse > farthestDistance) {
                                farthestDistance = nextUse;
                                farthestIndex = j;
                            }
                        }
                        
                        frameState[farthestIndex] = page;
                        break;
                        
                    case 'lfu':
                        const minFrequency = Math.min(...frameInfo);
                        const candidates = frameInfo.map((freq, idx) => freq === minFrequency ? idx : -1).filter(idx => idx !== -1);
                        
                        if (candidates.length > 1) {
                            const timestamps = candidates.map(idx => frameInfo[idx]);
                            const lfuLruIndex = candidates[timestamps.indexOf(Math.min(...timestamps))];
                            frameState[lfuLruIndex] = page;
                            frameInfo[lfuLruIndex] = 1;
                        } else {
                            frameState[candidates[0]] = page;
                            frameInfo[candidates[0]] = 1;
                        }
                        break;
                        
                    case 'mru':
                        const mruIndex = frameInfo.indexOf(Math.max(...frameInfo));
                        frameState[mruIndex] = page;
                        frameInfo[mruIndex] = i;
                        break;
                        
                    case 'second-chance':
                        let replaced = false;
                        let pointer = 0;
                        
                        while (!replaced) {
                            const currentIndex = pointer % frames;
                            
                            if (frameInfo[currentIndex] === 0) {
                                frameState[currentIndex] = page;
                                frameInfo[currentIndex] = 1;
                                replaced = true;
                            } else {
                                frameInfo[currentIndex] = 0;
                            }
                            
                            pointer++;
                        }
                        break;
                        
                    case 'clock':
                        let replacedClock = false;
                        
                        while (!replacedClock) {
                            if (frameInfo[clockPointer] === 0) {
                                frameState[clockPointer] = page;
                                frameInfo[clockPointer] = 1;
                                replacedClock = true;
                            } else {
                                frameInfo[clockPointer] = 0;
                            }
                            
                            clockPointer = (clockPointer + 1) % frames;
                        }
                        break;
                }
            }
        }
    }
    
    return {
        algorithm,
        faults,
        hits,
        total: faults + hits,
        faultRate: (faults / (faults + hits) * 100).toFixed(1)
    };
}

// Generate reference string based on pattern
function generateReferenceString(pattern, length, maxPage) {
    let refString = [];
    
    switch (pattern) {
        case 'random':
            for (let i = 0; i < length; i++) {
                refString.push(Math.floor(Math.random() * (maxPage + 1)));
            }
            break;
            
        case 'sequential':
            for (let i = 0; i < length; i++) {
                refString.push(i % (maxPage + 1));
            }
            break;
            
        case 'locality':
            // Temporal locality - some pages are accessed more frequently
            const hotPages = [1, 3, 5].filter(p => p <= maxPage);
            const coldPages = [0, 2, 4, 6, 7, 8, 9].filter(p => p <= maxPage);
            
            for (let i = 0; i < length; i++) {
                // 70% chance of accessing a hot page
                if (Math.random() < 0.7 && hotPages.length > 0) {
                    refString.push(hotPages[Math.floor(Math.random() * hotPages.length)]);
                } else if (coldPages.length > 0) {
                    refString.push(coldPages[Math.floor(Math.random() * coldPages.length)]);
                } else {
                    refString.push(Math.floor(Math.random() * (maxPage + 1)));
                }
            }
            break;
            
        case 'loop':
            // Loop pattern - repeating sequence
            const sequence = Array.from({length: Math.min(10, maxPage + 1)}, (_, i) => i);
            for (let i = 0; i < length; i++) {
                refString.push(sequence[i % sequence.length]);
            }
            break;
    }
    
    return refString;
}

// Document ready event
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dark mode
    checkThemePreference();
    
    // Set up dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
});

// Export functions for use in other script files
window.algorithmInfo = algorithmInfo;
window.getAlgorithmColor = getAlgorithmColor;
window.toggleDarkMode = toggleDarkMode;
window.runAlgorithm = runAlgorithm;
window.generateReferenceString = generateReferenceString; 