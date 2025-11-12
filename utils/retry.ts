type RetryOptions = {
  maxRetries?: number;
  delay?: number;
};

const sleep = (duration: number) => new Promise((resolve) => {
  setTimeout(resolve, duration);
});

export const retryOperation = async <T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.delay ?? 1000;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;
      console.log(`🔄 Deneme ${attempt + 1}/${maxRetries} başarısız:`, error);

      if (attempt === maxRetries - 1) {
        break;
      }

      const backoffDelay = baseDelay * (attempt + 1);
      await sleep(backoffDelay);
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  
  throw new Error(
    typeof lastError === 'string' 
      ? lastError 
      : 'İşlem tekrarlarda başarısız oldu'
  );
};
