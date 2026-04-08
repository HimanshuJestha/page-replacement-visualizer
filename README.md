# Replacement Algorithm Visualizer

An interactive web application for visualizing and comparing various page replacement algorithms used in operating systems memory management.

## Features

- Visualize popular page replacement algorithms including:
  - FIFO (First-In-First-Out)
  - LRU (Least Recently Used)
  - Optimal
  - LFU (Least Frequently Used)
  - MRU (Most Recently Used)
  - Second Chance
  - Clock (Approximation)
  
- Interactive step-by-step visualization
- Algorithm comparison feature
- Statistical analysis of algorithm performance
- Reference string pattern generation
- Responsive design with dark mode support

## Screenshots

(Add screenshots here after deployment)

## Installation and Usage

### Prerequisites

- Node.js (v12 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/page-replacement-visualizer.git
cd page-replacement-visualizer
```

2. Install dependencies:
```
npm install
```

3. Start the application:
```
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

### Development

For development with auto-restart:
```
npm run dev
```

## Project Structure

- `index.html`, `comparison.html`, `statistics.html`, `documentation.html` - Main HTML pages
- `styles.css` - Shared CSS styles
- `common.js` - Shared JavaScript functions
- `visualization.js`, `comparison.js`, `statistics.js` - Page-specific JavaScript
- `server.js` - Express server
- `algorithms.js` - Backend algorithm implementations

## Algorithms Implemented

1. **FIFO (First-In-First-Out)**
   - Replaces the oldest page in memory
   - Simple to implement but may not be efficient
   - Suffers from Belady's anomaly

2. **LRU (Least Recently Used)**
   - Replaces the page that hasn't been used for the longest time
   - Better performance than FIFO
   - Requires tracking usage times

3. **Optimal**
   - Replaces the page that won't be used for the longest time in the future
   - Theoretical benchmark (not implementable in practice)
   - Provides minimum possible page faults

4. **LFU (Least Frequently Used)**
   - Replaces the page that has been used the least often
   - Good for workloads with stable frequency patterns
   - May not adapt quickly to changing patterns

5. **MRU (Most Recently Used)**
   - Replaces the most recently used page
   - Works well in specific scenarios (e.g., sequential access with loops)
   - Generally worse than LRU for most workloads

6. **Second Chance**
   - Enhancement to FIFO with reference bit
   - Gives pages a "second chance" before replacement
   - Better than FIFO but generally worse than LRU

7. **Clock**
   - Practical implementation of Second Chance
   - Uses a circular buffer ("clock face")
   - Similar performance to Second Chance

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Font Awesome for icons
- Chart.js for visualization
- Express.js for the server 