export function privateViewShouldBeHidden({ contextActive, documentHidden, manuallyHidden, projectionCurrent = true }) {
  return contextActive && (documentHidden || manuallyHidden || !projectionCurrent);
}
