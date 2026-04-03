const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function benchmark() {
  console.log("--- BCRYPTJS BENCHMARK ---");
  const otp = "123456";
  const concurrentLimit = 100;

  // Measure single hashh
  const startSingle = performance.now();
  await bcrypt.hash(otp, 10);
  const singleTime = performance.now() - startSingle;
  console.log(`Single hash time (cost=10): ${singleTime.toFixed(2)} ms`);

  // Measure concurrent hashes (Event Loop Simulation)
  let promises = [];
  const startConcurrent = performance.now();
  for (let i = 0; i < concurrentLimit; i++) {
    promises.push(bcrypt.hash(otp, 10));
  }
  await Promise.all(promises);
  const concurrentTime = performance.now() - startConcurrent;
  console.log(`Concurrent ${concurrentLimit} hashes time: ${concurrentTime.toFixed(2)} ms`);
  console.log(`Average time per hash in concurrent load: ${(concurrentTime / concurrentLimit).toFixed(2)} ms\n`);

  console.log("--- CONCLUSION ---");
  console.log(`Node.js is single-threaded. Processing 100 hashes natively took ${concurrentTime.toFixed(2)}ms of pure CPU time.`);
}

benchmark();
