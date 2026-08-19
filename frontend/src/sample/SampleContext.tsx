import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tokenStorage } from '../api/storage';
import { sampleRowsFor, sampleRowsForModule, SampleRow } from './sampleData';

const STORAGE_KEY = 'showSamples';

interface SampleContextValue {
  showSamples: boolean;
  setShowSamples: (v: boolean) => void;
  samplesFor: (key: string, limit?: number) => SampleRow[];
  withSamples: <T,>(rows: T[], key: string, limit?: number) => T[];
  moduleSamples: (code: string, fields: { key: string; type: string; enum: string[] | null }[]) => SampleRow[];
}

const SampleContext = createContext<SampleContextValue>({
  showSamples: true,
  setShowSamples: () => undefined,
  samplesFor: () => [],
  withSamples: (rows) => rows,
  moduleSamples: () => [],
});

export function SampleProvider({ children }: { children: React.ReactNode }) {
  const [showSamples, setShowSamplesState] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void tokenStorage.getItem(STORAGE_KEY).then((v) => {
      if (cancelled) return;
      if (v !== null) setShowSamplesState(v === '1');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setShowSamples = useCallback((v: boolean) => {
    setShowSamplesState(v);
    void tokenStorage.setItem(STORAGE_KEY, v ? '1' : '0');
  }, []);

  const samplesFor = useCallback((key: string, limit = 3) => {
    if (!showSamples) return [];
    return sampleRowsFor(key).slice(0, limit);
  }, [showSamples]);

  const withSamples = useCallback(<T,>(rows: T[], key: string, limit = 3): T[] => {
    if (rows.length > 0 || !showSamples) return rows;
    return samplesFor(key, limit) as unknown as T[];
  }, [samplesFor, showSamples]);

  const moduleSamples = useCallback((code: string, fields: { key: string; type: string; enum: string[] | null }[]) => {
    if (!showSamples) return [];
    return sampleRowsForModule(code, fields);
  }, [showSamples]);

  const value = useMemo<SampleContextValue>(() => ({ showSamples, setShowSamples, samplesFor, withSamples, moduleSamples }), [showSamples, setShowSamples, samplesFor, withSamples, moduleSamples]);

  return <SampleContext.Provider value={value}>{children}</SampleContext.Provider>;
}

export function useSamples(): SampleContextValue {
  return useContext(SampleContext);
}