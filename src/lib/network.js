export async function fetchWithTimeout(input, init = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal || controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function withFiniteLoading({ task, onSuccess, onFailure, timeoutMs = 9000 }) {
  try {
    const result = await Promise.race([
      task(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Loading timed out")), timeoutMs);
      })
    ]);

    onSuccess?.(result);
    return result;
  } catch (error) {
    onFailure?.(error);
    return null;
  }
}
