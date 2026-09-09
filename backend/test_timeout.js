require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connect_timeout=20'
    }
  }
});
const start = Date.now();
p.user.findFirst().then(function(u) {
  console.log('Connected in ' + (Date.now() - start) + 'ms: ' + u?.email);
  process.exit(0);
}).catch(function(err) {
  console.error('Failed after ' + (Date.now() - start) + 'ms: ' + err.message);
  process.exit(1);
});
