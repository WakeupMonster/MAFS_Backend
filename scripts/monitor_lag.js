/**
 * monitor_lag.js
 * Standalone script to measure Node.js Event Loop Lag.
 * Run this in a separate terminal while performing load tests.
 */

const { performance, PerformanceObserver } = require('perf_hooks');

console.log('⏱️ Event Loop Monitoring Started...');
console.log('Lower values are better. High spikes (>100ms) indicate the main thread is blocking.');
console.log('--------------------------------------------------');

let lastTime = performance.now();

function checkLag() {
    const currentTime = performance.now();
    const lag = currentTime - lastTime - 100; // Subtract the expected 100ms interval
    
    const timestamp = new Date().toLocaleTimeString();
    
    if (lag > 200) {
        console.error(`🔴 [${timestamp}] SEVERE LAG: ${lag.toFixed(2)}ms`);
    } else if (lag > 50) {
        console.warn(`🟡 [${timestamp}] WARNING LAG: ${lag.toFixed(2)}ms`);
    } else {
        console.log(`🟢 [${timestamp}] Lag: ${lag.toFixed(2)}ms`);
    }

    lastTime = performance.now();
    setTimeout(checkLag, 100); // Check every 100ms
}

checkLag();
