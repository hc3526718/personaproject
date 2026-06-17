export async function withTimeout<T>(
  promise: Promise<T>,
  opts: { ms: number; timeoutMessage?: string },
): Promise<T> {
  const ms = Math.max(1, opts.ms);
  const timeoutMessage = opts.timeoutMessage ?? 'Request timed out. Please try again.';
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

