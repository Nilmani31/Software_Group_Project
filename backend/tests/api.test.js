const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { test, before, after } = require('node:test');

const baseUrl = process.env.BACKEND_URL || 'http://localhost:5005';
const loginCredentials = {
  username: process.env.TEST_USERNAME || 'admin',
  password: process.env.TEST_PASSWORD || 'Admin@123',
};

let serverProcess;
let startedByTest = false;
let token;
let createdCategoryId;

async function request(path, options = {}) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: AbortSignal.timeout(options.timeoutMs || 15000),
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    let body = {};
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }

    return { response, body };
  } catch (error) {
    throw new Error(`Request ${options.method || 'GET'} ${path} failed: ${error.message}`, {
      cause: error,
    });
  }
}

async function waitForHealth(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const { response, body } = await request('/api/health');
      if (response.ok) {
        return body;
      }
      lastError = new Error(`Health endpoint returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Backend did not become ready: ${lastError?.message || 'timeout'}`);
}

before(async () => {
  try {
    await waitForHealth(3000);
    return;
  } catch {
    // Start the backend only when it is not already running.
  }

  serverProcess = spawn(process.execPath, ['index.js'], {
    cwd: __dirname.replace(/\\tests$/, ''),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  startedByTest = true;

  serverProcess.stdout.on('data', (data) => process.stderr.write(`[backend] ${data}`));
  serverProcess.stderr.on('data', (data) => process.stderr.write(`[backend] ${data}`));

  await waitForHealth();
});

after(async () => {
  if (createdCategoryId && token) {
    await request(`/api/categories/${createdCategoryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }

  if (startedByTest && serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});

test('backend startup, authentication, protected APIs, and category persistence', async () => {
  const health = await waitForHealth();
  assert.equal(health.status, 'OK');
  assert.equal(health.database, 'Connected');

  const unauthenticated = await request('/api/items');
  assert.equal(unauthenticated.response.status, 401);
  assert.equal(unauthenticated.body.message, 'Authentication token is required');

  const invalidLogin = await request('/api/users/login', {
    method: 'POST',
    body: JSON.stringify({
      username: loginCredentials.username,
      password: 'definitely-invalid',
    }),
  });
  assert.equal(invalidLogin.response.status, 401);

  const login = await request('/api/users/login', {
    method: 'POST',
    body: JSON.stringify(loginCredentials),
  });
  assert.equal(login.response.status, 200, JSON.stringify(login.body));
  assert.equal(login.body.success, true);
  assert.ok(login.body.token);
  token = login.body.token;

  const authHeaders = { Authorization: `Bearer ${token}` };
  const items = await request('/api/items', { headers: authHeaders });
  assert.equal(items.response.status, 200, JSON.stringify(items.body));
  assert.ok(Array.isArray(items.body));

  const categoryName = `Backend Test Category ${Date.now()}`;
  const createCategory = await request('/api/categories', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: categoryName,
      description: 'Created by automated backend API testing',
    }),
  });
  assert.equal(createCategory.response.status, 201, JSON.stringify(createCategory.body));
  assert.equal(createCategory.body.name, categoryName);
  createdCategoryId = createCategory.body._id;

  const categories = await request('/api/categories', { headers: authHeaders });
  assert.equal(categories.response.status, 200, JSON.stringify(categories.body));
  assert.ok(categories.body.some((category) => category._id === createdCategoryId));
});
