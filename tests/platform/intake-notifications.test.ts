import assert from 'node:assert/strict';
import test from 'node:test';
import { runLeadNotificationTasks } from '../../lib/intake-notifications';

test('intake notifications settle failures without throwing or logging customer contact details', async () => {
  const originalError = console.error;
  const errorCalls: unknown[][] = [];
  let emailStarted = false;
  let emailResolved = false;
  let smsStartedBeforeEmailResolved = false;

  console.error = (...args: unknown[]) => {
    errorCalls.push(args);
  };

  try {
    const results = await runLeadNotificationTasks({
      requestId: 'request-notification-test',
      leadId: 'lead-notification-test',
      tasks: [
        {
          channel: 'email',
          run: () => {
            emailStarted = true;
            return new Promise((resolve) => {
              setTimeout(() => {
                emailResolved = true;
                resolve(undefined);
              }, 20);
            });
          }
        },
        {
          channel: 'sms',
          run: async () => {
            smsStartedBeforeEmailResolved = emailStarted && !emailResolved;
            throw new Error('provider timeout for codex@example.test');
          }
        }
      ]
    });

    assert.equal(results[0].status, 'fulfilled');
    assert.equal(results[1].status, 'rejected');
    assert.equal(emailResolved, true);
    assert.equal(smsStartedBeforeEmailResolved, true);
    assert.equal(errorCalls.length, 1);
    assert.equal(errorCalls[0][0], '[intake] Notification failed');

    const context = errorCalls[0][1] as {
      requestId?: string;
      stage?: string;
      channel?: string;
      leadId?: string;
      email?: string;
      phone?: string;
      error?: { message?: string; name?: string };
    };

    assert.equal(context.requestId, 'request-notification-test');
    assert.equal(context.stage, 'notifications');
    assert.equal(context.channel, 'sms');
    assert.equal(context.leadId, 'lead-notification-test');
    assert.equal(context.email, undefined);
    assert.equal(context.phone, undefined);
    assert.equal(context.error?.name, 'Error');
    assert.equal(context.error?.message, undefined);
    assert.equal(JSON.stringify(context).includes('codex@example.test'), false);
  } finally {
    console.error = originalError;
  }
});
