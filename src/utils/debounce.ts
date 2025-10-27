export type DebouncedFunction<T extends (...args: any[]) => unknown> = ((
  ...args: Parameters<T>
) => void) & {
  cancel: () => void;
};

/**
 * Small debounce helper to avoid pulling in lodash just for this behavior.
 * Returns a debounced function along with a `cancel` method.
 */
export function debounce<T extends (...args: any[]) => unknown>(
  fn: T,
  wait = 0
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      fn(...args);
    }, wait);
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return debounced;
}
