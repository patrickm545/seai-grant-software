export type LeadFormErrorVisibilityState<FieldKey extends string, StepId extends string> = {
  touchedFields: FieldKey[];
  attemptedStepIds: StepId[];
  allFieldsValidationAttempted: boolean;
  serverErrorFields: FieldKey[];
};

export function createLeadFormErrorVisibilityState<FieldKey extends string, StepId extends string>(): LeadFormErrorVisibilityState<
  FieldKey,
  StepId
> {
  return {
    touchedFields: [],
    attemptedStepIds: [],
    allFieldsValidationAttempted: false,
    serverErrorFields: []
  };
}

export function addUniqueValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values : [...values, value];
}

export function removeValue<T extends string>(values: T[], value: T) {
  return values.filter((item) => item !== value);
}

export function removeValues<T extends string>(values: T[], valuesToRemove: readonly T[]) {
  return values.filter((item) => !valuesToRemove.includes(item));
}

export function shouldShowLeadFormFieldError<FieldKey extends string, StepId extends string>({
  field,
  fieldStepId,
  hasValidationError,
  visibility
}: {
  field: FieldKey;
  fieldStepId?: StepId;
  hasValidationError: boolean;
  visibility: LeadFormErrorVisibilityState<FieldKey, StepId>;
}) {
  if (!hasValidationError) return false;

  return (
    visibility.allFieldsValidationAttempted ||
    visibility.touchedFields.includes(field) ||
    visibility.serverErrorFields.includes(field) ||
    Boolean(fieldStepId && visibility.attemptedStepIds.includes(fieldStepId))
  );
}

export function shouldAcceptLeadFormSubmit({
  isFinalStep,
  finalStepSubmitReady,
  loading,
  submitLocked
}: {
  isFinalStep: boolean;
  finalStepSubmitReady: boolean;
  loading: boolean;
  submitLocked: boolean;
}) {
  return isFinalStep && finalStepSubmitReady && !loading && !submitLocked;
}
