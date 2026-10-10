'use client';

import type { Source } from '@casework/core';
import { createContext, useContext } from 'react';

interface SourcesCtx {
  sources: Source[];
  /** Opens the source viewer at this source (switches tab or opens a sheet). */
  open?: (sourceId: string) => void;
}

const Ctx = createContext<SourcesCtx>({ sources: [] });

/** Lets Citations anywhere in the workspace preview and open the case's sources. */
export function SourcesProvider({ sources, open, children }: SourcesCtx & { children: React.ReactNode }) {
  return <Ctx.Provider value={{ sources, open }}>{children}</Ctx.Provider>;
}

export const useSources = () => useContext(Ctx);
