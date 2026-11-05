import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAiBaseURL } from '../backend/ai-endpoint.mjs';

test('adds the Azure OpenAI v1 route to a resource endpoint', () => {
  assert.equal(
    normalizeAiBaseURL('https://learnbridgeapp.openai.azure.com/', true),
    'https://learnbridgeapp.openai.azure.com/openai/v1',
  );
});

test('does not duplicate an existing Azure OpenAI v1 route', () => {
  assert.equal(
    normalizeAiBaseURL('https://learnbridgeapp.openai.azure.com/openai/v1/', true),
    'https://learnbridgeapp.openai.azure.com/openai/v1',
  );
});

test('leaves an OpenAI-compatible base URL unchanged', () => {
  assert.equal(
    normalizeAiBaseURL('https://api.openai.com/v1/', false),
    'https://api.openai.com/v1',
  );
});
