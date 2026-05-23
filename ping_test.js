// ping_test.js — replace with this:
const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
    // ✅ Correct variable name
    const uri = process.env.MONGODB_URI;
    console.log('URI exists:', !!uri);
    console.log('URI preview:', uri?.substring(0, 30) + '...');

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('Connected!');

    const times = [];
    for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await mongoose.connection.db.admin().ping();
        times.push(Date.now() - start);
    }

    console.log('Ping Times (ms):', times);
    console.log('Average:', Math.round(times.reduce((a, b) => a + b) / times.length) + 'ms');
    console.log('Max:', Math.max(...times) + 'ms');
    process.exit(0);
}

test().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});