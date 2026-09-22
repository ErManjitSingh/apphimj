const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'travel_crm',
    },
  });
  console.log('MongoDB memory server ready:', mongod.getUri());
  const stop = async () => {
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
