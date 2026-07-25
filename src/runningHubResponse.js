function extractRunningHubTaskId(responseData) {
  const directTaskId = findDirectTaskId(responseData);
  if (directTaskId) return directTaskId;

  const containers = [
    responseData?.data,
    responseData?.eventData,
    responseData?.data?.data,
    responseData?.data?.eventData,
    responseData?.result,
    responseData?.data?.result
  ];

  for (const container of containers) {
    const taskId = findDirectTaskId(container);
    if (taskId) return taskId;
  }

  return '';
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
    ?? value.id
  );
}

function normalizeTaskId(value) {
  const taskId = String(value ?? '').trim();
  if (!taskId || taskId === '[object Object]') return '';
  return taskId;
}

module.exports = {
  extractRunningHubTaskId
};
