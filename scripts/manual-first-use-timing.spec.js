/* global process */
import fs from 'fs';
import path from 'path';
// eslint-disable-next-line import/no-unresolved
import { test } from '@playwright/test';

const PREVIEW_URL = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const API_ORIGIN = process.env.API_ORIGIN || 'http://localhost:8080';
const OUTPUT_PATH = process.env.FIRST_USE_TIMING_OUTPUT
  || path.join(process.cwd(), 'src', 'test', 'manual', 'performance-first-load-browser-timing.json');

function apiResponse(data, overrides = {}) {
  return {
    statusCode: 200,
    message: 'OK',
    ...overrides,
    data,
  };
}

function json(body) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

function nowIso() {
  return new Date().toISOString();
}

function createMockData() {
  return {
    auth: {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      userID: 1001,
      username: 'USER',
      role: 'USER',
      email: 'user@quizmateai.local',
      authProvider: 'LOCAL',
      user: {
        id: 1001,
        userID: 1001,
        username: 'USER',
        email: 'user@quizmateai.local',
        fullName: 'Mock User',
        role: 'USER',
      },
      subscription: {
        id: 1,
        name: 'Free',
        level: 1,
        status: 'ACTIVE',
      },
      groups: [],
    },
    workspaces: [],
    createdWorkspace: {
      workspaceId: 91001,
      title: null,
      name: null,
      displayTitle: null,
      description: null,
      workspaceKind: 'INDIVIDUAL',
      createdAt: nowIso(),
    },
    createdGroupWorkspace: {
      workspaceId: 92001,
      title: null,
      name: null,
      displayTitle: null,
      description: null,
      workspaceKind: 'GROUP',
      createdAt: nowIso(),
    },
  };
}

async function blockGoogle(page) {
  await page.route('https://accounts.google.com/**', async (route) => {
    await route.fulfill({
      status: 204,
      body: '',
    });
  });
  await page.route('https://*.google.com/**', async (route) => {
    await route.fulfill({
      status: 204,
      body: '',
    });
  });
}

async function forceEnglishLanguage(context) {
  await context.addInitScript(() => {
    window.localStorage.setItem('app_language', 'en');
  });
}

async function installMockApi(page, mockData) {
  const apiPrefix = `${API_ORIGIN}/api`;
  const requestLog = [];

  await page.route(`${apiPrefix}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = `${url.pathname}${url.search}`;
    const method = request.method().toUpperCase();
    requestLog.push(`${method} ${path}`);

    if (path === '/api/auth/login' && method === 'POST') {
      await page.waitForTimeout(220);
      await route.fulfill(json(apiResponse(mockData.auth)));
      return;
    }

    if (path.startsWith('/api/workspace/getByUser') && method === 'GET') {
      await route.fulfill(json(apiResponse({
        content: mockData.workspaces,
        number: 0,
        size: 10,
        totalPages: 1,
        totalElements: mockData.workspaces.length,
      })));
      return;
    }

    if (path === '/api/workspace/create/individual' && method === 'POST') {
      await page.waitForTimeout(260);
      mockData.workspaces = [mockData.createdWorkspace, ...mockData.workspaces];
      await route.fulfill(json(apiResponse(mockData.createdWorkspace)));
      return;
    }

    if (path === '/api/workspace/create/group' && method === 'POST') {
      await page.waitForTimeout(320);
      mockData.workspaces = [mockData.createdGroupWorkspace, ...mockData.workspaces];
      await route.fulfill(json(apiResponse(mockData.createdGroupWorkspace)));
      return;
    }

    if (path === `/api/workspace/${mockData.createdWorkspace.workspaceId}` && method === 'GET') {
      await route.fulfill(json(apiResponse(mockData.createdWorkspace)));
      return;
    }

    if (path === `/api/workspace/${mockData.createdGroupWorkspace.workspaceId}` && method === 'GET') {
      await route.fulfill(json(apiResponse(mockData.createdGroupWorkspace)));
      return;
    }

    if (path === `/api/workspace-profile/individual/${mockData.createdWorkspace.workspaceId}` && method === 'GET') {
      await route.fulfill(json(apiResponse({
        workspaceId: mockData.createdWorkspace.workspaceId,
        onboardingCompleted: false,
        workspaceSetupStatus: 'BASIC',
        currentStep: 1,
        totalSteps: 3,
        workspacePurpose: '',
      })));
      return;
    }

    if (path === `/api/workspace-profile/group/${mockData.createdGroupWorkspace.workspaceId}` && method === 'GET') {
      await route.fulfill(json(apiResponse({
        workspaceId: mockData.createdGroupWorkspace.workspaceId,
        workspaceName: '',
        groupName: '',
        learningMode: 'STUDY_NEW',
        setupCompleted: false,
        onboardingCompleted: false,
        currentStep: 1,
        totalSteps: 2,
      })));
      return;
    }

    if (path.startsWith('/api/workspace-profile/individual/') && method === 'PUT') {
      await route.fulfill(json(apiResponse({ success: true })));
      return;
    }

    if (path.startsWith('/api/workspace-profile/group/') && method === 'PUT') {
      await route.fulfill(json(apiResponse({ success: true })));
      return;
    }

    if (path.startsWith('/api/workspace-profile/group/') && path.endsWith('/confirm') && method === 'POST') {
      await route.fulfill(json(apiResponse({ success: true })));
      return;
    }

    if (path.startsWith('/api/workspace-profile/individual/') && path.endsWith('/confirm') && method === 'POST') {
      await route.fulfill(json(apiResponse({ success: true })));
      return;
    }

    if (path.startsWith('/api/materials/workspace/') && method === 'GET') {
      await route.fulfill(json(apiResponse([])));
      return;
    }

    if (path.startsWith('/api/group/') && path.endsWith('/members?page=0&size=50') && method === 'GET') {
      await route.fulfill(json(apiResponse([])));
      return;
    }

    if (path === '/api/group/me' && method === 'GET') {
      await route.fulfill(json(apiResponse([])));
      return;
    }

    if (path.startsWith('/api/group/') && path.endsWith('/dashboard/summary') && method === 'GET') {
      await route.fulfill(json(apiResponse({
        totalMembers: 1,
        activeMembers: 1,
        averageCompletionRate: 0,
        reviewQueueSize: 0,
      })));
      return;
    }

    if (path.startsWith('/api/group/') && path.includes('/dashboard/members') && method === 'GET') {
      await route.fulfill(json(apiResponse({
        content: [],
        number: 0,
        size: 20,
        totalPages: 0,
        totalElements: 0,
      })));
      return;
    }

    if (path.startsWith('/api/quiz/scope/') && method === 'GET') {
      await route.fulfill(json(apiResponse([])));
      return;
    }

    if (path.startsWith('/api/flashcard/scope/') && method === 'GET') {
      await route.fulfill(json(apiResponse([])));
      return;
    }

    if (path.startsWith('/api/workspace/') && path.endsWith('/personalization') && method === 'GET') {
      await route.fulfill(json(apiResponse({})));
      return;
    }

    if (path === '/api/wallet/me' && method === 'GET') {
      await route.fulfill(json(apiResponse({
        totalAvailableCredits: 0,
        regularCreditBalance: 0,
        planCreditBalance: 0,
        hasActivePlan: false,
      })));
      return;
    }

    if (path === '/api/payment/current-subscription' && method === 'GET') {
      await route.fulfill(json(apiResponse({
        id: 1,
        name: 'Free',
        level: 1,
        status: 'ACTIVE',
      })));
      return;
    }

    if (path.startsWith('/api/management/') && method === 'GET') {
      await route.fulfill(json(apiResponse({})));
      return;
    }

    await route.fulfill(json(apiResponse({})));
  });

  return requestLog;
}

async function collectColdRouteMetrics(page, path, readinessSelector) {
  const metrics = await page.evaluate(() => {
    window.__perfMetrics = {};
    const nav = performance.getEntriesByType('navigation')[0];
    window.__perfMetrics.navigationStart = nav ? nav.startTime : 0;
  });
  void metrics;

  const routeStart = Date.now();
  await page.goto(`${PREVIEW_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.locator(readinessSelector).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(500);
  const routeReady = Date.now() - routeStart;
  return {
    path,
    routeReadyMs: routeReady,
  };
}

async function captureTransitionMetrics(page, options) {
  const {
    submitAction,
    feedbackLocator,
    destinationUrlPattern,
    destinationReadyLocator,
    apiUrlPattern,
  } = options;

  let apiStart = null;
  let apiEnd = null;
  let responseStatus = null;

  const requestListener = (request) => {
    if (request.url().includes(apiUrlPattern) && apiStart === null) {
      apiStart = Date.now();
    }
  };

  const responseListener = (response) => {
    if (response.url().includes(apiUrlPattern) && apiEnd === null) {
      apiEnd = Date.now();
      responseStatus = response.status();
    }
  };

  page.on('request', requestListener);
  page.on('response', responseListener);

  const actionStartedAt = Date.now();
  await submitAction();
  await feedbackLocator.waitFor({ state: 'visible', timeout: 5000 });
  const feedbackStart = Date.now() - actionStartedAt;

  await page.waitForURL(destinationUrlPattern, { timeout: 15000 });
  await page.locator(destinationReadyLocator).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(500);
  const routeReadyAt = Date.now();

  page.off('request', requestListener);
  page.off('response', responseListener);

  return {
    feedbackStartMs: feedbackStart,
    apiDurationMs: apiStart !== null && apiEnd !== null ? apiEnd - apiStart : null,
    feTransitionDurationMs: apiEnd !== null ? routeReadyAt - apiEnd : null,
    totalActionToReadyMs: routeReadyAt - actionStartedAt,
    responseStatus,
  };
}

test('measure first-use route and transition timing', async ({ browser }) => {
  test.setTimeout(120000);

  const publicContext = await browser.newContext();
  await forceEnglishLanguage(publicContext);
  const publicPage = await publicContext.newPage();
  await blockGoogle(publicPage);

  const landingMetrics = await collectColdRouteMetrics(publicPage, '/', 'h1');
  const loginMetrics = await collectColdRouteMetrics(publicPage, '/login', 'input#username');
  await publicContext.close();

  const mockData = createMockData();
  const flowContext = await browser.newContext();
  await forceEnglishLanguage(flowContext);
  const page = await flowContext.newPage();
  await blockGoogle(page);
  const requestLog = await installMockApi(page, mockData);

  await page.goto(`${PREVIEW_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input#username', 'USER');
  await page.fill('input#password', '123456');

  const loginTransitionMetrics = await captureTransitionMetrics(page, {
    submitAction: async () => {
      await page.getByRole('button', { name: /login/i }).click();
    },
    feedbackLocator: page.locator('form button[type="submit"] svg.animate-spin').first(),
    destinationUrlPattern: /\/home/,
    destinationReadyLocator: 'text=My Workspaces',
    apiUrlPattern: '/api/auth/login',
  });

  const createWorkspaceMetrics = await captureTransitionMetrics(page, {
    submitAction: async () => {
      await page.getByText(/Create .*workspace/i).first().click();
    },
    feedbackLocator: page.locator('[role="alert"]').first(),
    destinationUrlPattern: /\/workspaces\/\d+/,
    destinationReadyLocator: '[role="dialog"]',
    apiUrlPattern: '/api/workspace/create/individual',
  });

  await page.goto(`${PREVIEW_URL}/home?tab=group`, { waitUntil: 'domcontentloaded' });
  await page.locator('text=My Groups').first().waitFor({ state: 'visible', timeout: 15000 });

  const createGroupWorkspaceMetrics = await captureTransitionMetrics(page, {
    submitAction: async () => {
      await page.getByText(/Create .*group/i).first().click();
    },
    feedbackLocator: page.locator('[role="alert"]').first(),
    destinationUrlPattern: /\/group-workspaces\/\d+/,
    destinationReadyLocator: '[role="dialog"]',
    apiUrlPattern: '/api/workspace/create/group',
  });

  const report = {
    mode: 'preview-with-mocked-api-for-auth-and-create-flows',
    capturedAt: nowIso(),
    previewUrl: PREVIEW_URL,
    landing: landingMetrics,
    login: loginMetrics,
    loginToHome: loginTransitionMetrics,
    createWorkspace: createWorkspaceMetrics,
    createGroupWorkspace: createGroupWorkspaceMetrics,
    requestLog,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await flowContext.close();
});
