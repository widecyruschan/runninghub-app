const assert = require('node:assert/strict');
const test = require('node:test');
const { extractRunningHubTaskId } = require('../src/runningHubResponse');

test('extracts RunningHub task id from common response shapes', () => {
  assert.equal(extractRunningHubTaskId({ taskId: 'task-direct' }), 'task-direct');
  assert.equal(extractRunningHubTaskId({ data: { taskId: 'task-data' } }), 'task-data');
  assert.equal(extractRunningHubTaskId({ data: { task_id: 'task-snake' } }), 'task-snake');
  assert.equal(extractRunningHubTaskId({ data: 'task-string' }), 'task-string');
  assert.equal(extractRunningHubTaskId({ eventData: { runningHubTaskId: 'task-event' } }), 'task-event');
  assert.equal(extractRunningHubTaskId({ data: { eventData: { id: 'task-nested' } } }), 'task-nested');
});

test('returns empty string when response has no task id', () => {
  assert.equal(extractRunningHubTaskId({ success: true, data: {} }), '');
  assert.equal(extractRunningHubTaskId(null), '');
});
