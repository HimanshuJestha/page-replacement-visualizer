// Page replacement algorithm implementations for backend use

/**
 * Run a single page replacement algorithm
 * @param {string} algorithm - Algorithm name (fifo, lru, optimal, etc.)
 * @param {number} frames - Number of frames
 * @param {number[]} refString - Reference string (array of page numbers)
 * @returns {Object} Result including hits, faults, frames history, etc.
 */
function runAlgorithm(algorithm, frames, refString) {
    let frameState = Array(frames).fill(null);
    let frameInfo = Array(frames).fill(null);
    let clockPointer = 0;
    let faults = 0;
    let hits = 0;
    let history = [];
    
    for (let i = 0; i < refString.length; i++) {
        const page = refString[i];
        const frameIndex = frameState.indexOf(page);
        const isHit = frameIndex !== -1;
        let replacedIndex = -1;
        
        if (isHit) {
            // Page hit - update frameInfo based on algorithm
            hits++;
            if (algorithm === 'lru') {
                frameInfo[frameIndex] = i; // Update timestamp for LRU
            } else if (algorithm === 'lfu') {
                frameInfo[frameIndex]++; // Increment usage count for LFU
            } else if (algorithm === 'second-chance' || algorithm === 'clock') {
                frameInfo[frameIndex] = 1; // Set reference bit
            }
        } else {
            // Page fault - need to replace a page or find empty frame
            faults++;
            const emptyIndex = frameState.indexOf(null);
            
            if (emptyIndex !== -1) {
                // Empty frame available
                frameState[emptyIndex] = page;
                replacedIndex = emptyIndex;
                
                // Set initial info based on algorithm
                if (algorithm === 'fifo' || algorithm === 'lru') {
                    frameInfo[emptyIndex] = i; // Set timestamp
                } else if (algorithm === 'lfu') {
                    frameInfo[emptyIndex] = 1; // Set initial frequency
                } else if (algorithm === 'second-chance' || algorithm === 'clock') {
                    frameInfo[emptyIndex] = 1; // Set reference bit
                }
                
                // Update clock pointer for Clock algorithm
                if (algorithm === 'clock') {
                    clockPointer = (emptyIndex + 1) % frames;
                }
            } else {
                // Need to replace a page based on algorithm
                switch (algorithm) {
                    case 'fifo':
                        // First-In-First-Out: Replace the oldest page
                        const oldestIndex = frameInfo.indexOf(Math.min(...frameInfo));
                        frameState[oldestIndex] = page;
                        frameInfo[oldestIndex] = i; // Update timestamp
                        replacedIndex = oldestIndex;
                        break;
                        
                    case 'lru':
                        // Least Recently Used: Replace the page that was used longest time ago
                        const lruIndex = frameInfo.indexOf(Math.min(...frameInfo));
                        frameState[lruIndex] = page;
                        frameInfo[lruIndex] = i; // Update timestamp
                        replacedIndex = lruIndex;
                        break;
                        
                    case 'optimal':
                        // Optimal: Replace the page that will not be used for the longest time
                        let farthestIndex = -1;
                        let farthestDistance = -1;
                        
                        for (let j = 0; j < frameState.length; j++) {
                            let nextUse = refString.indexOf(frameState[j], i + 1);
                            if (nextUse === -1) {
                                // Page will not be used again
                                farthestIndex = j;
                                break;
                            } else if (nextUse > farthestDistance) {
                                farthestDistance = nextUse;
                                farthestIndex = j;
                            }
                        }
                        
                        frameState[farthestIndex] = page;
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
                            frameState[lfuLruIndex] = page;
                            frameInfo[lfuLruIndex] = 1; // Reset frequency
                            replacedIndex = lfuLruIndex;
                        } else {
                            frameState[candidates[0]] = page;
                            frameInfo[candidates[0]] = 1; // Reset frequency
                            replacedIndex = candidates[0];
                        }
                        break;
                        
                    case 'mru':
                        // Most Recently Used: Replace the most recently used page
                        const mruIndex = frameInfo.indexOf(Math.max(...frameInfo));
                        frameState[mruIndex] = page;
                        frameInfo[mruIndex] = i; // Update timestamp
                        replacedIndex = mruIndex;
                        break;
                        
                    case 'second-chance':
                        // Second Chance: FIFO but with reference bit
                        let replaced = false;
                        let pointer = 0;
                        
                        while (!replaced) {
                            const currentIndex = pointer % frames;
                            
                            if (frameInfo[currentIndex] === 0) {
                                // Replace this page
                                frameState[currentIndex] = page;
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
                                frameState[clockPointer] = page;
                                frameInfo[clockPointer] = 1; // Set reference bit for new page
                                replacedIndex = clockPointer;
                                replacedClock = true;
                            } else {
                                // Give a second chance
                                frameInfo[clockPointer] = 0;
                            }
                            
                            clockPointer = (clockPointer + 1) % frames;
                        }
                        break;
                }
            }
        }
        
        // Save state to history
        history.push({
            frames: [...frameState],
            frameInfo: [...frameInfo],
            currentPage: page,
            isHit,
            replacedIndex,
            faults,
            hits,
            step: i,
            clockPointer: algorithm === 'clock' ? clockPointer : null
        });
    }
    
    return {
        algorithm,
        faults,
        hits,
        total: faults + hits,
        faultRate: (faults / (faults + hits) * 100).toFixed(1),
        history
    };
}

/**
 * Generate a reference string based on pattern
 * @param {string} pattern - Pattern type (random, sequential, locality, loop)
 * @param {number} length - Length of reference string
 * @param {number} maxPage - Maximum page number
 * @returns {number[]} Generated reference string
 */
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
            
        default:
            // Default to random if pattern not recognized
            for (let i = 0; i < length; i++) {
                refString.push(Math.floor(Math.random() * (maxPage + 1)));
            }
    }
    
    return refString;
}

// Export functions for use in server.js
module.exports = {
    runAlgorithm,
    generateReferenceString
}; 