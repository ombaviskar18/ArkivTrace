import 'dotenv/config';

const baseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;
const summaryPath = process.env.SMOKE_SUMMARY_PATH || '/api/v1/dashboard/summary?limit=5';
const discrepancyPath =
  process.env.SMOKE_DISCREPANCY_PATH || '/api/v1/discrepancies?limit=1';

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function fetchOnce(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const data = await readJson(response);

  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    const rateLimited = new Error(
      `Received HTTP 429 for ${path}${retryAfter ? ` (Retry-After: ${retryAfter}s)` : ''}`
    );
    rateLimited.statusCode = 429;
    rateLimited.retryAfter = retryAfter;
    rateLimited.data = data;
    throw rateLimited;
  }

  if (!response.ok) {
    const error = new Error(`Request failed for ${path} with status ${response.status}`);
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return { response, data };
}

async function main() {
  console.log('====================================================');
  console.log('   ArkivTrace — Minimal Module 5-6 Live Smoke Test');
  console.log('====================================================\n');
  console.log(`Base URL: ${baseUrl}`);

  try {
    const summary = await fetchOnce(summaryPath);
    console.log(`1. Dashboard summary: ${summary.response.status}`);
    console.log(`   Entities: ${summary.data?.data?.recentActivity?.length ?? 0} recent item(s)`);

    const discrepancies = await fetchOnce(discrepancyPath);
    console.log(`2. Discrepancy list: ${discrepancies.response.status}`);
    console.log(`   Count: ${discrepancies.data?.data?.count ?? 0}`);

    console.log('\nSmoke test completed without retries.');
    process.exit(0);
  } catch (error) {
    if (error.statusCode === 429) {
      console.error(`\nRate limited by Arkiv RPC. ${error.message}`);
      process.exit(2);
    }

    console.error('\nSmoke test failed:', error.message);
    if (error.data) {
      console.error(JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

main();
