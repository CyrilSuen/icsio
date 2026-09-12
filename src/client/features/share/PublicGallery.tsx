import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, LogIn, Search } from 'lucide-react'
import type { PublicNoteListItem } from '@shared/types'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { shortTime } from '../../lib/time'
import { Avatar, Logo, Spinner } from '../../components/primitives'
import { Empty } from '../../components/feedback'
import { t } from '../../lib/i18n'

export function PublicGallery() {
  const [notes, setNotes] = useState<PublicNoteListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api.share
      .list(controller.signal)
      .then(setNotes)
      .catch((err) => {
        if ((err as Error)?.name !== 'AbortError') {
          setError(err instanceof Error ? err.message : String(err))
        }
      })
    return () => controller.abort()
  }, [])

  const folders = useMemo(() => {
    const set = new Set<string>()
    for (const note of notes ?? []) {
      if (note.folder) set.add(note.folder)
    }
    return [...set]
  }, [notes])

  const filtered = useMemo(() => {
    if (!notes) return null
    const q = query.trim().toLowerCase()
    return notes.filter((note) => {
      if (activeFolder && note.folder !== activeFolder) return false
      if (!q) return true
      return (
        note.title.toLowerCase().includes(q) ||
        note.excerpt.toLowerCase().includes(q) ||
        note.author.name.toLowerCase().includes(q) ||
        note.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    })
  }, [notes, activeFolder, query])

  return (
    <div className="min-h-full overflow-y-auto bg-[var(--bg-base)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-3 px-4 md:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-[16px] font-bold tracking-[-0.01em] text-[var(--text-primary)]">
              {t('common.product_name')}
            </span>
          </a>
          <span className="flex-1" />
          <a
            href="/login"
            className="inline-flex h-9 items-center gap-2 rounded-full bg-gradient-to-b from-[#4f8df7] to-[#2563eb] pl-3.5 pr-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.7)] transition-[transform,filter] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:brightness-105 active:translate-y-px"
          >
            <LogIn size={15} />
            {t('public.sign_in')}
          </a>
        </div>

        <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-4 pb-3 md:px-6">
          <nav className="flex items-center gap-1 overflow-x-auto">
            <NavItem active={activeFolder === null} onClick={() => setActiveFolder(null)}>
              {t('public.home')}
            </NavItem>
            {folders.map((folder) => (
              <NavItem key={folder} active={activeFolder === folder} onClick={() => setActiveFolder(folder)}>
                {folder}
              </NavItem>
            ))}
          </nav>
          <span className="flex-1" />
          <SearchBox value={query} onChange={setQuery} className="hidden md:block" />
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-4 py-8 md:px-6 md:py-12">
        <Hero />

        <div className="mb-6 md:hidden">
          <SearchBox value={query} onChange={setQuery} className="w-full" />
        </div>

        {notes === null && !error ? (
          <div className="flex justify-center py-24">
            <Spinner size={20} />
          </div>
        ) : error ? (
          <Empty art="notes" compact title={t('public.empty_title')} description={error} />
        ) : !filtered || filtered.length === 0 ? (
          <Empty
            art="notes"
            compact
            title={t('public.empty_title')}
            description={activeFolder || query ? t('public.empty_filter') : t('public.empty_desc')}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            {filtered.map((note) => (
              <NoteCard key={note.slug} note={note} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border-subtle)] py-8 text-center text-[12px] text-[var(--text-quaternary)]">
        © {new Date().getFullYear()} {t('common.product_name')}
      </footer>
    </div>
  )
}

function Hero() {
  return (
    <div className="relative mb-8 overflow-hidden rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)] md:mb-12 md:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[radial-gradient(circle,rgba(79,141,247,0.20),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-12 size-72 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.14),transparent_70%)]"
      />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3b82f6]/25 bg-[#3b82f6]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#3b82f6]">
          <span className="size-1.5 rounded-full bg-[#3b82f6]" />
          {t('public.hero_kicker')}
        </span>
        <h1 className="mt-4 text-[28px] font-bold tracking-[-0.02em] text-[var(--text-primary)] md:text-[40px]">
          {t('common.product_name')}
        </h1>
        <p className="mt-2 max-w-[560px] text-[14px] leading-relaxed text-[var(--text-tertiary)] md:text-[15px]">
          {t('public.hero_subtitle')}
        </p>
      </div>
    </div>
  )
}

function SearchBox({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <label className={cn('relative block', className)}>
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-quaternary)]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('public.search_placeholder')}
        className="h-9 w-full rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] pl-9 pr-3 text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] transition-colors focus:border-[#3b82f6] focus:outline-none md:w-56"
      />
    </label>
  )
}

function NavItem({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
        active
          ? 'bg-gradient-to-b from-[#4f8df7] to-[#2563eb] text-white shadow-[0_6px_16px_-8px_rgba(37,99,235,0.7)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
      )}
    >
      {children}
    </button>
  )
}

function NoteCard({ note }: { note: PublicNoteListItem }) {
  return (
    <a
      href={`/s/${note.slug}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 transition-[transform,border-color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-[#3b82f6]/40 hover:shadow-[0_16px_40px_-20px_rgba(37,99,235,0.35)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[16px] font-semibold leading-snug tracking-[-0.01em] text-[var(--text-primary)] transition-colors group-hover:text-[#3b82f6]">
          {note.title || t('common.untitled_note')}
        </h2>
        <time className="shrink-0 pt-0.5 text-[12px] tabular text-[var(--text-quaternary)]">
          {shortTime(note.updatedAt)}
        </time>
      </div>
      {note.excerpt && (
        <p className="line-clamp-2 text-[13px] leading-relaxed text-[var(--text-tertiary)]">
          {note.excerpt}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px]">
        <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Avatar src={note.author.avatarUrl} name={note.author.name} size={18} />
          {note.author.name}
        </span>
        {note.folder && (
          <span className="rounded-full bg-[#3b82f6]/12 px-2 py-0.5 font-medium text-[#3b82f6]">
            {note.folder}
          </span>
        )}
        {note.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full bg-[var(--bg-inset)] px-2 py-0.5 text-[var(--text-quaternary)]">
            #{tag}
          </span>
        ))}
        <ArrowUpRight
          size={15}
          className="ml-auto text-[var(--text-quaternary)] opacity-0 transition-opacity duration-[var(--dur-base)] group-hover:opacity-100"
        />
      </div>
    </a>
  )
}
