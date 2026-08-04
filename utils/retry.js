const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 10000,
  backoff: 'exponential',
  onRetry: null,
  retryIf: null,
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function computeDelay(attempt, baseDelayMs, maxDelayMs, backoff) {
  let delay;
  if (backoff === 'exponential') {
    delay = baseDelayMs * Math.pow(2, attempt - 1);
  } else if (backoff === 'linear') {
    delay = baseDelayMs * attempt;
  } else {
    delay = baseDelayMs;
  }
  return Math.min(delay, maxDelayMs);
}

export async function withRetry(fn, options = {}) {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const { maxRetries, baseDelayMs, maxDelayMs, backoff, onRetry, retryIf } = opts;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt >= maxRetries) break;
      if (retryIf && !retryIf(err)) break;

      const nextAttempt = attempt + 1;
      const delay = computeDelay(nextAttempt, baseDelayMs, maxDelayMs, backoff);

      if (typeof onRetry === 'function') {
        try { onRetry(err, nextAttempt, maxRetries, delay); } catch (_) {}
      }

      await sleep(delay);
    }
  }
  throw lastError;
}

export function isNetworkError(err) {
  if (!err) return false;
  const code = err.code || '';
  const msg = (err.message || '').toLowerCase();
  return (
    ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNABORTED'].includes(code) ||
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('socket hang up') ||
    msg.includes('getaddrinfo') ||
    (err.response && err.response.status >= 500)
  );
}
