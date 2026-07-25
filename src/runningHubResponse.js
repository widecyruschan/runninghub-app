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
    ?? value.id
  );
}

function normalizeTaskId(value) {
  const taskId = String(value ?? '').trim();
  if (!taskId || taskId === '[object Object]') return '';
  return taskId;
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
  getRunningHubResponseError
};
