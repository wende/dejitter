import { test, expect } from '@playwright/test';

test.describe('Dejitter recorder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-page.html');
    await page.waitForFunction(() => typeof window.dejitter === 'object');
  });

  test('injects window.dejitter with full API', async ({ page }) => {
    const api = await page.evaluate(() => Object.keys(window.dejitter));
    expect(api).toContain('configure');
    expect(api).toContain('start');
    expect(api).toContain('stop');
    expect(api).toContain('onStop');
    expect(api).toContain('findings');
    expect(api).toContain('summary');
    expect(api).toContain('getData');
    expect(api).toContain('getRaw');
    expect(api).toContain('toJSON');
  });

  test('renders floating UI button', async ({ page }) => {
    const btn = page.locator('#__dj_btn');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText('Record');
  });

  test('start() returns config string and records frames', async ({ page }) => {
    const result = await page.evaluate(async () => {
      dejitter.configure({
        selector: '.box',
        props: ['transform', 'opacity'],
        maxDuration: 5000,
        idleTimeout: 0,
      });

      const startMsg = dejitter.start();

      // Let CSS animations run
      await new Promise(r => setTimeout(r, 1000));
      dejitter.stop();

      return {
        startMsg,
        rawFrameCount: dejitter.getRaw().rawFrames.length,
      };
    });

    expect(result.startMsg).toContain('Recording');
    expect(result.startMsg).toContain('transform,opacity');
    expect(result.rawFrameCount).toBeGreaterThan(10);
  });

  test('findings() returns YAML string, findings(true) returns array', async ({ page }) => {
    const result = await page.evaluate(async () => {
      dejitter.configure({ selector: '.box', props: ['transform', 'opacity'], idleTimeout: 0 });
      dejitter.start();
      await new Promise(r => setTimeout(r, 500));
      dejitter.stop();

      return {
        yamlType: typeof dejitter.findings(),
        isArray: Array.isArray(dejitter.findings(true)),
      };
    });

    expect(result.yamlType).toBe('string');
    expect(result.isArray).toBe(true);
  });

  test('summary() returns YAML string, summary(true) returns object', async ({ page }) => {
    const result = await page.evaluate(async () => {
      dejitter.configure({ selector: '.box', props: ['transform'], idleTimeout: 0 });
      dejitter.start();
      await new Promise(r => setTimeout(r, 500));
      dejitter.stop();

      const raw = dejitter.summary(true);
      return {
        yamlType: typeof dejitter.summary(),
        rawType: typeof raw,
        hasExpectedKeys: 'duration' in raw && 'rawFrameCount' in raw && 'elementsTracked' in raw,
      };
    });

    expect(result.yamlType).toBe('string');
    expect(result.rawType).toBe('object');
    expect(result.hasExpectedKeys).toBe(true);
  });

  test('getData() returns full recording data', async ({ page }) => {
    const result = await page.evaluate(async () => {
      dejitter.configure({ selector: '.box', props: ['transform'], idleTimeout: 0 });
      dejitter.start();
      await new Promise(r => setTimeout(r, 500));
      dejitter.stop();

      const data = dejitter.getData();
      return {
        hasConfig: 'config' in data,
        hasSamples: Array.isArray(data.samples),
        hasElements: typeof data.elements === 'object',
        hasPropStats: 'props' in data.propStats,
        rawFrameCount: data.rawFrameCount,
        elemCount: Object.keys(data.elements).length,
      };
    });

    expect(result.hasConfig).toBe(true);
    expect(result.hasSamples).toBe(true);
    expect(result.hasElements).toBe(true);
    expect(result.hasPropStats).toBe(true);
    expect(result.rawFrameCount).toBeGreaterThan(0);
    expect(result.elemCount).toBe(3);
  });

  test('toJSON() returns valid JSON string', async ({ page }) => {
    const result = await page.evaluate(async () => {
      dejitter.configure({ selector: '.box', props: ['transform'], idleTimeout: 0 });
      dejitter.start();
      await new Promise(r => setTimeout(r, 300));
      dejitter.stop();

      const json = dejitter.toJSON();
      try {
        JSON.parse(json);
        return { valid: true, type: typeof json };
      } catch {
        return { valid: false, type: typeof json };
      }
    });

    expect(result.type).toBe('string');
    expect(result.valid).toBe(true);
  });

  test('tracks element identity with labels', async ({ page }) => {
    const result = await page.evaluate(async () => {
      dejitter.configure({ selector: '.box', props: ['transform'], idleTimeout: 0 });
      dejitter.start();
      await new Promise(r => setTimeout(r, 300));
      dejitter.stop();

      const elements = dejitter.getData().elements;
      const labels = Object.values(elements);
      return {
        count: labels.length,
        hasTag: labels.every(l => 'tag' in l),
        allDivs: labels.every(l => l.tag === 'div'),
      };
    });

    expect(result.count).toBe(3);
    expect(result.hasTag).toBe(true);
    expect(result.allDivs).toBe(true);
  });

  test('onStop callback fires after stop()', async ({ page }) => {
    const result = await page.evaluate(async () => {
      let callbackFired = false;
      dejitter.configure({ selector: '.box', props: ['transform'], idleTimeout: 0 });
      dejitter.onStop(() => { callbackFired = true; });
      dejitter.start();
      await new Promise(r => setTimeout(r, 200));
      dejitter.stop();
      return callbackFired;
    });

    expect(result).toBe(true);
  });

  test('UI button toggles recording state', async ({ page }) => {
    const btn = page.locator('#__dj_btn');

    // Initially not recording
    await expect(btn).toHaveAttribute('data-recording', 'false');
    await expect(page.locator('#__dj_label')).toHaveText('Record');

    // Click to start
    await btn.click();
    await expect(btn).toHaveAttribute('data-recording', 'true');
    await expect(page.locator('#__dj_label')).toHaveText('Stop');

    // Click to stop
    await btn.click();
    await expect(btn).toHaveAttribute('data-recording', 'false');
    await expect(page.locator('#__dj_label')).toHaveText('Record');
  });

  test('UI shows findings count after stop', async ({ page }) => {
    const btn = page.locator('#__dj_btn');
    const status = page.locator('#__dj_status');

    await btn.click();
    await page.waitForTimeout(1000);
    await btn.click();

    await expect(status).toBeVisible();
    const text = await status.textContent();
    expect(text).toMatch(/\d+ frames/);
  });

  test('idle auto-stop works', async ({ page }) => {
    const result = await page.evaluate(async () => {
      dejitter.configure({
        selector: '.box',
        props: ['opacity'],
        idleTimeout: 500,
        maxDuration: 0,
      });
      dejitter.start();

      // Wait for idle stop (animations will stop changing opacity after a while,
      // or the idle timeout fires after 500ms of no new changes)
      await new Promise(r => setTimeout(r, 2000));

      return {
        rawFrameCount: dejitter.getRaw().rawFrames.length,
      };
    });

    // Should have auto-stopped and captured some frames
    expect(result.rawFrameCount).toBeGreaterThan(0);
  });

  test('configure() overrides defaults and returns config', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cfg = dejitter.configure({
        selector: '.test',
        props: ['color'],
        sampleRate: 30,
        maxDuration: 5000,
      });
      return cfg;
    });

    expect(result.selector).toBe('.test');
    expect(result.props).toEqual(['color']);
    expect(result.sampleRate).toBe(30);
    expect(result.maxDuration).toBe(5000);
    // Defaults preserved
    expect(result.mutations).toBe(false);
    expect(result.idleTimeout).toBe(2000);
  });

  test('getRaw() returns rawFrames and mutations arrays', async ({ page }) => {
    const result = await page.evaluate(async () => {
      dejitter.configure({ selector: '.box', props: ['transform'], idleTimeout: 0, mutations: true });
      dejitter.start();
      await new Promise(r => setTimeout(r, 300));
      dejitter.stop();

      const raw = dejitter.getRaw();
      return {
        hasRawFrames: Array.isArray(raw.rawFrames),
        hasMutations: Array.isArray(raw.mutations),
        frameCount: raw.rawFrames.length,
      };
    });

    expect(result.hasRawFrames).toBe(true);
    expect(result.hasMutations).toBe(true);
    expect(result.frameCount).toBeGreaterThan(0);
  });
});
