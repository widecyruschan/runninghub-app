function extractRunningHubTaskId(responseData) {
  return findTaskIdDeep(responseData);
}

function getRunningHubResponseError(responseData) {
  if (!responseData || typeof responseData !== 'object' || Array.isArray(responseData)) return null;

  if (responseData.code !== undefined && responseData.code !== null && Number(responseData.code) !== 0) {
    return {
      code: normalizeErrorCode(responseData.code),
      message: getRunningHubErrorMessage(responseData)
    };
  }

  if (responseData.success === false) {
    return {
      code: normalizeErrorCode(responseData.error?.code ?? responseData.code ?? 'RUNNINGHUB_REQUEST_FAILED'),
      message: getRunningHubErrorMessage(responseData)
    };
  }

  return null;
}

function findDirectTaskId(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return normalizeTaskId(value);
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';

  return normalizeTaskId(
    value.taskId
    ?? value.task_id
    ?? value.taskID
    ?? value.runningHubTaskId
    ?? value.runninghub_task_id
    ?? value.runninghubTaskId
    ?? value.taskNo
    ?? value.task_no
    ?? value.taskUuid
    ?? value.task_uuid
    ?? getFirstTaskId(value.taskIds)
    ?? getFirstTaskId(value.task_ids)
    ?? getFirstTaskId(value.taskIdList)
    ?? value.id
  );
}

function findTaskIdDeep(value, depth = 0, visited = new Set()) {
  if (depth > 0 && (typeof value === 'string' || typeof value === 'number')) return '';

  const directTaskId = findDirectTaskId(value);
  if (directTaskId) return directTaskId;
  if (!value || typeof value !== 'object' || depth >= 5 || visited.has(value)) return '';

  visited.add(value);

  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);

  for (const [key, childValue] of entries) {
    if (isTaskIdContainerKey(key)) {
      const taskId = normalizeTaskId(childValue);
      if (taskId) return taskId;
    }

    if (isTaskIdKey(key)) {
      const taskId = Array.isArray(childValue)
        ? getFirstTaskId(childValue)
        : normalizeTaskId(childValue);
      if (taskId) return taskId;
    }
  }

  for (const [, childValue] of entries) {
    const taskId = findTaskIdDeep(childValue, depth + 1, visited);
    if (taskId) return taskId;
  }

  return '';
}

function summarizeRunningHubResponseShape(responseData) {
  if (!responseData || typeof responseData !== 'object') return 'non-object response';

  const rootKeys = Object.keys(responseData);
  const sections = [`root keys: ${formatKeyList(rootKeys)}`];
  ['data', 'result', 'eventData'].forEach((key) => {
    const value = responseData[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sections.push(`${key} keys: ${formatKeyList(Object.keys(value))}`);
    }
  });

  return sections.join('; ');
}

function normalizeTaskId(value) {
  const taskId = String(value ?? '').trim();
  if (!taskId || taskId === '[object Object]') return '';
  return taskId;
}

function isTaskIdKey(key) {
  return [
    'taskid',
    'task_id',
    'taskidlist',
    'task_id_list',
    'taskids',
    'task_ids',
    'runninghubtaskid',
    'runninghub_task_id',
    'taskno',
    'task_no',
    'taskuuid',
    'task_uuid',
    'id'
  ].includes(String(key || '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase());
}

function isTaskIdContainerKey(key) {
  return ['data', 'result', 'eventdata'].includes(String(key || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
}

function getFirstTaskId(value) {
  if (!Array.isArray(value)) return '';
  for (const item of value) {
    const taskId = normalizeTaskId(item);
    if (taskId) return taskId;
  }
  return '';
}

function formatKeyList(keys) {
  if (!keys.length) return '(none)';
  return keys.slice(0, 12).join(', ');
}

function getRunningHubErrorMessage(responseData) {
  return String(
    responseData?.msg
    || responseData?.message
    || responseData?.errorMessage
    || responseData?.error?.message
    || responseData?.error?.details
    || 'RunningHub request failed'
  ).trim();
}

function normalizeErrorCode(value) {
  const errorCode = String(value ?? '').trim();
  return errorCode || 'RUNNINGHUB_REQUEST_FAILED';
}

module.exports = {
  extractRunningHubTaskId,
  getRunningHubResponseError,
  summarizeRunningHubResponseShape
};
