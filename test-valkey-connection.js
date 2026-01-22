const IORedis = require('ioredis');

console.log('Testing Valkey connection...');
console.log(`Host: ${process.env.VALKEY_HOST || '127.0.0.1'}`);
console.log(`Port: ${process.env.VALKEY_PORT || '6379'}`);

const redis = new IORedis({
  host: process.env.VALKEY_HOST || '127.0.0.1',
  port: parseInt(process.env.VALKEY_PORT || '6379'),
  password: process.env.VALKEY_PASSWORD || undefined,
  lazyConnect: true,
  family: 4,
});

redis.on('connect', () => {
  console.log('✓ Connected');
});

redis.on('ready', () => {
  console.log('✓ Ready');
  testCommands();
});

redis.on('error', (err) => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});

redis.on('close', () => {
  console.log('⚠ Connection closed');
});

async function testCommands() {
  try {
    console.log('\nTesting PING command...');
    const pong = await redis.ping();
    console.log('✓ PING response:', pong);

    console.log('\nTesting SET command...');
    await redis.set('test:key', 'test-value');
    console.log('✓ SET successful');

    console.log('\nTesting GET command...');
    const value = await redis.get('test:key');
    console.log('✓ GET response:', value);

    console.log('\nTesting DEL command...');
    await redis.del('test:key');
    console.log('✓ DEL successful');

    console.log('\n✅ All tests passed!');
    await redis.quit();
    process.exit(0);
  } catch (err) {
    console.error('✗ Command failed:', err.message);
    await redis.quit();
    process.exit(1);
  }
}

// Start connection
redis.connect().catch((err) => {
  console.error('✗ Failed to connect:', err.message);
  process.exit(1);
});
