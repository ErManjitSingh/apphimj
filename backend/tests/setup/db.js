const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

/**
 * Isolated in-memory MongoDB for tests — never touches the real dev/prod
 * database configured in .env's MONGO_URI. Call from a test file's own
 * beforeAll/afterAll/afterEach (Jest doesn't share setup across files).
 */
async function connect() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

async function clearCollections() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

async function disconnect() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
}

module.exports = { connect, clearCollections, disconnect };
