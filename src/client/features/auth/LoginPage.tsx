import { useRef, useState, type CSSProperties } from 'react'
import { ArrowLeft, KeyRound, Loader2, TriangleAlert } from 'lucide-react'
import { LIMITS } from '@shared/constants'
import type { TotpLoginChallenge } from '@shared/types'
import { Logo } from '../../components/primitives'
import { Input } from '../../components/form'
import { cn } from '../../lib/cn'
import { ApiError } from '../../lib/api'
import { t } from '../../lib/i18n'
import { initialLoginCredentials } from '../../lib/runtime'
import { useSession } from '../../store/session'

const CHIP_THEME = {
  '--bg-base': '#eef3fb',
  '--bg-surface': 'rgba(255, 255, 255, 0.75)',
  '--bg-raised': '#ffffff',
  '--bg-inset': '#f4f7fc',
  '--bg-hover': 'rgba(37, 99, 235, 0.06)',
  '--bg-active': 'rgba(37, 99, 235, 0.10)',
  '--border-subtle': 'rgba(37, 99, 235, 0.10)',
  '--border-default': 'rgba(37, 99, 235, 0.16)',
  '--border-strong': 'rgba(37, 99, 235, 0.28)',
  '--text-primary': '#0f1d3a',
  '--text-secondary': '#3a4a68',
  '--text-tertiary': '#64748b',
  '--text-quaternary': '#94a3b8',
  '--accent': '#2563eb',
  '--accent-hover': '#1d4ed8',
  '--accent-contrast': '#ffffff',
  '--accent-ring': 'rgba(37, 99, 235, 0.16)',
  '--brand-accent': '#2563eb',
  '--danger': '#ef4444',
  '--success': '#16a34a',
  '--shadow-sm': '0 1px 2px rgba(15, 23, 42, 0.06)',
  '--shadow-pop': '0 0 0 1px rgba(37,99,235,0.10), 0 12px 32px -12px rgba(15,23,42,0.18)',
  '--shadow-modal': '0 0 0 1px rgba(37,99,235,0.10), 0 24px 60px -24px rgba(15,23,42,0.22)',
} as CSSProperties

export function LoginPage() {
  const initialCredentials = initialLoginCredentials()
  const site = useSession((state) => state.site)
  const authError = useSession((state) => state.authError)
  const passwordLogin = useSession((state) => state.passwordLogin)
  const totpLogin = useSession((state) => state.totpLogin)
  const passwordRegister = useSession((state) => state.passwordRegister)
  const firstRun = Boolean(site && !site.initialized)
  const [mode, setMode] = useState<'login' | 'register'>(firstRun ? 'register' : 'login')
  const [username, setUsername] = useState(initialCredentials.username)
  const [password, setPassword] = useState(initialCredentials.password)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<TotpLoginChallenge | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [recoveryMode, setRecoveryMode] = useState(false)
  const busyRef = useRef(false)
  const registerMode = mode === 'register' || firstRun
  const showModeSwitch = !firstRun && site?.registrationOpen

  const submit = async () => {
    if (busyRef.current) return
    setError(null)
    if (challenge) {
      if (!verificationCode.trim()) {
        setError(recoveryMode ? t('auth.enter_recovery_code') : t('auth.enter_authenticator_code'))
        return
      }
      busyRef.current = true
      setBusy(true)
      try {
        await totpLogin(challenge.challengeToken, verificationCode)
      } catch (caught) {
        busyRef.current = false
        setBusy(false)
        if (caught instanceof ApiError && caught.code === 'two_factor_challenge_expired') {
          setChallenge(null)
          setVerificationCode('')
          setRecoveryMode(false)
        }
        setError(caught instanceof ApiError ? caught.message : t('auth.network_error_try_again'))
      }
      return
    }
    if (!username.trim() || !password) {
      setError(t("auth.enter_a_username_and_password"))
      return
    }
    if (registerMode && password !== confirmation) {
      setError(t("common.the_passwords_do_not_match"))
      return
    }

    busyRef.current = true
    setBusy(true)
    try {
      if (registerMode) await passwordRegister(username.trim(), password)
      else {
        const nextChallenge = await passwordLogin(username.trim(), password)
        if (nextChallenge) {
          setChallenge(nextChallenge)
          setPassword('')
          setConfirmation('')
          setVerificationCode('')
          setRecoveryMode(false)
          busyRef.current = false
          setBusy(false)
        }
      }
    } catch (caught) {
      busyRef.current = false
      setBusy(false)
      setError(caught instanceof ApiError ? caught.message : t("auth.network_error_try_again"))
    }
  }

  return (
    <div
      className="relative flex min-h-full flex-col items-center justify-center overflow-y-auto bg-[var(--bg-base)] px-4 pt-[calc(24px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))] md:px-6"
      style={CHIP_THEME}
    >
      <CircuitBackdrop />

      <div className="anim-rise relative w-full max-w-[400px]">
        <a
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-[var(--text-quaternary)] transition-colors hover:text-[var(--accent)]"
        >
          <ArrowLeft size={13} />
          {t('public.back_home')}
        </a>

        <div className="relative overflow-hidden rounded-[20px] border border-white/80 bg-white/85 p-8 shadow-[0_32px_80px_-40px_rgba(15,23,42,0.4)] backdrop-blur-2xl md:p-10">
          <div className="mb-7 flex flex-col items-center text-center">
            <ChipBadge />
            <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
              {t("common.product_name")}
            </h1>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--text-tertiary)]">
              {challenge
                ? t('auth.two_step_verification_description')
                : firstRun
                ? t("auth.create_the_owner_account_this_step_appears_only_once")
                : t("auth.between_the_paper_and_ink_the_pen_comes_to_life_an_icsio_is_used_to_p")}
            </p>
          </div>

          <form
            className="space-y-2.5"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            {challenge ? (
              <>
                <div className="mb-3 flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-3 py-2.5 text-[12px] text-[var(--text-secondary)]">
                  <KeyRound size={14} className="shrink-0 text-[var(--accent)]" />
                  <span className="min-w-0 truncate">@{username.trim()}</span>
                </div>
                <Input
                  aria-label={recoveryMode ? t('auth.recovery_code') : t('auth.authenticator_code')}
                  value={verificationCode}
                  maxLength={recoveryMode ? 24 : 8}
                  onChange={(event) => setVerificationCode(
                    recoveryMode
                      ? event.target.value.toUpperCase()
                      : event.target.value.replace(/\D/g, '').slice(0, 6),
                  )}
                  disabled={busy}
                  placeholder={recoveryMode ? 'XXXX-XXXX-XXXX-XXXX' : '000000'}
                  autoComplete={recoveryMode ? 'off' : 'one-time-code'}
                  autoCapitalize={recoveryMode ? 'characters' : 'none'}
                  inputMode={recoveryMode ? 'text' : 'numeric'}
                  spellCheck={false}
                  autoFocus
                />
              </>
            ) : (
              <>
                <Input
                  aria-label={t("common.username")}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  disabled={busy}
                  placeholder={t("common.username")}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <Input
                  aria-label={t("common.password")}
                  type="password"
                  value={password}
                  maxLength={LIMITS.passwordMaxLength}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={busy}
                  placeholder={registerMode ? t("auth.password_minimum_8_characters") : t("common.password")}
                  autoComplete={registerMode ? 'new-password' : 'current-password'}
                />
              </>
            )}
            {!challenge && registerMode && (
              <Input
                aria-label={t("auth.confirm_password")}
                type="password"
                value={confirmation}
                maxLength={LIMITS.passwordMaxLength}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={busy}
                placeholder={t("auth.confirm_password")}
                autoComplete="new-password"
              />
            )}
            <button
              type="submit"
              disabled={busy}
              className={cn(
                'flex h-11 w-full items-center justify-center gap-2.5 rounded-[var(--r-lg)]',
                'bg-[#2563eb] text-[13.5px] font-medium text-white',
                'shadow-[0_1px_2px_rgba(15,23,42,0.16),0_4px_14px_-4px_rgba(37,99,235,0.4)]',
                'transition-[transform,opacity,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]',
                'hover:bg-[#1d4ed8] active:translate-y-px disabled:opacity-50',
              )}
            >
              {busy && <Loader2 size={16} className="animate-[ink-spin_.7s_linear_infinite]" />}
              {challenge
                ? t('auth.verify_and_sign_in')
                : registerMode
                  ? (firstRun ? t("auth.create_owner_account") : t("auth.sign_up"))
                  : t("auth.sign_in")}
            </button>
            {challenge && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setChallenge(null)
                    setVerificationCode('')
                    setRecoveryMode(false)
                    setError(null)
                  }}
                  className="inline-flex items-center gap-1 text-[12px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent)]"
                >
                  <ArrowLeft size={12} />
                  {t('auth.back_to_password')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setRecoveryMode((value) => !value)
                    setVerificationCode('')
                    setError(null)
                  }}
                  className="text-[12px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent)]"
                >
                  {recoveryMode ? t('auth.use_authenticator_code') : t('auth.use_recovery_code')}
                </button>
              </div>
            )}
            {!challenge && showModeSwitch && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setMode(registerMode ? 'login' : 'register')
                  setError(null)
                }}
                className="mx-auto block text-[12px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent)]"
              >
                {registerMode ? t("auth.already_have_an_account_sign_in") : t("auth.no_account_create_one")}
              </button>
            )}
          </form>

          {(error || authError) && (
            <div role="alert" className="anim-rise mt-4 flex items-start gap-2 rounded-[var(--r-md)] border border-[color-mix(in_oklab,var(--danger)_35%,transparent)] bg-[color-mix(in_oklab,var(--danger)_9%,transparent)] px-3 py-2.5">
              <TriangleAlert size={14} className="mt-[1px] shrink-0 text-[var(--danger)]" />
              <span className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                {error || authError}
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-2 text-center">
          {site?.initialized && !site.registrationOpen && (
            <p className="text-[11.5px] leading-relaxed text-[var(--text-quaternary)]">
              {t("auth.this_is_a_private_instance_registration_is_closed_so_only_existing_accou")}
            </p>
          )}
          <p className="text-[11px] tracking-[0.04em] text-[var(--text-quaternary)]">
            {t("auth.live_split_view_markdown_preview_realtime_multi_device_sync_multiple_web")}
          </p>
        </div>
      </div>

      <footer className="pointer-events-none mt-6 text-center text-[11px] tracking-[0.05em] text-[var(--text-quaternary)]">
        {t("auth.self_hosted_on_cloudflare_workers_your_data_is_yours")}
      </footer>
    </div>
  )
}

function ChipBadge() {
  return (
    <div className="relative mb-7">
      <div className="relative inline-block drop-shadow-[0_12px_28px_rgba(37,99,235,0.18)]">
        <Logo size={60} />
        <Pin className="left-[16%] top-[-7px] h-[6px] w-[1.5px]" />
        <Pin className="left-1/2 top-[-10px] h-[9px] w-[1.5px] -translate-x-1/2" />
        <Pin className="right-[16%] top-[-7px] h-[6px] w-[1.5px]" />
        <Pin className="left-[16%] bottom-[-7px] h-[6px] w-[1.5px]" />
        <Pin className="left-1/2 bottom-[-10px] h-[9px] w-[1.5px] -translate-x-1/2" />
        <Pin className="right-[16%] bottom-[-7px] h-[6px] w-[1.5px]" />
        <Pin className="left-[-9px] top-1/2 h-[1.5px] w-[9px] -translate-y-1/2" />
        <Pin className="right-[-9px] top-1/2 h-[1.5px] w-[9px] -translate-y-1/2" />
      </div>
    </div>
  )
}

function Pin({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('absolute rounded-full bg-[#2563eb]/40', className)} />
}

const CIRCUITS = [
  { d: 'M0 180 H320 L360 220 H520 L560 180 H1200', color: '#2563eb', dur: '3.2s' },
  { d: 'M0 640 H260 L300 600 H680 L720 640 H1200', color: '#2563eb', dur: '4s' },
  { d: 'M200 0 V220 L240 260 V800', color: '#2563eb', dur: '3.6s' },
  { d: 'M980 0 V300 L940 340 V800', color: '#2563eb', dur: '4.4s' },
  { d: 'M520 800 V620 L480 580 V0', color: '#22d3ee', dur: '3.4s' },
  { d: 'M0 440 H180 L220 400 H420 L460 440 H820', color: '#22d3ee', dur: '4.8s' },
]

const NODES = [
  { x: 320, y: 220, color: '#2563eb' },
  { x: 560, y: 180, color: '#2563eb' },
  { x: 260, y: 600, color: '#2563eb' },
  { x: 680, y: 640, color: '#2563eb' },
  { x: 240, y: 260, color: '#2563eb' },
  { x: 940, y: 340, color: '#2563eb' },
  { x: 480, y: 580, color: '#22d3ee' },
  { x: 220, y: 400, color: '#22d3ee' },
  { x: 460, y: 440, color: '#22d3ee' },
]

function CircuitBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute left-1/2 top-[-22%] size-[680px] -translate-x-1/2 rounded-full opacity-[0.14] blur-[140px]"
        style={{ background: '#3b82f6' }}
      />
      <div
        className="absolute bottom-[-28%] right-[-14%] size-[500px] rounded-full opacity-[0.10] blur-[140px]"
        style={{ background: '#22d3ee' }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {CIRCUITS.map((circuit, index) => (
          <g key={index}>
            <path d={circuit.d} stroke={circuit.color} strokeWidth="1" opacity="0.16" />
            <path
              d={circuit.d}
              stroke={circuit.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="4 96"
              opacity="0.7"
              style={{ animation: `ink-signal ${circuit.dur} linear infinite` }}
            />
          </g>
        ))}
        {NODES.map((node, index) => (
          <circle key={index} cx={node.x} cy={node.y} r="2.5" fill={node.color} opacity="0.5" />
        ))}
      </svg>
    </div>
  )
}
