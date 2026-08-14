import { useState, useEffect, useCallback, useMemo, useReducer, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Mail, ExternalLink, Briefcase, GraduationCap, Award, Code, Users, Bot, Zap, Database, Layout, BadgeCheck, FolderGit2, Sparkles, Github, Package, MessageSquare, CalendarCheck, FileText, GitBranch, Star, Calendar, Percent, UserCheck, Image, TrendingUp, SkipForward, List, Brain, Target, Inbox, Compass, GitMerge, Network } from 'lucide-react'
import { translations, seo } from './i18n'
import { useHomeSeo } from './articles/use-article-seo'


function LinkedInLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/>
    </svg>
  )
}

function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}

function useInView(threshold = 0.1) {
  const [ref, setRef] = useState<HTMLElement | null>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    if (!ref) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(ref)
    return () => observer.disconnect()
  }, [ref, threshold])

  return { ref: setRef, isInView }
}

const HEAL_PARTICLES = [
  { char: '+', left: '10%', delay: '0s', dur: '2.8s', size: '24px' },
  { char: '·', left: '30%', delay: '0.6s', dur: '2.2s', size: '20px' },
  { char: '✦', left: '55%', delay: '1.2s', dur: '3s', size: '18px' },
  { char: '0', left: '75%', delay: '0.3s', dur: '2.5s', size: '22px' },
  { char: '+', left: '90%', delay: '1.8s', dur: '2.6s', size: '20px' },
  { char: '1', left: '20%', delay: '2.1s', dur: '2.4s', size: '22px' },
  { char: '·', left: '65%', delay: '0.9s', dur: '3.2s', size: '18px' },
  { char: '✦', left: '45%', delay: '1.5s', dur: '2.7s', size: '20px' },
]

function BeamPill({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated()
  return (
    <span className={`relative inline-block pl-0 pr-0 ${hydrated ? 'beam-pill' : ''}`}>
      <span className="relative z-10">{children}</span>
      {hydrated && HEAL_PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute pointer-events-none select-none"
          style={{
            left: p.left,
            bottom: '50%',
            fontSize: p.size,
            color: '#4ade80',
            opacity: 0,
            animation: `heal-float ${p.dur} ease-out ${p.delay} infinite`,
          }}
          aria-hidden="true"
        >
          {p.char}
        </span>
      ))}
    </span>
  )
}

const HERO_STYLES_ID = 'hero-beam-styles'
function useHeroStyles() {
  useEffect(() => {
    if (document.getElementById(HERO_STYLES_ID)) return
    const style = document.createElement('style')
    style.id = HERO_STYLES_ID
    style.textContent = `
      @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
      @keyframes heal-float {
        0% { opacity: 0; transform: translateY(0) scale(0.6); }
        12% { opacity: 0.25; }
        40% { opacity: 0.15; }
        100% { opacity: 0; transform: translateY(-65px) scale(0.2); }
      }
      @property --beam-angle {
        syntax: '<angle>';
        inherits: false;
        initial-value: 0deg;
      }
      @keyframes beam-spin {
        0% { --beam-angle: 0deg; }
        100% { --beam-angle: 360deg; }
      }
      .beam-pill::before {
        content: '';
        position: absolute;
        inset: -1px -10px -1px -10px;
        border-radius: 9999px;
        padding: 2px;
        background: conic-gradient(
          from var(--beam-angle),
          transparent 0%,
          transparent 82%,
          rgba(74, 222, 128, 0.05) 86%,
          rgba(74, 222, 128, 0.15) 89%,
          rgba(74, 222, 128, 0.35) 92%,
          rgba(74, 222, 128, 0.6) 95%,
          rgba(74, 222, 128, 0.9) 98%,
          #4ade80 100%,
          transparent 100%
        );
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        animation: beam-spin 2s linear infinite;
      }
    `
    document.head.appendChild(style)
  }, [])
}

const GRID = 24
const SNAKE_COUNT = 3
const SNAKE_LENGTH = 8
const TICK_MS = 180
const DIRS: [number, number][] = [[1,0],[-1,0],[0,1],[0,-1]]

function GridSnakes() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const resize = () => {
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const cols = () => Math.floor(canvas.width / GRID)
    const rows = () => Math.floor(canvas.height / GRID)

    type Snake = { trail: [number, number][]; dir: [number, number] }
    const snakes: Snake[] = Array.from({ length: SNAKE_COUNT }, () => {
      const x = Math.floor(Math.random() * cols())
      const y = Math.floor(Math.random() * rows())
      return { trail: [[x, y]], dir: DIRS[Math.floor(Math.random() * 4)] }
    })

    const tick = () => {
      const c = cols()
      const r = rows()

      for (const snake of snakes) {
        if (Math.random() < 0.3) {
          snake.dir = DIRS[Math.floor(Math.random() * 4)]
        }
        const [hx, hy] = snake.trail[snake.trail.length - 1]
        let nx = hx + snake.dir[0]
        let ny = hy + snake.dir[1]

        if (nx < 0) nx = c - 1
        if (nx >= c) nx = 0
        if (ny < 0) ny = r - 1
        if (ny >= r) ny = 0

        snake.trail.push([nx, ny])
        if (snake.trail.length > SNAKE_LENGTH) snake.trail.shift()
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const snake of snakes) {
        for (let i = 0; i < snake.trail.length; i++) {
          const [gx, gy] = snake.trail[i]
          const alpha = ((i + 1) / snake.trail.length) * 0.5
          ctx.beginPath()
          ctx.arc(gx * GRID + GRID / 2, gy * GRID + GRID / 2, 1.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(0, 217, 255, ${alpha})`
          ctx.fill()
        }
      }
    }

    let interval: ReturnType<typeof setInterval> | null = null
    const start = () => { if (!interval) interval = setInterval(tick, TICK_MS) }
    const stop = () => { if (interval) { clearInterval(interval); interval = null } }

    const io = new IntersectionObserver(
      entries => { entries[0].isIntersecting && document.visibilityState === 'visible' ? start() : stop() },
      { threshold: 0 },
    )
    io.observe(canvas)

    const onVisibility = () => { document.visibilityState === 'visible' && canvas.getBoundingClientRect().top < window.innerHeight ? start() : stop() }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[1]" />
}


function useTypewriterRotation(roles: readonly string[], { typeSpeed = 80, deleteSpeed = 60, pauseAfterType = 2000, pauseAfterDelete = 300 } = {}) {
  const [roleIndex, setRoleIndex] = useState(0)
  const [displayText, setDisplayText] = useState(roles[0])
  const [isDeleting, setIsDeleting] = useState(false)
  const currentRole = roles[roleIndex]

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    if (!isDeleting && displayText === currentRole) {
      timeout = setTimeout(() => setIsDeleting(true), pauseAfterType)
    } else if (isDeleting && displayText === '') {
      timeout = setTimeout(() => {
        setRoleIndex(i => (i + 1) % roles.length)
        setIsDeleting(false)
      }, pauseAfterDelete)
    } else if (isDeleting) {
      timeout = setTimeout(() => {
        const words = displayText.trimEnd().split(' ')
        words.pop()
        setDisplayText(words.length > 0 ? words.join(' ') + ' ' : '')
      }, deleteSpeed)
    } else {
      timeout = setTimeout(() => {
        setDisplayText(currentRole.slice(0, displayText.length + 1))
      }, typeSpeed)
    }

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, currentRole, roles, typeSpeed, deleteSpeed, pauseAfterType, pauseAfterDelete])

  return { displayText, roleIndex, isDeleting }
}

const HOME_TOC_SECTIONS = [
  { id: 'experience', en: 'Experience' },
  { id: 'projects', en: 'Projects' },
  { id: 'accomplishments', en: 'Accomplishments' },
  { id: 'education', en: 'Education' },
  { id: 'tech', en: 'Skills & Stack' },
  { id: 'contact', en: 'Contact' },
] as const

function HomeToc() {
  const [hasRevealed, setHasRevealed] = useState(false)
  const [visible, setVisible] = useState(false)
  const [activeId, setActiveId] = useState('')
  const [tocOpen, setTocOpen] = useState(false)

  useEffect(() => {
    const check = () => {
      const trigger = document.getElementById('experience')
      if (!trigger) return
      const show = trigger.getBoundingClientRect().top <= 100
      setVisible(show)
      if (show && !hasRevealed) setHasRevealed(true)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [hasRevealed])

  useEffect(() => {
    if (!hasRevealed) return
    const update = () => {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50
      if (atBottom) {
        setActiveId(HOME_TOC_SECTIONS[HOME_TOC_SECTIONS.length - 1].id)
        return
      }
      const threshold = window.innerHeight * 0.4
      let current = ''
      for (const s of HOME_TOC_SECTIONS) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= threshold) current = s.id
      }
      if (current) setActiveId(current)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [hasRevealed])

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    setTocOpen(false)
    const isLast = id === HOME_TOC_SECTIONS[HOME_TOC_SECTIONS.length - 1].id
    const top = isLast
      ? document.documentElement.scrollHeight - window.innerHeight
      : el.getBoundingClientRect().top + window.scrollY - 96
    requestAnimationFrame(() => { window.scrollTo({ top, behavior: 'instant' }) })
  }, [])

  const activeIdx = HOME_TOC_SECTIONS.findIndex(s => s.id === activeId)
  const lastIdx = HOME_TOC_SECTIONS.length - 1
  const progressFrac = activeIdx >= 0 ? activeIdx / lastIdx : 0

  const tocNav = (
    <nav aria-label="Table of contents" className="relative">
      <div className="absolute left-[5.5px] top-[14px] w-px bg-border" style={{ height: 'calc(100% - 28px)' }} />
      <motion.div
        className="absolute left-[5.5px] top-[14px] w-px bg-primary origin-top"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: progressFrac }}
        style={{ height: 'calc(100% - 28px)' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
      <ul className="relative space-y-1">
        {HOME_TOC_SECTIONS.map((section, i) => {
          const isActive = activeId === section.id
          const isPast = i <= activeIdx
          return (
            <li key={section.id} className="flex items-center gap-3">
              <motion.span
                className={`relative z-10 w-3 h-3 rounded-full border-2 shrink-0 transition-colors duration-300 ${
                  isActive ? 'border-primary bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]'
                  : isPast ? 'border-primary/50 bg-card'
                  : 'border-border bg-card'
                }`}
                animate={isActive ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              />
              <button
                onClick={() => scrollTo(section.id)}
                className={`text-left text-[13px] tracking-wide py-1 transition-all duration-300 ${
                  isActive ? 'text-primary font-semibold translate-x-0.5'
                  : isPast ? 'text-foreground/70'
                  : 'text-muted-foreground/60 hover:text-foreground/80'
                }`}
              >
                {section.en}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={hasRevealed ? { opacity: 0, x: -12 } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="hidden 2xl:block fixed top-24 left-[max(1rem,calc(50%-46rem))] w-48 max-h-[calc(100vh-8rem)] overflow-visible z-30"
          >
            {tocNav}
          </motion.div>

          <motion.button
            initial={hasRevealed ? { opacity: 0, scale: 0.8 } : false}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            onClick={() => setTocOpen(o => !o)}
            className="2xl:hidden fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
            aria-label="Toggle table of contents"
          >
            <List className="w-5 h-5" />
          </motion.button>
          {tocOpen && (
            <>
              <div className="2xl:hidden fixed inset-0 bg-background/60 backdrop-blur-sm z-40" onClick={() => setTocOpen(false)} />
              <div className="2xl:hidden fixed bottom-20 right-6 z-50 w-64 max-h-[70vh] overflow-y-auto bg-card border border-border rounded-xl shadow-xl p-4">
                {tocNav}
              </div>
            </>
          )}
        </>
      )}
    </AnimatePresence>
  )
}

function AnimatedSection({ children, className = '', delay = 0, id }: { children: React.ReactNode, className?: string, delay?: number, id?: string }) {
  const [ref, setRef] = useState<HTMLElement | null>(null)
  const [isInView, setIsInView] = useState(false)
  const [detected, setDetected] = useState(false)
  const hydrated = useHydrated()
  const wasAboveFold = useRef(false)

  useEffect(() => {
    if (!ref) return
    let firstCallback = true
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (firstCallback) {
          firstCallback = false
          if (entry.isIntersecting) wasAboveFold.current = true
          setDetected(true)
        }
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(ref)
    return () => observer.disconnect()
  }, [ref])

  return (
    <motion.div
      ref={setRef}
      id={id}
      initial={false}
      animate={
        !hydrated || !detected
          ? false
          : isInView
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 40 }
      }
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

type ParsedHighlights = {
  clean: string
  ranges: [number, number][]
  typewriterRanges: [number, number][]
  finalRanges: [number, number][]
  permanentRanges: [number, number][]
  slowRanges: [number, number][]
}

function parseHighlights(text: string): ParsedHighlights {
  const typewriterRanges: [number, number][] = []
  const finalRanges: [number, number][] = []
  const permanentRanges: [number, number][] = []
  const slowRanges: [number, number][] = []
  let clean = ''
  let i = 0

  while (i < text.length) {
    if (text[i] === '*' && text[i + 1] === '*') {
      const start = clean.length
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '*')) {
        clean += text[i]
        i++
      }
      permanentRanges.push([start, clean.length])
      slowRanges.push([start, clean.length])
      i += 2
    }
    else if (text[i] === '+') {
      const nextIsDigit = /\d/.test(text[i + 1] || '')
      const start = clean.length
      i++
      if (nextIsDigit) {
        while (i < text.length && /\d/.test(text[i])) {
          clean += text[i]
          i++
        }
        clean += '+'
      }
      while (i < text.length && text[i] !== '+') {
        clean += text[i]
        i++
      }
      finalRanges.push([start, clean.length])
      i++
    }
    else if (text[i] === '*') {
      const start = clean.length
      i++
      while (i < text.length && text[i] !== '*') {
        clean += text[i]
        i++
      }
      typewriterRanges.push([start, clean.length])
      i++
    } else {
      clean += text[i]
      i++
    }
  }

  const ranges: [number, number][] = [...permanentRanges]
  return { clean, ranges, typewriterRanges, finalRanges, permanentRanges, slowRanges }
}

function renderHighlightedText(
  text: string,
  _ranges: [number, number][],
  options?: {
    dimmed?: boolean
    finalReveal?: boolean
    revealed?: boolean
    typewriterRanges?: [number, number][]
    finalRanges?: [number, number][]
    permanentRanges?: [number, number][]
    highlightsActive?: boolean
  }
) {
  const {
    dimmed = false,
    finalReveal = false,
    revealed = false,
    typewriterRanges = [],
    finalRanges = [],
    permanentRanges = [],
    highlightsActive = false
  } = options || {}

  type HighlightType = 'typewriter' | 'final' | 'permanent' | null
  const charTypes: HighlightType[] = new Array(text.length).fill(null)

  typewriterRanges.forEach(([start, end]) => {
    for (let i = start; i < end && i < text.length; i++) charTypes[i] = 'typewriter'
  })
  finalRanges.forEach(([start, end]) => {
    for (let i = start; i < end && i < text.length; i++) charTypes[i] = 'final'
  })
  permanentRanges.forEach(([start, end]) => {
    for (let i = start; i < end && i < text.length; i++) charTypes[i] = 'permanent'
  })

  const textOpacity = dimmed ? (revealed ? 'opacity-50' : 'opacity-15') : 'opacity-100'
  const isFinalLowOpacity = dimmed && !finalReveal
  const timing = 'duration-[2500ms] ease-in-out'

  if (typewriterRanges.length === 0 && finalRanges.length === 0 && permanentRanges.length === 0) {
    return (
      <span className={`text-muted-foreground transition-opacity ${timing} ${textOpacity}`}>
        {text}
      </span>
    )
  }

  const parts: React.ReactNode[] = []
  let currentType: HighlightType = charTypes[0]
  let currentStart = 0

  const pushHighlightWords = (
    seg: string, baseKey: number, showGradient: boolean, normalOpacity: string
  ) => {
    const gOp = showGradient ? 'opacity-100' : 'opacity-0'
    const totalLen = seg.length
    let charPos = 0
    seg.split(/( +)/).forEach((word, wIdx) => {
      if (!word) return
      if (/^ +$/.test(word)) {
        parts.push(<span key={`${baseKey}s${wIdx}`}>{word}</span>)
        charPos += word.length
      } else {
        const wordFrac = word.length / totalLen
        const startFrac = charPos / totalLen
        const bgSize = wordFrac >= 1 ? 100 : 100 / wordFrac
        const bgPos = wordFrac >= 1 ? 0 : startFrac * 100 / (1 - wordFrac)
        parts.push(
          <span key={`${baseKey}w${wIdx}`} className="inline-grid">
            <span
              className={`col-start-1 row-start-1 font-medium transition-opacity ${timing} ${gOp}`}
              style={{
                backgroundImage: 'linear-gradient(to right, hsl(var(--gradient-from)), hsl(var(--gradient-to)))',
                backgroundSize: `${bgSize}% 100%`,
                backgroundPosition: `${bgPos}% 0`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >{word}</span>
            <span className={`col-start-1 row-start-1 text-muted-foreground transition-opacity ${timing} ${normalOpacity}`}>{word}</span>
          </span>
        )
        charPos += word.length
      }
    })
  }

  for (let i = 1; i <= text.length; i++) {
    const type = i < text.length ? charTypes[i] : null
    if (type !== currentType || i === text.length) {
      const segment = text.slice(currentStart, i)
      if (segment) {
        if (currentType === null) {
          parts.push(
            <span
              key={currentStart}
              className={`text-muted-foreground transition-opacity ${timing} ${textOpacity}`}
            >
              {segment}
            </span>
          )
        } else if (currentType === 'typewriter') {
          const showGradient = highlightsActive
          pushHighlightWords(segment, currentStart, showGradient,
            showGradient ? 'opacity-0' : textOpacity)
        } else if (currentType === 'final') {
          const showGradient = finalReveal
          pushHighlightWords(segment, currentStart, showGradient,
            showGradient ? 'opacity-0' : isFinalLowOpacity ? 'opacity-15' : 'opacity-100')
        } else {
          const showGradient = !revealed
          pushHighlightWords(segment, currentStart, showGradient,
            showGradient ? 'opacity-0' : 'opacity-100')
        }
      }
      currentStart = i
      currentType = type
    }
  }

  return parts
}

type Phase = 'idle' | 'context' | 'pause-after-context' | 'reflection' | 'pause-before-delete' | 'deleting' | 'hook' | 'complete'

type TypewriterState = {
  phase: Phase
  displayText: string
  contextComplete: boolean
  currentReflection: number
  completedHookLines: string[][]
  currentHookParagraph: number
  currentHookLine: number
}

type TypewriterAction =
  | { type: 'START' }
  | { type: 'TICK'; char: string }
  | { type: 'PHASE_CHANGE'; phase: Phase }
  | { type: 'CONTEXT_COMPLETE' }
  | { type: 'CLEAR_TEXT' }
  | { type: 'DELETE_WORD' }
  | { type: 'NEXT_REFLECTION' }
  | { type: 'COMPLETE_HOOK_LINE'; text: string }
  | { type: 'NEXT_HOOK_LINE' }
  | { type: 'NEXT_HOOK_PARAGRAPH' }
  | { type: 'SKIP_TO_COMPLETE'; allHookLines: string[][] }
  | { type: 'RESET' }

const initialTypewriterState: TypewriterState = {
  phase: 'idle',
  displayText: '',
  contextComplete: false,
  currentReflection: 0,
  completedHookLines: [],
  currentHookParagraph: 0,
  currentHookLine: 0,
}

function typewriterReducer(state: TypewriterState, action: TypewriterAction): TypewriterState {
  switch (action.type) {
    case 'START':
      return { ...state, phase: 'context' }
    case 'TICK':
      return { ...state, displayText: state.displayText + action.char }
    case 'PHASE_CHANGE':
      return { ...state, phase: action.phase }
    case 'CONTEXT_COMPLETE':
      return { ...state, contextComplete: true }
    case 'CLEAR_TEXT':
      return { ...state, displayText: '' }
    case 'DELETE_WORD': {
      const trimmed = state.displayText.trimEnd()
      const lastSpace = trimmed.lastIndexOf(' ')
      return { ...state, displayText: lastSpace === -1 ? '' : state.displayText.slice(0, lastSpace + 1) }
    }
    case 'NEXT_REFLECTION':
      return { ...state, currentReflection: state.currentReflection + 1, displayText: '', phase: 'reflection' }
    case 'COMPLETE_HOOK_LINE': {
      const newCompleted = [...state.completedHookLines]
      if (!newCompleted[state.currentHookParagraph]) newCompleted[state.currentHookParagraph] = []
      newCompleted[state.currentHookParagraph][state.currentHookLine] = action.text
      return { ...state, completedHookLines: newCompleted }
    }
    case 'NEXT_HOOK_LINE':
      return { ...state, currentHookLine: state.currentHookLine + 1, displayText: '' }
    case 'NEXT_HOOK_PARAGRAPH':
      return { ...state, currentHookParagraph: state.currentHookParagraph + 1, currentHookLine: 0, displayText: '' }
    case 'SKIP_TO_COMPLETE':
      return {
        ...state,
        phase: 'complete',
        contextComplete: true,
        completedHookLines: action.allHookLines,
        displayText: '',
      }
    case 'RESET':
      return initialTypewriterState
    default:
      return state
  }
}

const STORY_SEEN_KEY = 'story-animation-seen-v1'

function ReflectiveTypewriter({
  context,
  reflections,
  hookParagraphs,
  className = '',
  dimmed = false,
  finalReveal = false,
  revealed = false,
  onComplete,
  skipRef,
  onStart
}: {
  context: string
  reflections: readonly string[]
  hookParagraphs: readonly (readonly string[])[]
  className?: string
  dimmed?: boolean
  finalReveal?: boolean
  revealed?: boolean
  onComplete?: () => void
  skipRef?: React.MutableRefObject<(() => void) | null>
  onStart?: () => void
}) {
  const [state, dispatch] = useReducer(typewriterReducer, initialTypewriterState)
  const { phase, displayText, contextComplete, currentReflection, completedHookLines, currentHookParagraph, currentHookLine } = state

  const { ref, isInView } = useInView(0.5)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const parsedContext = useMemo(() => parseHighlights(context), [context])

  const parsedHookLines = useMemo(() =>
    hookParagraphs.flatMap(p => [...p]).map(parseHighlights),
    [hookParagraphs]
  )

  const allHookLinesComplete = useMemo(() => {
    const result: string[][] = []
    let flatIdx = 0
    for (let p = 0; p < hookParagraphs.length; p++) {
      result[p] = []
      for (let l = 0; l < hookParagraphs[p].length; l++) {
        result[p][l] = parsedHookLines[flatIdx]?.clean || ''
        flatIdx++
      }
    }
    return result
  }, [hookParagraphs, parsedHookLines])

  const skipToComplete = useCallback(() => {
    abortRef.current?.abort()
    dispatch({ type: 'SKIP_TO_COMPLETE', allHookLines: allHookLinesComplete })
    sessionStorage.setItem(STORY_SEEN_KEY, 'true')
    onComplete?.()
  }, [allHookLinesComplete, onComplete])

  useEffect(() => {
    if (skipRef) skipRef.current = skipToComplete
  }, [skipRef, skipToComplete])

  useEffect(() => {
    const seen = sessionStorage.getItem(STORY_SEEN_KEY)
    if (seen && phase === 'idle') {
      skipToComplete()
    }
  }, [])

  useEffect(() => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    dispatch({ type: 'RESET' })

    const seen = sessionStorage.getItem(STORY_SEEN_KEY)
    if (seen) {
      dispatch({ type: 'SKIP_TO_COMPLETE', allHookLines: allHookLinesComplete })
    }
  }, [context, reflections, hookParagraphs, allHookLinesComplete])

  useEffect(() => {
    if (isInView && phase === 'idle') {
      dispatch({ type: 'START' })
      onStart?.()
    }
  }, [isInView, phase, onStart])

  useEffect(() => {
    if (phase === 'complete' || phase === 'idle') return

    const handleClick = () => {
      skipToComplete()
    }

    const container = containerRef.current
    container?.addEventListener('click', handleClick)

    return () => container?.removeEventListener('click', handleClick)
  }, [phase, skipToComplete])

  const getTypingDelay = useCallback((char: string, prevChar: string) => {
    let delay = 40
    if (/[.,!?;:—]/.test(char)) delay += 120 + Math.random() * 100
    else if (char === ' ') delay += 20 + Math.random() * 30
    else if (prevChar === ' ') delay += 25 + Math.random() * 20
    delay += (Math.random() - 0.5) * 20
    return Math.max(25, delay)
  }, [])

  useEffect(() => {
    if (phase === 'idle' || phase === 'complete') return

    const signal = abortRef.current?.signal

    if (phase === 'context') {
      const cleanContext = parsedContext.clean
      if (displayText === cleanContext) {
        const timer = setTimeout(() => {
          if (signal?.aborted) return
          dispatch({ type: 'PHASE_CHANGE', phase: 'pause-after-context' })
        }, 100)
        return () => clearTimeout(timer)
      } else {
        const nextChar = cleanContext[displayText.length]
        const prevChar = displayText.length > 0 ? cleanContext[displayText.length - 1] : ''
        const delay = getTypingDelay(nextChar, prevChar)
        const timer = setTimeout(() => {
          if (signal?.aborted) return
          dispatch({ type: 'TICK', char: nextChar })
        }, delay)
        return () => clearTimeout(timer)
      }
    }

    if (phase === 'pause-after-context') {
      dispatch({ type: 'CONTEXT_COMPLETE' })
      const timer = setTimeout(() => {
        if (signal?.aborted) return
        dispatch({ type: 'CLEAR_TEXT' })
        dispatch({ type: 'PHASE_CHANGE', phase: 'reflection' })
      }, 800)
      return () => clearTimeout(timer)
    }

    if (phase === 'reflection') {
      const currentText = reflections[currentReflection]
      if (displayText === currentText) {
        const timer = setTimeout(() => {
          if (signal?.aborted) return
          dispatch({ type: 'PHASE_CHANGE', phase: 'pause-before-delete' })
        }, 600)
        return () => clearTimeout(timer)
      } else {
        const nextChar = currentText[displayText.length]
        const prevChar = displayText.length > 0 ? currentText[displayText.length - 1] : ''
        const delay = getTypingDelay(nextChar, prevChar)
        const timer = setTimeout(() => {
          if (signal?.aborted) return
          dispatch({ type: 'TICK', char: nextChar })
        }, delay)
        return () => clearTimeout(timer)
      }
    }

    if (phase === 'pause-before-delete') {
      const timer = setTimeout(() => {
        if (signal?.aborted) return
        dispatch({ type: 'PHASE_CHANGE', phase: 'deleting' })
      }, 400)
      return () => clearTimeout(timer)
    }

    if (phase === 'deleting') {
      if (displayText === '') {
        if (currentReflection < reflections.length - 1) {
          dispatch({ type: 'NEXT_REFLECTION' })
        } else {
          dispatch({ type: 'PHASE_CHANGE', phase: 'hook' })
        }
      } else {
        const delay = 80 + Math.random() * 40
        const timer = setTimeout(() => {
          if (signal?.aborted) return
          dispatch({ type: 'DELETE_WORD' })
        }, delay)
        return () => clearTimeout(timer)
      }
    }

    if (phase === 'hook') {
      const flatIndex = (() => {
        let idx = 0
        for (let p = 0; p < currentHookParagraph; p++) idx += hookParagraphs[p].length
        return idx + currentHookLine
      })()
      const { clean: currentText } = parsedHookLines[flatIndex]

      if (displayText === currentText) {
        dispatch({ type: 'COMPLETE_HOOK_LINE', text: currentText })

        const isLastLine = currentHookLine >= hookParagraphs[currentHookParagraph].length - 1
        const isLastParagraph = currentHookParagraph >= hookParagraphs.length - 1

        if (isLastLine && isLastParagraph) {
          const timer = setTimeout(() => {
            if (signal?.aborted) return
            dispatch({ type: 'PHASE_CHANGE', phase: 'complete' })
            sessionStorage.setItem(STORY_SEEN_KEY, 'true')
            onComplete?.()
          }, 600)
          return () => clearTimeout(timer)
        } else if (isLastLine) {
          const timer = setTimeout(() => {
            if (signal?.aborted) return
            dispatch({ type: 'NEXT_HOOK_PARAGRAPH' })
          }, 800)
          return () => clearTimeout(timer)
        } else {
          const timer = setTimeout(() => {
            if (signal?.aborted) return
            dispatch({ type: 'NEXT_HOOK_LINE' })
          }, 500)
          return () => clearTimeout(timer)
        }
      } else {
        const nextCharIndex = displayText.length
        const nextChar = currentText[nextCharIndex]
        const prevChar = nextCharIndex > 0 ? currentText[nextCharIndex - 1] : ''

        const { slowRanges } = parsedHookLines[flatIndex]
        const isInSlowRange = slowRanges.some(([start, end]) => nextCharIndex >= start && nextCharIndex < end)

        let delay = getTypingDelay(nextChar, prevChar)

        if (isInSlowRange) {
          delay = delay * 4 + 80
        }

        const timer = setTimeout(() => {
          if (signal?.aborted) return
          dispatch({ type: 'TICK', char: nextChar })
        }, delay)
        return () => clearTimeout(timer)
      }
    }
  }, [phase, displayText, context, reflections, currentReflection, hookParagraphs, parsedHookLines, currentHookParagraph, currentHookLine, getTypingDelay, onComplete])

  const showCursor = phase !== 'complete' && phase !== 'idle'

  const getHookParsed = (pIdx: number, lIdx: number): ParsedHighlights => {
    let flatIdx = 0
    for (let p = 0; p < pIdx; p++) flatIdx += hookParagraphs[p].length
    return parsedHookLines[flatIdx + lIdx] || { clean: '', ranges: [], typewriterRanges: [], finalRanges: [], permanentRanges: [], slowRanges: [] }
  }

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node
    ref(node)
  }, [ref])

  return (
    <div
      ref={setRefs}
      className={`${className} min-h-[7rem] md:min-h-[8rem] ${phase !== 'complete' && phase !== 'idle' ? 'cursor-pointer' : ''}`}
      title={phase !== 'complete' && phase !== 'idle' ? 'Click to skip' : undefined}
    >
      <span className="md:block md:-mb-1">
        {phase === 'context' ? (
          <>
            {renderHighlightedText(displayText, [], {
              dimmed,
              finalReveal,
              revealed,
              typewriterRanges: parsedContext.typewriterRanges,
              finalRanges: parsedContext.finalRanges,
              permanentRanges: parsedContext.permanentRanges,
              highlightsActive: true,
            })}
            {showCursor && <span className="ml-0.5 inline-block text-primary" style={{ animation: 'blink 0.6s step-end infinite' }}>|</span>}
          </>
        ) : contextComplete ? (
          <>
            {renderHighlightedText(parsedContext.clean, [], {
              dimmed,
              finalReveal,
              revealed,
              typewriterRanges: parsedContext.typewriterRanges,
              finalRanges: parsedContext.finalRanges,
              permanentRanges: parsedContext.permanentRanges,
              highlightsActive: false,
            })}
            {phase === 'pause-after-context' && (
              <span className="ml-0.5 inline-block text-primary" style={{ animation: 'blink 0.6s step-end infinite' }}>|</span>
            )}
          </>
        ) : null}
      </span>{' '}

      {(phase === 'reflection' || phase === 'pause-before-delete' || phase === 'deleting') && (
        <p className="mb-1">
          <span className="text-gradient-theme">{displayText}</span>
          {showCursor && <span className="ml-0.5 inline-block text-primary" style={{ animation: 'blink 0.6s step-end infinite' }}>|</span>}
        </p>
      )}

      {(phase === 'hook' || phase === 'complete') && hookParagraphs.map((paragraph, pIdx) => {
        const Tag = pIdx === 0 ? 'span' : 'p'
        const wrapperClass = pIdx === 0
          ? "md:block md:mb-4"
          : "mt-4 md:mt-0"
        return (
          <Tag key={pIdx} className={wrapperClass}>
            {paragraph.map((_, lIdx) => {
              const parsed = getHookParsed(pIdx, lIdx)
              const isCurrentLine = pIdx === currentHookParagraph && lIdx === currentHookLine
              const isCompleted = completedHookLines[pIdx]?.[lIdx] !== undefined

              const textToShow = isCompleted
                ? completedHookLines[pIdx][lIdx]
                : (isCurrentLine && phase === 'hook')
                  ? displayText
                  : ''

              const highlightsActive = isCurrentLine && phase === 'hook'

              if (!textToShow && !isCurrentLine) return null

              return (
                <span key={lIdx} className={lIdx > 0 ? "md:block md:-mt-1" : ""}>
                  {lIdx > 0 && <span className="md:hidden"> </span>}
                  {renderHighlightedText(textToShow, [], {
                    dimmed,
                    finalReveal,
                    revealed,
                    typewriterRanges: parsed.typewriterRanges,
                    finalRanges: parsed.finalRanges,
                    permanentRanges: parsed.permanentRanges,
                    highlightsActive,
                  })}
                  {isCurrentLine && phase === 'hook' && showCursor && (
                    <span className="ml-0.5 inline-block text-primary" style={{ animation: 'blink 0.6s step-end infinite' }}>|</span>
                  )}
                </span>
              )
            })}
          </Tag>
        )
      })}
    </div>
  )
}

function StorySection() {
  const t = translations.en
  const [typewriterComplete, setTypewriterComplete] = useState(false)
  const [textDimmed, setTextDimmed] = useState(false)
  const [finalReveal, setFinalReveal] = useState(false)
  const [textRevealed, setTextRevealed] = useState(false)
  const [animationStarted, setAnimationStarted] = useState(false)
  const [scrollSkipped, setScrollSkipped] = useState(false)
  const skipRef = useRef<(() => void) | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const seen = sessionStorage.getItem(STORY_SEEN_KEY)
    if (seen) {
      setTypewriterComplete(true)
      setTextDimmed(true)
      setFinalReveal(true)
      setTextRevealed(true)
    } else {
      setTypewriterComplete(false)
      setTextDimmed(false)
      setFinalReveal(false)
      setTextRevealed(false)
      setAnimationStarted(false)
      setScrollSkipped(false)
    }
  }, [])

  const sequenceStartedRef = useRef(false)

  useEffect(() => {
    if (!typewriterComplete || sequenceStartedRef.current) return
    sequenceStartedRef.current = true

    const dimTimer = setTimeout(() => {
      setTextDimmed(true)
    }, 2500)

    const finalRevealTimer = setTimeout(() => {
      setFinalReveal(true)
    }, 4500)

    const revealTimer = setTimeout(() => {
      setTextRevealed(true)
    }, 8000)

    return () => {
      clearTimeout(dimTimer)
      clearTimeout(finalRevealTimer)
      clearTimeout(revealTimer)
    }
  }, [typewriterComplete])

  useEffect(() => {
    if (typewriterComplete) return
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          setScrollSkipped(true)
          skipRef.current?.()
        }
      },
      { threshold: 0 }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [typewriterComplete])

  return (
    <section ref={sectionRef} id="about" className="relative py-16 md:py-24">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent 0%, hsl(var(--background)) 25%, hsl(var(--background)) 75%, transparent 100%)',
      }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="relative pb-12">
          <ReflectiveTypewriter
            context={t.story.context}
            reflections={t.story.reflections}
            hookParagraphs={t.story.hookParagraphs}
            dimmed={textDimmed}
            finalReveal={finalReveal}
            revealed={textRevealed}
            className="font-display text-lg md:text-2xl leading-relaxed text-center max-w-3xl mx-auto"
            onComplete={() => setTypewriterComplete(true)}
            skipRef={skipRef}
            onStart={() => setAnimationStarted(true)}
          />

          <AnimatePresence>
            {animationStarted && !typewriterComplete && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={() => skipRef.current?.()}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm text-muted-foreground border border-border/50 bg-card backdrop-blur-sm cursor-pointer hover:bg-primary/10 hover:border-primary/30 hover:text-foreground transition-colors duration-200"
              >
                <SkipForward className="w-3.5 h-3.5" />
                {t.story.skipButton}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={typewriterComplete
            ? { height: 'auto', opacity: 1 }
            : { height: 0, opacity: 0 }
          }
          transition={scrollSkipped
            ? { duration: 0 }
            : {
                height: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
                opacity: { duration: 0.4, delay: 0.1 }
              }
          }
          style={{ overflow: 'hidden' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={typewriterComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
            transition={{ duration: 0.6, delay: typewriterComplete ? 0.1 : 0, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <p className={`text-base md:text-lg text-muted-foreground leading-relaxed text-center max-w-3xl mx-auto transition-opacity duration-[2500ms] ease-in-out ${textDimmed ? (textRevealed ? 'opacity-50' : 'opacity-15') : 'opacity-100'}`}>
              {t.story.why}
            </p>
          </motion.div>

          <div className="mt-6 text-center max-w-3xl mx-auto">
            {t.story.seeking.map((line, i) => {
              const isSpotlit = i === 0 || i === 2
              const dimOpacity = textDimmed
                ? (isSpotlit ? (finalReveal ? 'opacity-100' : 'opacity-15') : (textRevealed ? 'opacity-50' : 'opacity-15'))
                : 'opacity-100'

              return (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={typewriterComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
                  transition={{ duration: 0.6, delay: typewriterComplete ? 0.3 + i * 0.2 : 0, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className={`transition-opacity duration-[2500ms] ease-in-out ${dimOpacity} ${
                    i === 2
                      ? 'font-display text-lg md:text-2xl font-bold text-gradient-theme leading-snug'
                      : i === 1
                        ? 'font-display text-lg md:text-2xl text-muted-foreground leading-snug'
                        : 'font-display text-lg md:text-2xl font-bold text-foreground leading-snug'
                  }`}
                >
                  {line}
                </motion.p>
              )
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={typewriterComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
            transition={{ duration: 0.6, delay: typewriterComplete ? 0.9 : 0, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`flex flex-wrap justify-center gap-3 mt-10 mb-12 transition-opacity duration-[2500ms] ease-in-out ${textDimmed && !textRevealed ? 'opacity-15' : 'opacity-100'}`}
          >
          {t.story.nav.map((item) => {
            const icons: Record<string, React.ReactNode> = {
              briefcase: <Briefcase className="w-4 h-4" />,
              folder: <FolderGit2 className="w-4 h-4" />,
              mail: <Mail className="w-4 h-4" />,
              bot: <Bot className="w-4 h-4" />
            }
            const isHighlight = 'highlight' in item && item.highlight
            const handleClick = (e: React.MouseEvent) => {
              if (item.href === '#chat') {
                e.preventDefault()
                window.dispatchEvent(new Event('openChat'))
              }
            }
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={handleClick}
                className={isHighlight
                  ? "flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-theme text-white border border-transparent hover:brightness-110 hover:shadow-xl hover:shadow-primary/30 active:brightness-95 transition-all duration-200 text-sm font-medium shadow-lg shadow-primary/25"
                  : "flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-sm font-medium"
                }
              >
                {icons[item.icon]}
                {item.label}
              </a>
            )
          })}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

const EXPERIENCE_ENTRIES = ['revalgo', 'markovate', 'ulm', 'mixorg'] as const

const ICON_MAP: Record<string, React.ReactNode> = {
  briefcase: <Briefcase className="w-4 h-4" />,
  folder: <FolderGit2 className="w-4 h-4" />,
  mail: <Mail className="w-4 h-4" />,
  bot: <Bot className="w-4 h-4" />,
  code: <Code className="w-4 h-4" />,
  brain: <Brain className="w-4 h-4" />,
  zap: <Zap className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  layout: <Layout className="w-4 h-4" />,
  package: <Package className="w-4 h-4" />,
  messageSquare: <MessageSquare className="w-4 h-4" />,
  calendarCheck: <CalendarCheck className="w-4 h-4" />,
  fileText: <FileText className="w-4 h-4" />,
  gitBranch: <GitBranch className="w-4 h-4" />,
  star: <Star className="w-4 h-4" />,
  calendar: <Calendar className="w-4 h-4" />,
  percent: <Percent className="w-4 h-4" />,
  userCheck: <UserCheck className="w-4 h-4" />,
  image: <Image className="w-4 h-4" />,
  trendingUp: <TrendingUp className="w-4 h-4" />,
  network: <Network className="w-4 h-4" />,
  target: <Target className="w-4 h-4" />,
  inbox: <Inbox className="w-4 h-4" />,
  compass: <Compass className="w-4 h-4" />,
  gitMerge: <GitMerge className="w-4 h-4" />,
  award: <Award className="w-4 h-4" />,
  graduation: <GraduationCap className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
}

function App() {
  const t = translations.en
  const hydrated = useHydrated()
  useHeroStyles()
  const { displayText: roleText } = useTypewriterRotation(t.greetingRoles)

  const seoData = seo.en
  useHomeSeo({ lang: 'en', title: seoData.title, description: seoData.description })

  return (
    <main className="min-h-screen bg-background bg-[length:24px_24px] [background-image:radial-gradient(circle,hsl(var(--dot-grid))_1px,transparent_1px)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:font-medium focus:shadow-lg"
      >
        Skip to content
      </a>

      <HomeToc />

      {/* Hero Section */}
      <header id="main-content" className="relative overflow-hidden">
        <GridSnakes />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
        <div className="absolute top-0 right-[max(0px,calc(50%-40rem))] w-[600px] h-[600px] rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 hidden sm:block animate-[hero-glow_8s_ease-in-out_infinite]" style={{ backgroundColor: 'hsl(var(--hero-orb-primary))' }} />
        <div className="absolute bottom-0 left-[max(0px,calc(50%-40rem))] w-[550px] h-[550px] rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 hidden sm:block animate-[hero-glow_11s_ease-in-out_infinite_reverse]" style={{ backgroundColor: 'hsl(var(--hero-orb-accent))' }} />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-12 md:pt-32 md:pb-16">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <motion.div
              initial={hydrated ? { opacity: 0, scale: 0.8 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="relative w-40 h-40 md:w-48 md:h-48">
                <div className="absolute inset-0 rounded-full bg-gradient-theme-30 blur-xl" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-white/5 md:backdrop-blur-sm border border-white/20 shadow-2xl" />
                <div className="absolute inset-2 rounded-full bg-gradient-theme-50 p-[2px]">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                    <span className="text-4xl font-display font-bold text-gradient-theme">A</span>
                  </div>
                </div>
              </div>
              <motion.div
                initial={hydrated ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gradient-theme flex items-center justify-center shadow-lg border-2 border-background"
              >
                <BadgeCheck className="w-6 h-6 text-white" />
              </motion.div>
            </motion.div>

            <div className="flex-1 text-center md:text-left">
              <motion.div
                initial={hydrated ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-wrap gap-2 justify-center md:justify-start mb-4"
              >
                {t.pillLabels.map((pill, i) => (
                  <BeamPill key={i}>
                    <span className="px-3 py-1 text-xs font-medium text-foreground/80 rounded-full bg-card/50 border border-border/50">
                      {pill}
                    </span>
                  </BeamPill>
                ))}
              </motion.div>

              <motion.h1
                initial={hydrated ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="font-display text-4xl md:text-6xl font-bold tracking-tight"
              >
                Ayaz Zia Ansari
              </motion.h1>

              <motion.p
                initial={hydrated ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="font-display text-lg md:text-2xl text-muted-foreground mt-2 h-8"
              >
                <span className="text-gradient-theme font-semibold">{roleText}</span>
                <span className="ml-0.5 inline-block text-primary" style={{ animation: 'blink 0.8s step-end infinite' }}>|</span>
              </motion.p>

              <motion.p
                initial={hydrated ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-sm md:text-base text-muted-foreground mt-3 flex flex-wrap gap-4 justify-center md:justify-start"
              >
                <span className="flex items-center gap-1.5"><Target className="w-4 h-4" /> {t.location}</span>
                <a href={`mailto:${t.email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Mail className="w-4 h-4" /> {t.email}
                </a>
                <a href="https://github.com/Ayazzia01" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Github className="w-4 h-4" /> github.com/Ayazzia01
                </a>
                <a href="https://linkedin.com/in/ayazziaansari" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <LinkedInLogo /> LinkedIn
                </a>
                <a href="https://scholar.google.com/citations?user=i8lxFo8AAAAJ" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Award className="w-4 h-4" /> Scholar
                </a>
              </motion.p>
            </div>
          </div>
        </div>
      </header>

      <StorySection />

      {/* Professional Summary */}
      <AnimatedSection className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">{t.summary.title}</h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            {t.summary.p1}<span className="text-gradient-theme font-semibold">{t.summary.p1Highlight}</span>{t.summary.p1End}
          </p>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mt-4">
            {t.summary.p2}<span className="text-gradient-theme font-semibold">{t.summary.p2Highlight}</span>{t.summary.p2End}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {t.summary.cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
            >
              <h3 className="font-display text-lg font-semibold mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Core Competencies */}
      <AnimatedSection className="max-w-5xl mx-auto px-6 py-8 md:py-12">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">{t.coreCompetencies.title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {t.coreCompetencies.items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
            >
              <h3 className="font-display text-base font-semibold mb-2 flex items-center gap-2">
                <span className="text-primary">{ICON_MAP.zap}</span>
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Experience */}
      <AnimatedSection id="experience" className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">{t.experience.title}</h2>
        <div className="space-y-8">
          {EXPERIENCE_ENTRIES.map((key, idx) => {
            const exp = t.experience[key]
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="bg-card border border-border rounded-xl p-6 md:p-8 hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <h3 className="font-display text-xl font-bold">{exp.company}</h3>
                    <p className="text-gradient-theme font-medium">{exp.role}</p>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 md:mt-0 md:text-right">
                    <p>{exp.location}</p>
                    <p>{exp.period}</p>
                  </div>
                </div>
                <ul className="space-y-2 mt-4">
                  {exp.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-1 shrink-0">▸</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>
      </AnimatedSection>

      {/* Projects */}
      <AnimatedSection id="projects" className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">{t.projects.title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {t.projects.items.map((project, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-display text-lg font-semibold">{project.title}</h3>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0 ml-2">
                  {project.badge}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 flex-1">{project.desc}</p>
              <div className="flex flex-wrap gap-2">
                {project.tech.map((tech, j) => (
                  <span key={j} className="px-2 py-0.5 text-xs rounded bg-muted/50 text-muted-foreground border border-border/50">
                    {tech}
                  </span>
                ))}
              </div>
              {project.link && (
                <a href={project.link.startsWith('http') ? project.link : `https://${project.link}`} target="_blank" rel="noopener noreferrer" className="mt-3 text-sm text-primary hover:underline flex items-center gap-1">
                  {project.link} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Accomplishments */}
      <AnimatedSection id="accomplishments" className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">{t.speaking.title}</h2>
        <div className="space-y-6">
          {t.speaking.items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <span className="text-sm text-muted-foreground">{item.year}</span>
              </div>
              <p className="text-sm text-primary font-medium mb-2">{item.event}</p>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Education */}
      <AnimatedSection id="education" className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">{t.education.title}</h2>
        <div className="space-y-6">
          {t.education.items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <span className="text-sm text-muted-foreground">{item.year}</span>
              </div>
              <p className="text-sm text-primary font-medium mb-2">{item.org}</p>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Publications */}
      <AnimatedSection className="max-w-5xl mx-auto px-6 py-8 md:py-12">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">{t.publications.title}</h2>
        <div className="space-y-4">
          {t.publications.items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                <h3 className="font-display text-base font-semibold">{item.title}</h3>
                <span className="text-sm text-muted-foreground">{item.year}</span>
              </div>
              <p className="text-sm text-primary font-medium mb-2">{item.org}</p>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                View publication <ExternalLink className="w-3 h-3" />
              </a>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Tech Stack */}
      <AnimatedSection id="tech" className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">{t.techStack.title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {t.techStack.categories.map((cat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
            >
              <h3 className="font-display text-sm font-semibold text-primary mb-3">{cat.name}</h3>
              <div className="flex flex-wrap gap-2">
                {cat.items.map((item, j) => (
                  <span key={j} className="px-2 py-1 text-xs rounded bg-muted/50 text-muted-foreground border border-border/50">
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Skills */}
      <AnimatedSection className="max-w-5xl mx-auto px-6 py-8 md:py-12">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">{t.skills.title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-sm font-semibold text-primary mb-4">{t.skills.technical}</h3>
            <div className="flex flex-wrap gap-2">
              {t.skills.technicalSkills.map((skill, i) => (
                <span key={i} className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display text-sm font-semibold text-primary mb-4">{t.skills.soft}</h3>
            <div className="flex flex-wrap gap-2">
              {t.skills.softSkills.map((skill, i) => (
                <span key={i} className="px-3 py-1 text-xs font-medium rounded-full bg-accent/10 text-foreground border border-border/50">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t.skills.english}:</span> {t.skills.professional}
          </p>
        </div>
      </AnimatedSection>

      {/* CTA / Contact */}
      <AnimatedSection id="contact" className="max-w-3xl mx-auto px-6 py-16 md:py-24 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">{t.cta.title}</h2>
        <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl mx-auto">{t.cta.desc}</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <a href={`mailto:${t.email}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-theme text-white font-medium hover:brightness-110 transition-all shadow-lg shadow-primary/25">
            <Mail className="w-5 h-5" /> {t.cta.contact}
          </a>
          <a href="https://linkedin.com/in/ayazziaansari" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border font-medium hover:border-primary/50 transition-colors">
            <LinkedInLogo className="w-5 h-5" /> LinkedIn
          </a>
          <a href="https://github.com/Ayazzia01" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border font-medium hover:border-primary/50 transition-colors">
            <Github className="w-5 h-5" /> GitHub
          </a>
        </div>
      </AnimatedSection>
    </main>
  )
}

export default App