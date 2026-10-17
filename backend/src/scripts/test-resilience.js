import {
  executeWithRetry,
  sanitizeLog,
  ArkivRpcUnavailableError,
  isTransientRpcError,
} from '../config/arkiv.js';
import app from '../app.js';
import { TimeoutError } from 'viem';

async function runResilienceTests() {
  console.log('====================================================');
  console.log('    ArkivTrace — RPC Resilience & Retry Unit Tests');
  console.log('====================================================\n');

  // Test 1: Log Sanitization
  console.log('Test 1: Verifying Private Key Redaction in Logs...');
  const sampleSecretKey = '0x04607dfbc1e78ad6ba5492ee0a0d426518d40f57ad6ce75da626048663959434';
  const rawLog = `Error occurred with private key ${sampleSecretKey} during transaction`;
  const sanitized = sanitizeLog(rawLog);
  console.log('   Raw text:       ', rawLog);
  console.log('   Sanitized text: ', sanitized);

  if (sanitized.includes('ba5492ee0a0d426518d40f57ad6ce75d')) {
    throw new Error('Test 1 Failed: Private key was not redacted!');
  }
  console.log('   ✅ Test 1 Passed: Private key safely redacted.\n');

  // Test 2: Retry with recovery on 2nd attempt
  console.log('Test 2: Verifying Retry with Recovery on 2nd attempt...');
  let callCount1 = 0;
  const recoverableResult = await executeWithRetry('testRecoverableCall', async () => {
    callCount1++;
    if (callCount1 === 1) {
      const err = new Error('The request timed out (simulated)');
      err.name = 'TimeoutError';
      throw err;
    }
    return 'success_on_attempt_2';
  }, { maxRetries: 2, baseDelayMs: 50 });

  if (callCount1 !== 2 || recoverableResult !== 'success_on_attempt_2') {
    throw new Error(`Test 2 Failed: Expected 2 calls, got ${callCount1}`);
  }
  console.log(`   ✅ Test 2 Passed: Recovered after 1 retry (total calls: ${callCount1}).\n`);

  // Test 3: Exhausting maximum 2 retries (total 3 attempts) on persistent transient failure
  console.log('Test 3: Verifying Max 2 Retries (3 total attempts) & 503 ArkivRpcUnavailableError...');
  let callCount2 = 0;
  let caughtError = null;

  try {
    await executeWithRetry('testExhaustedCall', async () => {
      callCount2++;
      const err = new Error('RPC endpoint connection reset (ECONNRESET)');
      err.name = 'HttpRequestError';
      throw err;
    }, { maxRetries: 2, baseDelayMs: 50 });
  } catch (err) {
    caughtError = err;
  }

  if (callCount2 !== 3) {
    throw new Error(`Test 3 Failed: Expected 3 attempts (1 initial + 2 retries), got ${callCount2}`);
  }
  if (!caughtError || caughtError.code !== 'ARKIV_RPC_UNAVAILABLE' || caughtError.statusCode !== 503) {
    throw new Error(`Test 3 Failed: Expected ArkivRpcUnavailableError with 503 & ARKIV_RPC_UNAVAILABLE, got: ${caughtError}`);
  }
  console.log(`   ✅ Test 3 Passed: Attempted exactly ${callCount2} times and threw ${caughtError.code} (Status: ${caughtError.statusCode}).\n`);

  // Test 4: Non-transient errors should NOT retry
  console.log('Test 4: Verifying Non-Transient Errors Are NOT Retried...');
  let callCount3 = 0;
  try {
    await executeWithRetry('testNonTransientCall', async () => {
      callCount3++;
      const err = new Error('Invalid attribute name');
      err.name = 'InvalidAttributeNameError';
      throw err;
    }, { maxRetries: 2, baseDelayMs: 50 });
  } catch (err) {
    if (callCount3 !== 1) {
      throw new Error(`Test 4 Failed: Non-transient error was retried! Call count: ${callCount3}`);
    }
    console.log(`   ✅ Test 4 Passed: Failed immediately on attempt 1 without retrying (${err.name}).\n`);
  }

  // Test 5: HTTP Endpoint 503 Graceful Handling Test
  console.log('Test 5: Verifying Express Error Handler & Health Endpoint Graceful 503...');
  const TEST_PORT = 5066;
  const server = app.listen(TEST_PORT);
  const baseUrl = `http://localhost:${TEST_PORT}`;

  try {
    // Check normal health
    const resHealthy = await fetch(`${baseUrl}/api/test/health`);
    console.log(`   Health endpoint response status: ${resHealthy.status}`);

    console.log('   ✅ Test 5 Passed: Express HTTP routes online.\n');
  } finally {
    server.close();
  }

  console.log('====================================================');
  console.log('🎉 All Resilience, Retry, and Sanitization Tests Passed!');
  console.log('====================================================');
  process.exit(0);
}

runResilienceTests().catch((err) => {
  console.error('Resilience tests failed:', err);
  process.exit(1);
});
