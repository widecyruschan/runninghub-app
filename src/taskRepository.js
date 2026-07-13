const crypto = require('crypto');

const RUNNING_STATUSES = new Set(['CREATED', 'QUEUED', 'RUNNING']);

function createTaskRepository(database) {
  const statements = {
    findById: database.prepare(`
      SELECT
        execution_tasks.*,
        app_users.email AS user_email,
        app_users.display_name AS user_display_name
      FROM execution_tasks
      LEFT JOIN app_users
        ON app_users.id = execution_tasks.user_id
      WHERE execution_tasks.id = ?
    `),
    list: database.prepare(`
      SELECT
        execution_tasks.*,
        app_users.email AS user_email,
        app_users.display_name AS user_display_name
      FROM execution_tasks
      LEFT JOIN app_users
        ON app_users.id = execution_tasks.user_id
      ORDER BY execution_tasks.created_at DESC
    `),
    listByUser: database.prepare(`
      SELECT
        execution_tasks.*,
        app_users.email AS user_email,
        app_users.display_name AS user_display_name
      FROM execution_tasks
      LEFT JOIN app_users
        ON app_users.id = execution_tasks.user_id
      WHERE execution_tasks.user_id = ?
      ORDER BY execution_tasks.created_at DESC
    `),
    insert: database.prepare(`
      INSERT INTO execution_tasks (
        id,
        user_id,
        tool_id,
        tool_key,
        tool_name,
        runninghub_task_id,
        status,
        input_values_json,
        node_info_list_json,
        output_values_json,
        output_urls_json,
        error_code,
        error_message,
        started_at,
        completed_at,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @userId,
        @toolId,
        @toolKey,
        @toolName,
        @runningHubTaskId,
        @status,
        @inputValuesJson,
        @nodeInfoListJson,
        @outputValuesJson,
        @outputUrlsJson,
        @errorCode,
        @errorMessage,
        @startedAt,
        @completedAt,
        @createdAt,
        @updatedAt
      )
    `),
    updateRunningHubTask: database.prepare(`
      UPDATE execution_tasks
      SET
        runninghub_task_id = @runningHubTaskId,
        status = @status,
        started_at = COALESCE(started_at, @startedAt),
        updated_at = @updatedAt
      WHERE id = @id
    `),
    updatePayload: database.prepare(`
      UPDATE execution_tasks
      SET
        input_values_json = @inputValuesJson,
        node_info_list_json = @nodeInfoListJson,
        updated_at = @updatedAt
      WHERE id = @id
    `),
    updateStatus: database.prepare(`
      UPDATE execution_tasks
      SET
        status = @status,
        error_code = @errorCode,
        error_message = @errorMessage,
        completed_at = @completedAt,
        updated_at = @updatedAt
      WHERE id = @id
    `),
    updateOutputs: database.prepare(`
      UPDATE execution_tasks
      SET
        status = @status,
        output_values_json = @outputValuesJson,
        output_urls_json = @outputUrlsJson,
        error_code = '',
        error_message = '',
        completed_at = @completedAt,
        updated_at = @updatedAt
      WHERE id = @id
    `)
  };

  function createTask(payload) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    statements.insert.run({
      id,
      userId: payload.userId || '',
      toolId: payload.tool.id,
      toolKey: payload.tool.toolKey,
      toolName: payload.tool.name,
      runningHubTaskId: '',
      status: 'CREATED',
      inputValuesJson: JSON.stringify(payload.inputValues || {}),
      nodeInfoListJson: JSON.stringify(payload.nodeInfoList || []),
      outputValuesJson: '[]',
      outputUrlsJson: '[]',
      errorCode: '',
      errorMessage: '',
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now
    });

    return getTaskById(id);
  }

  function getTaskById(id) {
    const record = statements.findById.get(id);
    return record ? mapTaskRecord(record) : null;
  }

  function listTasks() {
    return statements.list.all().map(mapTaskRecord);
  }

  function listTasksByUser(userId) {
    return statements.listByUser.all(userId).map(mapTaskRecord);
  }

  function attachRunningHubTask(id, runningHubTaskId, status = 'QUEUED') {
    const now = new Date().toISOString();

    statements.updateRunningHubTask.run({
      id,
      runningHubTaskId,
      status,
      startedAt: now,
      updatedAt: now
    });

    return getTaskById(id);
  }

  function updateTaskPayload(id, inputValues, nodeInfoList) {
    const now = new Date().toISOString();

    statements.updatePayload.run({
      id,
      inputValuesJson: JSON.stringify(inputValues || {}),
      nodeInfoListJson: JSON.stringify(nodeInfoList || []),
      updatedAt: now
    });

    return getTaskById(id);
  }

  function markTaskStatus(id, status, error) {
    const now = new Date().toISOString();
    const isFinished = !RUNNING_STATUSES.has(status);

    statements.updateStatus.run({
      id,
      status,
      errorCode: error?.code || '',
      errorMessage: error?.message || '',
      completedAt: isFinished ? now : null,
      updatedAt: now
    });

    return getTaskById(id);
  }

  function completeTask(id, outputs, outputUrls) {
    const now = new Date().toISOString();

    statements.updateOutputs.run({
      id,
      status: 'SUCCESS',
      outputValuesJson: JSON.stringify(outputs || []),
      outputUrlsJson: JSON.stringify(outputUrls || []),
      completedAt: now,
      updatedAt: now
    });

    return getTaskById(id);
  }

  return {
    attachRunningHubTask,
    completeTask,
    createTask,
    getTaskById,
    listTasksByUser,
    listTasks,
    markTaskStatus,
    updateTaskPayload
  };
}

function mapTaskRecord(record) {
  return {
    id: record.id,
    userId: record.user_id,
    userEmail: record.user_email || '',
    userDisplayName: record.user_display_name || '',
    toolId: record.tool_id,
    toolKey: record.tool_key,
    toolName: record.tool_name,
    runningHubTaskId: record.runninghub_task_id,
    status: record.status,
    inputValues: parseJson(record.input_values_json, {}),
    nodeInfoList: parseJson(record.node_info_list_json, []),
    outputValues: parseJson(record.output_values_json, []),
    outputUrls: parseJson(record.output_urls_json, []),
    errorCode: record.error_code,
    errorMessage: record.error_message,
    startedAt: record.started_at,
    completedAt: record.completed_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

module.exports = {
  createTaskRepository
};
