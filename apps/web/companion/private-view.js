export function privateViewShouldBeHidden({ contextActive, documentHidden, manuallyHidden }) {
  return contextActive && (documentHidden || manuallyHidden);
}
