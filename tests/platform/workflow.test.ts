import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateWorkflowDefinitionSpec,
  WorkflowDefinitionValidationError
} from '../../lib/workflow';

const validWorkflow = {
  key: 'test.workflow',
  stages: [
    { key: 'NEW', isInitial: true },
    { key: 'DONE' }
  ],
  transitions: [
    {
      fromStageKey: 'NEW',
      toStageKey: 'DONE',
      requiredPermission: 'lead.change_status'
    }
  ]
};

test('workflow definition integrity accepts a valid definition', () => {
  assert.doesNotThrow(() => validateWorkflowDefinitionSpec(validWorkflow));
});

test('workflow definition integrity rejects duplicate stages', () => {
  assert.throws(
    () =>
      validateWorkflowDefinitionSpec({
        ...validWorkflow,
        stages: [
          { key: 'NEW', isInitial: true },
          { key: 'NEW' }
        ]
      }),
    (error) => error instanceof WorkflowDefinitionValidationError && error.code === 'DUPLICATE_STAGE'
  );
});

test('workflow definition integrity requires exactly one initial stage', () => {
  assert.throws(
    () =>
      validateWorkflowDefinitionSpec({
        ...validWorkflow,
        stages: [
          { key: 'NEW' },
          { key: 'DONE' }
        ]
      }),
    (error) => error instanceof WorkflowDefinitionValidationError && error.code === 'INVALID_INITIAL_STAGE_COUNT'
  );
});

test('workflow definition integrity rejects missing transition endpoints', () => {
  assert.throws(
    () =>
      validateWorkflowDefinitionSpec({
        ...validWorkflow,
        transitions: [
          {
            fromStageKey: 'NEW',
            toStageKey: 'ARCHIVED',
            requiredPermission: 'lead.change_status'
          }
        ]
      }),
    (error) => error instanceof WorkflowDefinitionValidationError && error.code === 'TRANSITION_STAGE_NOT_FOUND'
  );
});

test('workflow definition integrity rejects self transitions', () => {
  assert.throws(
    () =>
      validateWorkflowDefinitionSpec({
        ...validWorkflow,
        transitions: [
          {
            fromStageKey: 'NEW',
            toStageKey: 'NEW',
            requiredPermission: 'lead.change_status'
          }
        ]
      }),
    (error) => error instanceof WorkflowDefinitionValidationError && error.code === 'SELF_TRANSITION'
  );
});

test('workflow definition integrity rejects unknown permissions', () => {
  assert.throws(
    () =>
      validateWorkflowDefinitionSpec({
        ...validWorkflow,
        transitions: [
          {
            fromStageKey: 'NEW',
            toStageKey: 'DONE',
            requiredPermission: 'workflow.superpower'
          }
        ]
      }),
    (error) => error instanceof WorkflowDefinitionValidationError && error.code === 'UNKNOWN_PERMISSION'
  );
});
