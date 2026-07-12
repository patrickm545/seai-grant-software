export type LeadNotificationTask = {
  channel: 'email' | 'sms';
  run: () => Promise<unknown>;
};

function getNotificationErrorLogDetails(error: unknown) {
  if (error && typeof error === 'object') {
    const maybeCode = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
    return {
      name: error instanceof Error ? error.name : 'UnknownError',
      code: maybeCode
    };
  }

  return {
    name: 'UnknownError'
  };
}

export async function runLeadNotificationTasks({
  requestId,
  leadId,
  tasks
}: {
  requestId: string;
  leadId: string;
  tasks: LeadNotificationTask[];
}) {
  const notificationResults = await Promise.allSettled(tasks.map((task) => task.run()));

  for (const [index, result] of notificationResults.entries()) {
    if (result.status === 'rejected') {
      console.error('[intake] Notification failed', {
        requestId,
        stage: 'notifications',
        channel: tasks[index]?.channel ?? 'unknown',
        leadId,
        error: getNotificationErrorLogDetails(result.reason)
      });
    }
  }

  return notificationResults;
}
