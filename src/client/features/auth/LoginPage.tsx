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
      className="relative flex min-h-full flex-col items-center justify-center overflow-y-auto px-4 pt-[calc(24px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))] md:px-6"
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

        <div className="relative rounded-[24px] bg-gradient-to-br from-[#5b9bff] via-[#9dc3ff]/45 to-white/80 p-px shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)]">
          <div className="relative overflow-hidden rounded-[23px] bg-white/80 p-7 backdrop-blur-xl md:p-9">
          <div className="mb-7 flex flex-col items-center text-center">
            <ChipBadge />
            <h1
              className="bg-gradient-to-br from-[#2563eb] to-[#4f8df7] bg-clip-text text-[30px] font-bold tracking-[-0.02em] text-transparent"
            >
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
                'bg-gradient-to-b from-[#4f8df7] to-[#2563eb] text-[13.5px] font-semibold text-white',
                'shadow-[0_10px_24px_-10px_rgba(37,99,235,0.75)]',
                'transition-[transform,opacity,filter] duration-[var(--dur-fast)] ease-[var(--ease-out)]',
                'hover:brightness-105 active:translate-y-px disabled:opacity-50',
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[136px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(91,155,255,0.5),rgba(91,155,255,0)_68%)]"
      />
      <div className="relative inline-block">
        <Logo size={84} />
        <Pin className="left-[16%] top-[-9px] h-[7px] w-[3px]" />
        <Pin className="left-1/2 top-[-12px] h-[10px] w-[3px] -translate-x-1/2" />
        <Pin className="right-[16%] top-[-9px] h-[7px] w-[3px]" />
        <Pin className="left-[16%] bottom-[-9px] h-[7px] w-[3px]" />
        <Pin className="left-1/2 bottom-[-12px] h-[10px] w-[3px] -translate-x-1/2" />
        <Pin className="right-[16%] bottom-[-9px] h-[7px] w-[3px]" />
        <Pin className="left-[-11px] top-1/2 h-[3px] w-[11px] -translate-y-1/2" />
        <Pin className="right-[-11px] top-1/2 h-[3px] w-[11px] -translate-y-1/2" />
      </div>
    </div>
  )
}

function Pin({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute rounded-full bg-gradient-to-b from-[#a9c8ff] to-[#3b82f6] shadow-[0_0_6px_rgba(59,130,246,0.6)]',
        className,
      )}
    />
  )
}

function CircuitBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.55] [background-image:linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div
        className="absolute left-1/2 top-[-18%] size-[760px] -translate-x-1/2 rounded-full opacity-[0.24] blur-[130px]"
        style={{ background: '#3b82f6' }}
      />
      <div
        className="absolute bottom-[-24%] right-[-12%] size-[560px] rounded-full opacity-[0.16] blur-[120px]"
        style={{ background: '#22d3ee' }}
      />
      <div
        className="absolute bottom-[-8%] left-[-14%] size-[420px] rounded-full opacity-[0.14] blur-[110px]"
        style={{ background: '#6366f1' }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.12]"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <path d="M0 180 H320 L360 220 H520 L560 180 H1200" stroke="#2563eb" strokeWidth="1" />
        <path d="M0 640 H260 L300 600 H680 L720 640 H1200" stroke="#2563eb" strokeWidth="1" />
        <path d="M200 0 V220 L240 260 V800" stroke="#2563eb" strokeWidth="1" />
        <path d="M980 0 V300 L940 340 V800" stroke="#2563eb" strokeWidth="1" />
        <path d="M520 800 V620 L480 580 V0" stroke="#22d3ee" strokeWidth="1" />
        <path d="M1200 340 H900 L860 380 H640" stroke="#22d3ee" strokeWidth="1" />
        <path d="M0 500 H140 L180 460 H380" stroke="#6366f1" strokeWidth="1" />
        <circle cx="320" cy="220" r="3" fill="#2563eb" className="animate-pulse" />
        <circle cx="560" cy="180" r="3" fill="#2563eb" className="animate-pulse" />
        <circle cx="260" cy="600" r="3" fill="#2563eb" />
        <circle cx="680" cy="640" r="3" fill="#2563eb" className="animate-pulse" />
        <circle cx="240" cy="260" r="3" fill="#2563eb" />
        <circle cx="940" cy="340" r="3" fill="#2563eb" className="animate-pulse" />
        <circle cx="480" cy="580" r="3" fill="#22d3ee" />
        <circle cx="860" cy="380" r="3" fill="#22d3ee" className="animate-pulse" />
        <circle cx="140" cy="460" r="3" fill="#6366f1" />
      </svg>
    </div>
  )
}
