import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addUniqueValue,
  createLeadFormErrorVisibilityState,
  removeValue,
  shouldAcceptLeadFormSubmit,
  shouldShowLeadFormFieldError,
  type LeadFormErrorVisibilityState
} from '../../lib/lead-form-error-visibility';

type TestField =
  | 'yearBuilt'
  | 'yearOccupied'
  | 'dwellingType'
  | 'roofType'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'preferredCallbackWindow'
  | 'addressLine1'
  | 'consentToProcess'
  | 'consentToGrantAssist'
  | 'consentToContact';
type TestStep = 'grant' | 'property' | 'roof' | 'contact';

function canShowError(
  visibility: LeadFormErrorVisibilityState<TestField, TestStep>,
  field: TestField,
  step: TestStep,
  hasValidationError: boolean
) {
  return shouldShowLeadFormFieldError({
    field,
    fieldStepId: step,
    hasValidationError,
    visibility
  });
}

test('lead form error visibility hides untouched invalid fields on initial arrival', () => {
  const visibility = createLeadFormErrorVisibilityState<TestField, TestStep>();

  assert.equal(canShowError(visibility, 'yearBuilt', 'grant', true), false);
});

test('lead form error visibility shows invalid fields after a Continue attempt on the step', () => {
  const visibility = {
    ...createLeadFormErrorVisibilityState<TestField, TestStep>(),
    attemptedStepIds: ['grant' as const]
  };

  assert.equal(canShowError(visibility, 'yearBuilt', 'grant', true), true);
  assert.equal(canShowError(visibility, 'roofType', 'roof', true), false);
});

test('lead form error visibility clears a completed field while keeping remaining invalid fields visible', () => {
  const visibility = {
    ...createLeadFormErrorVisibilityState<TestField, TestStep>(),
    attemptedStepIds: ['grant' as const]
  };

  assert.equal(canShowError(visibility, 'yearBuilt', 'grant', false), false);
  assert.equal(canShowError(visibility, 'yearOccupied', 'grant', true), true);
});

test('lead form error visibility keeps an invalid edited field visible after validation was triggered', () => {
  const visibility = {
    ...createLeadFormErrorVisibilityState<TestField, TestStep>(),
    attemptedStepIds: ['grant' as const]
  };

  assert.equal(canShowError(visibility, 'yearBuilt', 'grant', true), true);
});

test('lead form error visibility shows touched invalid fields after blur', () => {
  const visibility = {
    ...createLeadFormErrorVisibilityState<TestField, TestStep>(),
    touchedFields: addUniqueValue<TestField>([], 'yearBuilt')
  };

  assert.equal(canShowError(visibility, 'yearBuilt', 'grant', true), true);
});

test('lead form error visibility treats restored values as untouched until another interaction or Continue attempt', () => {
  const visibility = createLeadFormErrorVisibilityState<TestField, TestStep>();

  assert.equal(canShowError(visibility, 'dwellingType', 'property', true), false);
  assert.equal(canShowError(visibility, 'dwellingType', 'property', false), false);
});

test('lead form error visibility exposes server-returned field errors and clears them on edit', () => {
  const withServerError = {
    ...createLeadFormErrorVisibilityState<TestField, TestStep>(),
    serverErrorFields: ['yearBuilt' as const]
  };
  const afterEdit = {
    ...withServerError,
    serverErrorFields: removeValue(withServerError.serverErrorFields, 'yearBuilt')
  };

  assert.equal(canShowError(withServerError, 'yearBuilt', 'grant', true), true);
  assert.equal(canShowError(afterEdit, 'yearBuilt', 'grant', true), false);
});

test('lead form error visibility keeps Step 6 neutral after a valid Step 5 transition', () => {
  const visibility = {
    ...createLeadFormErrorVisibilityState<TestField, TestStep>(),
    attemptedStepIds: ['grant' as const]
  };

  for (const field of [
    'fullName',
    'email',
    'phone',
    'preferredCallbackWindow',
    'addressLine1',
    'consentToProcess',
    'consentToGrantAssist',
    'consentToContact'
  ] as const) {
    assert.equal(canShowError(visibility, field, 'contact', true), false);
  }
});

test('lead form submit is ignored during the Step 5 to Step 6 button swap frame', () => {
  assert.equal(
    shouldAcceptLeadFormSubmit({
      isFinalStep: true,
      finalStepSubmitReady: false,
      loading: false,
      submitLocked: false
    }),
    false
  );

  assert.equal(
    shouldAcceptLeadFormSubmit({
      isFinalStep: true,
      finalStepSubmitReady: true,
      loading: false,
      submitLocked: false
    }),
    true
  );
});

test('lead form final submit reveals Step 6 errors and clearing one field preserves the rest', () => {
  const afterFinalSubmit = {
    ...createLeadFormErrorVisibilityState<TestField, TestStep>(),
    attemptedStepIds: ['grant' as const],
    allFieldsValidationAttempted: true
  };

  assert.equal(canShowError(afterFinalSubmit, 'fullName', 'contact', true), true);
  assert.equal(canShowError(afterFinalSubmit, 'email', 'contact', true), true);
  assert.equal(canShowError(afterFinalSubmit, 'phone', 'contact', true), true);
  assert.equal(canShowError(afterFinalSubmit, 'fullName', 'contact', false), false);
  assert.equal(canShowError(afterFinalSubmit, 'email', 'contact', true), true);
});

test('lead form back and forward after a final submit does not resurrect stale Step 6 errors', () => {
  const afterBackResetAndGrantForward = {
    ...createLeadFormErrorVisibilityState<TestField, TestStep>(),
    attemptedStepIds: ['grant' as const]
  };

  assert.equal(canShowError(afterBackResetAndGrantForward, 'fullName', 'contact', true), false);
  assert.equal(canShowError(afterBackResetAndGrantForward, 'email', 'contact', true), false);
});
