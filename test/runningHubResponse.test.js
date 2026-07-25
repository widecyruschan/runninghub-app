const assert = require('node:assert/strict');
const test = require('node:test');
const {
  extractRunningHubTaskId,
  getRunningHubResponseError
} = require('../src/runningHubResponse');

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

test('extracts RunningHub JSON error responses', () => {
  assert.deepEqual(getRunningHubResponseError({
    code: 804,
    msg: 'workflow not found'
  }), {
    code: '804',
    message: 'workflow not found'
  });

  assert.deepEqual(getRunningHubResponseError({
    success: false,
    message: 'nodeInfoList is invalid',
    error: { code: 'NODE_INFO_INVALID' }
  }), {
    code: 'NODE_INFO_INVALID',
    message: 'nodeInfoList is invalid'
  });
});

test('ignores successful RunningHub responses', () => {
  assert.equal(getRunningHubResponseError({ code: 0, data: { taskId: 'task-ok' } }), null);
  assert.equal(getRunningHubResponseError({ success: true, taskId: 'task-ok' }), null);
});
