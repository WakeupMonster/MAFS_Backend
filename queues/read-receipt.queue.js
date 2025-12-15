const { Queue, connection } = require("./bull");

module.exports = new Queue("read-receipt", { connection });
