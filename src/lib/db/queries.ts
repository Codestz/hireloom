import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Resume } from '#/lib/resume'
import type { ThemeTokens } from '#/lib/templates/tokens'
import type { ResumeRecord } from './db'
import * as repo from './resumes'

/** Query keys for the resume store. */
export const resumeKeys = {
  all: ['resumes'] as const,
  list: () => [...resumeKeys.all, 'list'] as const,
  detail: (id: string) => [...resumeKeys.all, 'detail', id] as const,
  latest: () => [...resumeKeys.all, 'latest'] as const,
}

export function useResumes() {
  return useQuery({ queryKey: resumeKeys.list(), queryFn: repo.listResumes })
}

export function useResume(id: string | undefined) {
  return useQuery({
    queryKey: resumeKeys.detail(id ?? ''),
    queryFn: () => repo.getResume(id as string),
    enabled: Boolean(id),
  })
}

/** Loads the latest resume, creating an empty one if the store is empty. */
export function useLatestResume() {
  return useQuery({
    queryKey: resumeKeys.latest(),
    queryFn: repo.getOrCreateLatestResume,
  })
}

export function useCreateResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (opts?: { title?: string; data?: Resume }) =>
      repo.createResume(opts),
    // invalidate all (incl. `latest`) so the editor switches to the new resume
    onSuccess: () => qc.invalidateQueries({ queryKey: resumeKeys.all }),
  })
}

/**
 * Autosave target. Writes content and keeps the detail cache in sync WITHOUT
 * refetching (the editor is the source of truth while editing). Only the list is
 * invalidated, so the resume switcher reflects new recency order.
 */
export function useUpdateResumeData(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Resume) => repo.updateResumeData(id, data),
    onSuccess: (_res, data) => {
      qc.setQueryData<ResumeRecord | undefined>(
        resumeKeys.detail(id),
        (prev) => (prev ? { ...prev, data, updatedAt: Date.now() } : prev),
      )
      void qc.invalidateQueries({ queryKey: resumeKeys.list() })
    },
  })
}

/** Persist a theme-token change (design panel). Keeps the detail cache in sync. */
export function useUpdateResumeTokens(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tokens: ThemeTokens) => repo.updateResumeTokens(id, tokens),
    onSuccess: (_res, tokens) => {
      qc.setQueryData<ResumeRecord | undefined>(
        resumeKeys.detail(id),
        (prev) => (prev ? { ...prev, tokens, updatedAt: Date.now() } : prev),
      )
    },
  })
}

/** Persist a template change. */
export function useUpdateResumeTemplate(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) =>
      repo.updateResumeTemplate(id, templateId),
    onSuccess: (_res, templateId) => {
      qc.setQueryData<ResumeRecord | undefined>(
        resumeKeys.detail(id),
        (prev) =>
          prev ? { ...prev, templateId, updatedAt: Date.now() } : prev,
      )
    },
  })
}

export function useRenameResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      repo.renameResume(id, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: resumeKeys.all }),
  })
}

export function useDeleteResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo.deleteResume(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: resumeKeys.all }),
  })
}

export function useDuplicateResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo.duplicateResume(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: resumeKeys.list() }),
  })
}
