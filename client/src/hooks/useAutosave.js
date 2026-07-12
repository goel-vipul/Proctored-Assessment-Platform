import { useEffect, useRef } from 'react';

export const useAutosave = (callback, delay = 1500) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const debouncedSave = useRef((...args) => {
    if (debouncedSave.current.timeoutId) {
      clearTimeout(debouncedSave.current.timeoutId);
    }
    debouncedSave.current.timeoutId = setTimeout(() => {
      savedCallback.current(...args);
    }, delay);
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    const currentDebounce = debouncedSave.current;
    return () => {
      if (currentDebounce.timeoutId) {
        clearTimeout(currentDebounce.timeoutId);
      }
    };
  }, []);

  return debouncedSave.current;
};
