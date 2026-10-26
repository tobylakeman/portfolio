// react-bits.jsx — React Bits components for octobiamedia.com.au
//
// Source: React Bits (https://reactbits.dev, github.com/DavidHDev/react-bits, MIT).
// Adapted for this site's setup (React + Babel from a CDN, no npm build):
//   * npm imports are swapped for globals loaded in the page
//     (React, gsap + ScrollTrigger + SplitText, Motion = framer-motion UMD).
//   * SplitText, SpotlightCard, Magnet, ShinyText and ClickSpark take an
//     existing element via `target` instead of rendering their own markup,
//     so the page HTML, SEO text and styles stay exactly as written.
//   * CountUp and ScrollVelocity are unchanged apart from imports and are
//     mounted into the page with portals.
// Each component is wrapped in its own scope so helper names never clash.
// The hook-up for each page lives at the bottom of this file.

(function () {
const {
  useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo, useId,
  forwardRef, useImperativeHandle
} = React;

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const GSAPSplitText = window.SplitText;
const Motion = window.Motion;

if (!gsap || !ScrollTrigger || !GSAPSplitText || !Motion) {
  console.warn('[React Bits] Animation libraries did not load; leaving the page static.');
  document.documentElement.classList.remove('rb-pending');
  return;
}
gsap.registerPlugin(ScrollTrigger, GSAPSplitText);

const {
  animate, cubicBezier, useInView, motion, useAnimationFrame, useMotionValue,
  useReducedMotion, useScroll, useSpring, useTransform, useVelocity
} = Motion;

// Minimal stand-in for useGSAP from @gsap/react: runs the callback inside a
// gsap.context and reverts everything it created on cleanup.
function useGSAP(callback, config) {
  const deps = (config && config.dependencies) || [];
  useLayoutEffect(() => {
    let cleanup;
    const ctx = gsap.context(() => {
      cleanup = callback();
    });
    return () => {
      if (typeof cleanup === 'function') cleanup();
      ctx.revert();
    };
  }, deps);
}

// ---------- SplitText ----------
const SplitText = (() => {

const DEFAULT_FROM = { opacity: 0, y: 40 };
const DEFAULT_TO = { opacity: 1, y: 0 };
const STIFFNESS = 180;
const DAMPING = 19;
const KICK = 0.024;

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const fontsAreLoaded = () => typeof document !== 'undefined' && (!document.fonts || document.fonts.status === 'loaded');

const waveEase = t => 1 - Math.cos(t * Math.PI * 1.5) * Math.pow(1 - t, 1.2);

const getEffect = (effect, em) => {
  switch (effect) {
    case 'fade':
      return { from: { opacity: 0 }, to: { opacity: 1 }, ease: 'power2.inOut' };
    case 'blur':
      return {
        from: { opacity: 0, filter: `blur(${Math.round(em * 1.4) / 10}px)` },
        to: { opacity: 1, filter: 'blur(0px)' },
        ease: 'power2.out'
      };
    case 'flip': {
      const setup = { transformPerspective: em * 6, transformOrigin: '50% 100%' };
      return {
        from: { ...setup, opacity: 0, rotationX: -90 },
        to: { ...setup, opacity: 1, rotationX: 0 },
        ease: 'power3.out'
      };
    }
    case 'pop':
      return { from: { opacity: 0, scale: 0 }, to: { opacity: 1, scale: 1 }, ease: 'back.out(1.6)' };
    case 'skew':
      return {
        from: { transformOrigin: '50% 100%', opacity: 0, x: -em * 0.4, skewX: -24 },
        to: { transformOrigin: '50% 100%', opacity: 1, x: 0, skewX: 0 },
        ease: 'expo.out'
      };
    case 'wave':
      return { from: { opacity: 0, y: em * 0.45 }, to: { opacity: 1, y: 0 }, ease: waveEase };
    default:
      return { from: { ...DEFAULT_FROM }, to: { ...DEFAULT_TO }, ease: 'power3.out' };
  }
};

const SplitText = ({
  target,
  className = '',
  delay = 50,
  duration = 1.25,
  ease,
  splitType = 'chars',
  from,
  to,
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  tag = 'p',
  staggerFrom = 'start',
  mask = false,
  effect = 'rise',
  trigger = 'view',
  loop = false,
  loopDelay = 1.5,
  hoverEffect = 'none',
  color,
  accentColor,
  onLetterAnimationComplete
}) => {
  // Adapted: animate an existing element instead of rendering one.
  const ref = useRef(target);
  ref.current = target;
  const text = target ? target.textContent : '';
  const completedTextRef = useRef(null);
  const onCompleteRef = useRef(onLetterAnimationComplete);
  const liveRef = useRef({ trigger, hoverEffect, accentColor });
  const [fontsLoaded, setFontsLoaded] = useState(fontsAreLoaded);
  const [ready, setReady] = useState(false);

  useIsoLayoutEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
    liveRef.current = { trigger, hoverEffect, accentColor };
  });

  useEffect(() => {
    if (fontsLoaded) return undefined;
    let active = true;
    document.fonts.ready.then(() => {
      if (active) setFontsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [fontsLoaded]);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !text || !fontsLoaded) return;
      el.getBoundingClientRect();
      if (!fontsAreLoaded()) {
        setFontsLoaded(false);
        return;
      }

      const finish = () => {
        if (completedTextRef.current === text) return;
        completedTextRef.current = text;
        onCompleteRef.current?.();
      };

      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        setReady(true);
        finish();
        return;
      }

      const startPct = (1 - threshold) * 100;
      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
      const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
      const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
      const sign =
        marginValue === 0
          ? ''
          : marginValue < 0
            ? `-=${Math.abs(marginValue)}${marginUnit}`
            : `+=${marginValue}${marginUnit}`;
      const start = `top ${startPct}%${sign}`;
      const unit = splitType.includes('chars') ? 'chars' : splitType.includes('words') ? 'words' : 'lines';

      const em = parseFloat(getComputedStyle(el).fontSize) || 16;
      const custom = from !== undefined || to !== undefined;
      const look = getEffect(effect, em);
      const fromVars = custom ? { ...(from || DEFAULT_FROM) } : look.from;
      const toVars = custom ? { ...(to || DEFAULT_TO) } : look.to;
      const easing = ease || (custom ? 'power3.out' : look.ease);
      const settle = custom ? 'willChange' : 'transform,filter,willChange';
      const exit = Math.max(0.35, duration * 0.55);

      let pieces = [];
      let movers = [];
      let order = gsap.utils.distribute({ each: delay / 1000, from: staggerFrom });
      let revealed = completedTextRef.current === text;
      let intro = null;
      let busy = null;
      let queued = null;
      let raf = 0;
      let last = 0;
      let centers = null;
      const lift = em * 0.2;
      const springs = [];
      const kicks = [];
      const pointer = { x: 0, y: 0, inside: false };

      const reveal = (initial, vars) => {
        const accent = liveRef.current.accentColor;
        const tl = gsap.timeline(vars);
        tl.fromTo(
          pieces,
          { ...fromVars, willChange: 'transform, opacity' },
          { ...toVars, duration, ease: easing, stagger: order, immediateRender: initial },
          0
        );
        if (accent) {
          tl.fromTo(
            pieces,
            { color: accent },
            {
              color: getComputedStyle(el).color,
              duration: duration * 0.7,
              ease: 'power1.inOut',
              stagger: order,
              immediateRender: initial
            },
            duration * 0.3
          );
        }
        tl.set(pieces, { clearProps: accent ? `${settle},color` : settle });
        return tl;
      };

      const conceal = () => {
        const accent = liveRef.current.accentColor;
        const tl = gsap.timeline();
        tl.fromTo(
          pieces,
          { ...toVars, willChange: 'transform, opacity' },
          { ...fromVars, duration: exit, ease: 'power2.in', stagger: order, immediateRender: false },
          0
        );
        if (accent) tl.to(pieces, { color: accent, duration: exit, ease: 'power1.in', stagger: order }, 0);
        return tl;
      };

      const cycle = () => {
        if (busy || !revealed || !pieces.length) return;
        queued?.kill();
        queued = null;
        busy = gsap
          .timeline({
            onComplete: () => {
              busy = null;
              queue();
            }
          })
          .add(conceal(), 0)
          .add(reveal(false), exit);
      };

      const queue = () => {
        queued?.kill();
        queued = loop ? gsap.delayedCall(loopDelay, cycle) : null;
      };

      const measure = () => {
        const box = el.getBoundingClientRect();
        centers = movers.map((node, i) => {
          const rect = node.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2 - box.left,
            y: rect.top + rect.height / 2 - box.top - (springs[i]?.y || 0)
          };
        });
      };

      const tick = now => {
        raf = 0;
        const dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000));
        last = now;
        const spots = liveRef.current.hoverEffect === 'lift' && pointer.inside && revealed ? centers : null;
        const radius = em * 1.15;
        let moving = false;
        for (let k = kicks.length - 1; k >= 0; k--) {
          if (now < kicks[k].at) continue;
          const spring = springs[kicks[k].index];
          if (spring) spring.v -= kicks[k].velocity;
          kicks.splice(k, 1);
        }
        movers.forEach((node, i) => {
          const spring = springs[i] || (springs[i] = { y: 0, v: 0 });
          const spot = spots?.[i];
          let target = 0;
          if (spot) {
            const dx = (spot.x - pointer.x) / radius;
            const dy = (spot.y - pointer.y) / (radius * 1.4);
            target = -lift * Math.exp(-(dx * dx + dy * dy) * 0.5);
          }
          spring.v += (STIFFNESS * (target - spring.y) - DAMPING * spring.v) * dt;
          spring.y += spring.v * dt;
          if (Math.abs(target - spring.y) < 0.02 && Math.abs(spring.v) < 0.05) {
            spring.y = target;
            spring.v = 0;
          } else {
            moving = true;
          }
          node.style.translate = Math.abs(spring.y) > 0.01 ? `0 ${spring.y.toFixed(2)}px` : '';
        });
        if (moving || kicks.length) raf = requestAnimationFrame(tick);
      };

      const wake = () => {
        if (raf) return;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      };

      const locate = e => {
        const box = el.getBoundingClientRect();
        pointer.x = e.clientX - box.left;
        pointer.y = e.clientY - box.top;
      };

      const onEnter = e => {
        locate(e);
        pointer.inside = true;
        if (!revealed) return;
        const live = liveRef.current;
        if (live.trigger === 'hover') cycle();
        if (live.hoverEffect === 'none') return;
        measure();
        if (live.hoverEffect === 'wave') {
          const now = performance.now();
          const speed = em * 9;
          const velocity = (em * 0.16) / KICK;
          centers.forEach((center, index) => {
            kicks.push({ index, velocity, at: now + (Math.abs(center.x - pointer.x) / speed) * 1000 });
          });
        }
        wake();
      };

      const onMove = e => {
        locate(e);
        pointer.inside = true;
        if (!revealed || liveRef.current.hoverEffect !== 'lift') return;
        if (!centers) measure();
        wake();
      };

      const onLeave = () => {
        pointer.inside = false;
        wake();
      };

      const onClick = () => {
        if (liveRef.current.trigger === 'click') cycle();
      };

      const splitInstance = new GSAPSplitText(el, {
        type: splitType,
        smartWrap: true,
        autoSplit: splitType === 'lines',
        mask: mask ? unit : undefined,
        linesClass: 'split-line',
        wordsClass: 'split-word',
        charsClass: 'split-char',
        reduceWhiteSpace: false,
        onSplit: self => {
          pieces = [self[unit], self.chars, self.words, self.lines].find(list => list.length) || [];
          movers = mask && self.masks?.length === pieces.length ? self.masks : pieces;
          order = gsap.utils.distribute({ each: delay / 1000, from: staggerFrom });
          centers = null;
          springs.length = 0;
          kicks.length = 0;
          if (busy && busy !== intro) {
            busy.kill();
            busy = null;
          }
          if (revealed) return undefined;
          intro = reveal(true, {
            scrollTrigger:
              trigger === 'load'
                ? undefined
                : { trigger: el, start, once: true, fastScrollEnd: true, anticipatePin: 0.4 },
            onComplete: () => {
              revealed = true;
              intro = null;
              busy = null;
              finish();
              queue();
            }
          });
          busy = intro;
          return intro;
        }
      });
      setReady(true);
      if (revealed) queue();

      el.addEventListener('pointerenter', onEnter);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
      el.addEventListener('click', onClick);

      return () => {
        cancelAnimationFrame(raf);
        queued?.kill();
        busy?.kill();
        el.removeEventListener('pointerenter', onEnter);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
        el.removeEventListener('click', onClick);
        movers.forEach(node => {
          node.style.translate = '';
        });
        ScrollTrigger.getAll().forEach(st => {
          if (st.trigger === el) st.kill();
        });
        splitInstance.revert();
      };
    },
    {
      dependencies: [
        text,
        delay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin,
        staggerFrom,
        mask,
        effect,
        trigger,
        loop,
        loopDelay,
        fontsLoaded
      ],
      scope: ref,
      revertOnUpdate: true
    }
  );

  useIsoLayoutEffect(() => {
    if (target) target.style.visibility = ready ? 'visible' : 'hidden';
  }, [target, ready]);

  // Failsafe: never leave a heading hidden if fonts or GSAP stall.
  useEffect(() => {
    if (ready) return undefined;
    const safety = setTimeout(() => setReady(true), 4000);
    return () => clearTimeout(safety);
  }, [ready]);

  return null;
};

return SplitText;
})();

// ---------- CountUp ----------
const CountUp = (() => {
const CELL = 1.2;
const STAGGER = 0.07;
const UNITS = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K']
];
const SLOT_STYLE = { display: 'inline-block', height: `${CELL}em`, lineHeight: `${CELL}em` };
const SR_ONLY = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0
};

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const clamp01 = value => Math.min(1, Math.max(0, value));
const smooth = (edge0, edge1, value) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const mod10 = value => ((value % 10) + 10) % 10;

const makeSpring = overshoot => {
  const log = Math.log(Math.min(0.5, Math.max(0.001, overshoot)));
  const zeta = -log / Math.sqrt(Math.PI * Math.PI + log * log);
  const damped = Math.PI / 0.52;
  const natural = damped / Math.sqrt(1 - zeta * zeta);
  const raw = t =>
    1 - Math.exp(-zeta * natural * t) * (Math.cos(damped * t) + ((zeta * natural) / damped) * Math.sin(damped * t));
  const residual = 1 - raw(1);
  return t => (t >= 1 ? 1 : raw(t) + residual * t * t * t);
};

const EASINGS = {
  linear: t => t,
  easeOut: cubicBezier(0.33, 1, 0.68, 1),
  expo: t => (t >= 1 ? 1 : (1 - Math.pow(2, -10 * t)) / (1 - Math.pow(2, -10))),
  spring: makeSpring(0.06)
};

const getDecimalPlaces = num => {
  const str = num.toString();

  if (str.includes('.')) {
    const decimals = str.split('.')[1];

    if (parseInt(decimals) !== 0) {
      return decimals.length;
    }
  }

  return 0;
};

const unitFor = value => UNITS.find(([size]) => Math.abs(value) >= size * 0.9995) || [1, ''];

const scaleFor = (value, compact, decimals, places) => {
  if (!compact) return { size: 1, label: '', digits: places };
  const [size, label] = unitFor(value);
  const digits = decimals ?? (label ? (Math.abs(value) / size < 100 ? 1 : 0) : places);
  return { size, label, digits };
};

const splitNumber = (value, digits, size) => {
  const fixed = (Math.abs(value) / size).toFixed(digits);
  const [int, frac = ''] = fixed.split('.');
  return { negative: value < 0 && Number(fixed) !== 0, int, frac };
};

const group = (int, separator) => (separator ? int.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : int);

const buildRoll = (a, b, spin, { compact, decimals, places, separator }) => {
  const { size, label, digits } = scaleFor(b, compact, decimals, places);
  const pa = splitNumber(a, digits, size);
  const pb = splitNumber(b, digits, size);
  const length = Math.max(pa.int.length, pb.int.length);
  const slots = [];
  const columns = [];
  if (pa.negative || pb.negative) slots.push({ char: '-', enter: !pa.negative, leave: !pb.negative });
  const digitAt = (parts, place) => {
    if (place < 0) return Number(parts.frac[-place - 1]);
    const index = parts.int.length - 1 - place;
    return index >= 0 ? Number(parts.int[index]) : null;
  };
  for (let place = length - 1; place >= -digits; place--) {
    if (place === -1) slots.push({ char: '.' });
    const start = digitAt(pa, place);
    const end = digitAt(pb, place);
    const column = {
      slot: slots.length,
      index: columns.length,
      place,
      from: start ?? 0,
      to: end ?? 0,
      enter: start === null,
      leave: end === null
    };
    slots.push(column);
    columns.push(column);
    if (separator && place > 0 && place % 3 === 0) slots.push({ char: separator, follow: column.index });
  }
  const up = spin || b >= a;
  columns.forEach((column, index) => {
    const rank = columns.length - 1 - index;
    const base = up ? mod10(column.to - column.from) : -mod10(column.from - column.to);
    const turns = spin
      ? Math.max(1, 3 - rank)
      : Math.min(Math.floor(Math.abs(b - a) / (size * 10 ** (column.place + 1))), Math.max(0, 3 - rank));
    column.delta = base + (up ? 10 : -10) * turns;
  });
  return { slots, columns, label };
};

function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  style,
  startWhen = true,
  separator = '',
  prefix = '',
  suffix = '',
  mode = 'count',
  easing = 'easeOut',
  decimals,
  format = 'standard',
  trigger = 'view',
  replayOnHover = false,
  onStart,
  onEnd
}) {
  const ref = useRef(null);
  const textRef = useRef(null);
  const slotRefs = useRef([]);
  const filterRefs = useRef([]);
  const uid = useId().replace(/[^\w-]/g, '');
  const startValue = direction === 'down' ? to : from;
  const endValue = direction === 'down' ? from : to;
  const valueRef = useRef(startValue);
  const startedRef = useRef(false);
  const runningRef = useRef(false);
  const [play, setPlay] = useState(null);
  const isInView = useInView(ref, { once: true, margin: '0px' });
  const active = trigger === 'load' || isInView;
  const compact = format === 'compact';
  const places = decimals ?? Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    latest => {
      const { size, label, digits } = scaleFor(latest, compact, decimals, places);
      const parts = splitNumber(latest, digits, size);
      const body = `${parts.negative ? '-' : ''}${group(parts.int, separator)}${parts.frac ? `.${parts.frac}` : ''}`;
      return `${prefix}${body}${label}${suffix}`;
    },
    [compact, decimals, places, separator, prefix, suffix]
  );

  const model = useMemo(() => {
    if (mode !== 'roll') return null;
    const a = play ? play.from : startValue;
    const b = play ? play.to : endValue;
    return buildRoll(a, b, !!play?.spin, { compact, decimals, places, separator });
  }, [mode, play, startValue, endValue, compact, decimals, places, separator]);

  const [initialText] = useState(() => formatValue(startValue));
  const latestRef = useRef(null);

  useIsoLayoutEffect(() => {
    latestRef.current = {
      formatValue,
      onStart,
      onEnd,
      model,
      mode,
      easing,
      duration: Math.max(0, duration),
      delay
    };
  });

  useIsoLayoutEffect(() => {
    if (!startedRef.current) valueRef.current = startValue;
    if (mode === 'count' && !runningRef.current && textRef.current) {
      textRef.current.textContent = formatValue(valueRef.current);
    }
  }, [mode, startValue, formatValue]);

  useEffect(() => {
    if (!active || !startWhen) return;
    startedRef.current = true;
    setPlay(previous => ({
      id: (previous?.id || 0) + 1,
      from: valueRef.current,
      to: endValue,
      spin: false,
      wait: true
    }));
  }, [active, startWhen, endValue]);

  useEffect(() => {
    if (!play) return undefined;
    const live = latestRef.current;
    const ease = EASINGS[live.easing] || EASINGS.easeOut;
    const total = live.duration;
    const progress = t => (total > 0 ? clamp01(t / total) : 1);
    let render;

    if (live.mode === 'roll' && live.model && ref.current) {
      const { columns: layout, slots } = live.model;
      const fontSize = parseFloat(getComputedStyle(ref.current).fontSize) || 16;
      const cell = CELL * fontSize;
      const stagger = layout.length > 1 ? Math.min(STAGGER, (total * 0.4) / (layout.length - 1)) : 0;
      const span = Math.max(0.001, total - stagger * (layout.length - 1));
      const columns = layout.map(column => {
        const box = slotRefs.current[column.slot];
        const strip = box?.firstChild;
        return {
          ...column,
          box,
          strip,
          blur: filterRefs.current[column.index],
          cells: strip ? Array.from(strip.childNodes, node => node.firstChild) : [],
          width: box ? box.scrollWidth : 0,
          ease:
            live.easing === 'spring'
              ? makeSpring(Math.min(0.12, Math.max(0.01, 0.35 / Math.max(1, Math.abs(column.delta)))))
              : ease,
          base: Math.floor(column.from),
          sigma: 0,
          presence: column.enter ? 0 : 1
        };
      });
      const marks = slots
        .map((slot, index) => ({ ...slot, node: slotRefs.current[index] }))
        .filter(slot => slot.char !== undefined && slot.node && (slot.enter || slot.leave || slot.follow !== undefined))
        .map(slot => ({ ...slot, width: slot.node.scrollWidth }));

      const fade = (node, width, presence, settled) => {
        if (!node) return;
        node.style.width = settled ? '' : `${(presence * width).toFixed(2)}px`;
        node.style.opacity = settled ? '' : presence.toFixed(3);
      };

      render = t => {
        columns.forEach((column, index) => {
          if (!column.strip) return;
          const u = clamp01((t - index * stagger) / span);
          const pos = column.from + column.delta * column.ease(u);
          const base = Math.floor(pos);
          if (base !== column.base) {
            column.base = base;
            column.cells.forEach((node, offset) => {
              if (node) node.nodeValue = String(mod10(base + offset - 1));
            });
          }
          column.strip.style.transform = `translateY(${(-(1 + pos - base) * CELL).toFixed(4)}em)`;

          const u0 = Math.max(0, u - 0.004);
          const u1 = Math.min(1, u + 0.004);
          const speed =
            u1 > u0 ? (Math.abs(column.delta) * Math.abs(column.ease(u1) - column.ease(u0))) / (u1 - u0) / span : 0;
          const sigma = u > 0 && u < 1 ? Math.min(cell * 0.05, (speed * cell) / 600) : 0;
          if (Math.abs(sigma - column.sigma) > 0.05 || (sigma === 0 && column.sigma !== 0)) {
            column.sigma = sigma;
            if (sigma > 0.2 && column.blur) {
              column.blur.setAttribute('stdDeviation', `0 ${sigma.toFixed(2)}`);
              column.strip.style.filter = `url(#${uid}-${index})`;
            } else {
              column.strip.style.filter = '';
            }
          }

          if (column.enter || column.leave) {
            column.presence = column.enter ? smooth(0, 0.45, u) : 1 - smooth(0.55, 1, u);
            fade(column.box, column.width, column.presence, column.enter && u >= 1);
          }
        });

        const overall = progress(t);
        marks.forEach(mark => {
          if (mark.follow !== undefined) {
            const column = columns[mark.follow];
            if (column && (column.enter || column.leave))
              fade(mark.node, mark.width, column.presence, column.enter && column.presence >= 1);
          } else {
            const presence = mark.enter ? smooth(0, 0.3, overall) : 1 - smooth(0.7, 1, overall);
            fade(mark.node, mark.width, presence, !!mark.enter && overall >= 1);
          }
        });

        valueRef.current = play.from + (play.to - play.from) * ease(overall);
      };
    } else {
      render = t => {
        const value = play.from + (play.to - play.from) * ease(progress(t));
        valueRef.current = value;
        if (textRef.current) textRef.current.textContent = latestRef.current.formatValue(value);
      };
    }

    runningRef.current = true;
    if (typeof live.onStart === 'function') live.onStart();

    const finish = () => {
      render(Infinity);
      valueRef.current = play.to;
      runningRef.current = false;
      if (typeof latestRef.current.onEnd === 'function') latestRef.current.onEnd();
    };

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return undefined;
    }

    const controls = animate(0, total, {
      duration: total,
      delay: play.wait ? live.delay : 0,
      ease: 'linear',
      onUpdate: render,
      onComplete: finish
    });

    return () => {
      controls.stop();
      runningRef.current = false;
    };
  }, [play, uid]);

  const replay = () => {
    if (!replayOnHover || runningRef.current || !startedRef.current) return;
    setPlay(previous =>
      mode === 'roll'
        ? { id: (previous?.id || 0) + 1, from: valueRef.current, to: valueRef.current, spin: true }
        : { id: (previous?.id || 0) + 1, from: startValue, to: endValue, spin: false }
    );
  };

  const finalText = formatValue(play ? play.to : endValue);

  return (
    <span
      className={className}
      ref={ref}
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}
      onPointerEnter={replayOnHover ? replay : undefined}
    >
      {model ? (
        <>
          <span
            key={`roll-${play?.id || 0}`}
            aria-hidden="true"
            style={{ display: 'inline-flex', whiteSpace: 'pre', userSelect: 'none' }}
          >
            {prefix && <span style={SLOT_STYLE}>{prefix}</span>}
            {model.slots.map((slot, index) => {
              const hidden =
                slot.char !== undefined
                  ? slot.enter || (slot.follow !== undefined && model.columns[slot.follow].enter)
                  : slot.enter;
              const collapsed = hidden ? { width: 0, opacity: 0 } : null;
              if (slot.char !== undefined) {
                return (
                  <span
                    key={index}
                    ref={node => {
                      slotRefs.current[index] = node;
                    }}
                    style={{ ...SLOT_STYLE, overflow: 'hidden', ...collapsed }}
                  >
                    {slot.char}
                  </span>
                );
              }
              return (
                <span
                  key={index}
                  ref={node => {
                    slotRefs.current[index] = node;
                  }}
                  style={{ ...SLOT_STYLE, position: 'relative', overflow: 'hidden', ...collapsed }}
                >
                  <span
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      transform: `translateY(${-CELL}em)`
                    }}
                  >
                    {[-1, 0, 1, 2].map(offset => (
                      <span key={offset} style={{ height: `${CELL}em` }}>
                        {mod10(slot.from + offset)}
                      </span>
                    ))}
                  </span>
                </span>
              );
            })}
            {model.label && <span style={SLOT_STYLE}>{model.label}</span>}
            {suffix && <span style={SLOT_STYLE}>{suffix}</span>}
          </span>
          <span style={SR_ONLY}>{finalText}</span>
          <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
            <defs>
              {model.columns.map(column => (
                <filter
                  key={column.index}
                  id={`${uid}-${column.index}`}
                  x="-20%"
                  y="-50%"
                  width="140%"
                  height="200%"
                  colorInterpolationFilters="sRGB"
                >
                  <feGaussianBlur
                    ref={node => {
                      filterRefs.current[column.index] = node;
                    }}
                    stdDeviation="0 0"
                  />
                </filter>
              ))}
            </defs>
          </svg>
        </>
      ) : (
        <span key="count" ref={textRef}>
          {initialText}
        </span>
      )}
    </span>
  );
}

return CountUp;
})();

// ---------- ScrollVelocity ----------
const ScrollVelocity = (() => {
const smootherstep = t => t * t * t * (t * (t * 6 - 15) + 10);

const FADE_STEPS = Array.from({ length: 9 }, (_, i) => i / 8);

const FADE_MASK = `linear-gradient(to right, ${[
  ...FADE_STEPS.map(t => `rgba(0, 0, 0, ${smootherstep(t).toFixed(3)}) ${(t * 12).toFixed(1)}%`),
  ...FADE_STEPS.map(t => `rgba(0, 0, 0, ${smootherstep(1 - t).toFixed(3)}) ${(88 + t * 12).toFixed(1)}%`)
].join(', ')})`;

const OUTLINE_STYLE = {
  WebkitTextFillColor: 'transparent',
  WebkitTextStroke: 'max(1px, 0.028em) currentColor'
};

function wrap(min, max, v) {
  const range = max - min;
  const mod = (((v - min) % range) + range) % range;
  return mod + min;
}

function useElementWidth(ref) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof ResizeObserver === 'undefined') {
      const updateWidth = () => setWidth(element.offsetWidth);
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

function VelocityText({
  children,
  baseVelocity,
  scrollContainerRef,
  className = '',
  damping,
  stiffness,
  numCopies,
  velocityMapping,
  parallaxClassName,
  scrollerClassName,
  parallaxStyle,
  scrollerStyle,
  separator,
  pauseOnHover,
  hoveredRef,
  skewWithVelocity,
  scaleWithVelocity,
  outline,
  gap,
  fontSize,
  fontWeight,
  color,
  draggable
}) {
  const baseX = useMotionValue(0);
  const skewX = useMotionValue(0);
  const scaleY = useMotionValue(1);
  const scrollOptions = scrollContainerRef ? { container: scrollContainerRef } : {};
  const { scrollY } = useScroll(scrollOptions);
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping, stiffness });
  const velocityFactor = useTransform(
    smoothVelocity,
    velocityMapping?.input || [0, 1000],
    velocityMapping?.output || [0, 5],
    { clamp: false }
  );
  const reduceMotion = useReducedMotion();

  const copyRef = useRef(null);
  const copyWidth = useElementWidth(copyRef);

  const x = useTransform(baseX, v => {
    if (copyWidth === 0) return '0px';
    return `${wrap(-copyWidth, 0, v)}px`;
  });

  const directionFactor = useRef(1);
  const pace = useRef(1);
  const fling = useRef(0);
  const drag = useRef({ active: false, pointerId: -1, lastX: 0, lastTime: 0, velocity: 0, travel: 0 });

  useAnimationFrame((t, delta) => {
    if (reduceMotion) return;

    const grab = drag.current;
    const seconds = Math.min(delta, 64) / 1000;
    const targetPace = grab.active || (pauseOnHover && hoveredRef.current) ? 0 : 1;
    pace.current += (targetPace - pace.current) * (1 - Math.exp(-delta / 150));

    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    let travel = moveBy * pace.current;

    if (!grab.active && fling.current !== 0) {
      travel += fling.current * seconds;
      fling.current *= Math.exp(-delta / 420);
      if (Math.abs(fling.current) < 4) fling.current = 0;
    }

    baseX.set(baseX.get() + travel);

    if (!skewWithVelocity && !scaleWithVelocity && skewX.get() === 0 && scaleY.get() === 1) return;

    const thrown = grab.active ? grab.velocity : fling.current;
    const scrollSurge = Math.tanh(Math.abs(smoothVelocity.get()) / 1600) * pace.current;
    const throwSurge = Math.tanh(Math.abs(thrown) / 2000);
    const surge = Math.max(scrollSurge, throwSurge);
    const heading =
      throwSurge > scrollSurge
        ? Math.sign(thrown)
        : Math.sign(travel) || directionFactor.current * Math.sign(baseVelocity);
    const ease = 1 - Math.exp(-delta / 110);
    const nextSkew = skewX.get() + (-heading * skewWithVelocity * surge - skewX.get()) * ease;
    const nextScale = scaleY.get() + (1 + scaleWithVelocity * surge - scaleY.get()) * ease;
    skewX.set(Math.abs(nextSkew) < 0.01 && !skewWithVelocity ? 0 : nextSkew);
    scaleY.set(Math.abs(nextScale - 1) < 0.0005 && !scaleWithVelocity ? 1 : nextScale);
  });

  const handlePointerDown = event => {
    if (!draggable || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const grab = drag.current;
    grab.active = true;
    grab.pointerId = event.pointerId;
    grab.lastX = event.clientX;
    grab.lastTime = event.timeStamp;
    grab.velocity = 0;
    grab.travel = 0;
    fling.current = 0;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.currentTarget.style.cursor = 'grabbing';
  };

  const handlePointerMove = event => {
    const grab = drag.current;
    if (!grab.active || event.pointerId !== grab.pointerId) return;
    const dx = event.clientX - grab.lastX;
    const dt = Math.max(event.timeStamp - grab.lastTime, 1);
    grab.lastX = event.clientX;
    grab.lastTime = event.timeStamp;
    grab.travel += Math.abs(dx);
    baseX.set(baseX.get() + dx);
    grab.velocity += ((dx / dt) * 1000 - grab.velocity) * (1 - Math.exp(-dt / 50));
  };

  const handlePointerUp = event => {
    const grab = drag.current;
    if (!grab.active || event.pointerId !== grab.pointerId) return;
    grab.active = false;
    const resting = event.timeStamp - grab.lastTime > 90;
    fling.current = resting ? 0 : Math.max(-5000, Math.min(5000, grab.velocity));
    grab.velocity = 0;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.currentTarget.style.cursor = 'grab';
  };

  const handleClickCapture = event => {
    if (drag.current.travel > 6) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const spans = [];
  for (let i = 0; i < numCopies; i++) {
    spans.push(
      <span
        className={className}
        key={i}
        ref={i === 0 ? copyRef : null}
        aria-hidden={i > 0 ? true : undefined}
        style={!separator && gap > 0 ? { paddingRight: gap } : undefined}
      >
        {children}&nbsp;
        {separator ? (
          <>
            <span style={gap > 0 ? { margin: `0 ${gap / 2}px` } : undefined}>{separator}</span>&nbsp;
          </>
        ) : null}
      </span>
    );
  }

  const typeStyle = {
    ...(fontSize !== undefined
      ? { fontSize: typeof fontSize === 'number' ? `${fontSize}px` : fontSize, lineHeight: 1 }
      : {}),
    ...(fontWeight !== undefined ? { fontWeight } : {}),
    ...(color ? { color } : {}),
    ...(outline ? OUTLINE_STYLE : {})
  };

  return (
    <div
      className={parallaxClassName}
      style={{
        ...(draggable ? { cursor: 'grab', userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'pan-y' } : {}),
        ...parallaxStyle
      }}
      onPointerDown={draggable ? handlePointerDown : undefined}
      onPointerMove={draggable ? handlePointerMove : undefined}
      onPointerUp={draggable ? handlePointerUp : undefined}
      onPointerCancel={draggable ? handlePointerUp : undefined}
      onClickCapture={draggable ? handleClickCapture : undefined}
    >
      <motion.div className={scrollerClassName} style={{ x, skewX, scaleY, ...typeStyle, ...scrollerStyle }}>
        {spans}
      </motion.div>
    </div>
  );
}

const ScrollVelocity = ({
  scrollContainerRef,
  texts = [],
  velocity = 100,
  className = '',
  damping = 50,
  stiffness = 400,
  numCopies = 6,
  velocityMapping = { input: [0, 1000], output: [0, 5] },
  parallaxClassName = 'parallax',
  scrollerClassName = 'scroller',
  parallaxStyle,
  scrollerStyle,
  separator = '',
  pauseOnHover = false,
  fadeEdges = false,
  skewWithVelocity = 0,
  scaleWithVelocity = 0,
  outlineAlternate = false,
  gap = 0,
  fontSize,
  fontWeight,
  color,
  draggable = false
}) => {
  const hoveredRef = useRef(false);

  return (
    <section
      style={{ width: '100%', ...(fadeEdges ? { WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK } : {}) }}
      onPointerEnter={() => {
        hoveredRef.current = true;
      }}
      onPointerLeave={() => {
        hoveredRef.current = false;
      }}
    >
      {texts.map((text, index) => (
        <VelocityText
          key={index}
          className={className}
          baseVelocity={index % 2 !== 0 ? -velocity : velocity}
          scrollContainerRef={scrollContainerRef}
          damping={damping}
          stiffness={stiffness}
          numCopies={numCopies}
          velocityMapping={velocityMapping}
          parallaxClassName={parallaxClassName}
          scrollerClassName={scrollerClassName}
          parallaxStyle={parallaxStyle}
          scrollerStyle={scrollerStyle}
          separator={separator}
          pauseOnHover={pauseOnHover}
          hoveredRef={hoveredRef}
          skewWithVelocity={skewWithVelocity}
          scaleWithVelocity={scaleWithVelocity}
          outline={outlineAlternate && index % 2 !== 0}
          gap={gap}
          fontSize={fontSize}
          fontWeight={fontWeight}
          color={color}
          draggable={draggable}
        >
          {text}
        </VelocityText>
      ))}
    </section>
  );
};

return ScrollVelocity;
})();

// ---------- SpotlightCard ----------
const SpotlightCard = (() => {
const THEMES = {
  dark: {
    surface: '#111111',
    border: 'rgba(255, 255, 255, 0.08)',
    shadow: '0 24px 48px -24px rgba(0, 0, 0, 0.6)',
    light: '#ffffff',
    fill: 1,
    edge: 1
  },
  light: {
    surface: '#ffffff',
    border: 'rgba(24, 24, 27, 0.1)',
    shadow: '0 1px 2px rgba(24, 24, 27, 0.04), 0 18px 40px -20px rgba(24, 24, 27, 0.16)',
    light: '#18181b',
    fill: 0.28,
    edge: 0.7
  }
};

const SHAPES = ['circle', 'beam'];

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const falloff = (color, softness) => {
  const soft = clamp(softness, 0, 1);
  const core = (1 - soft) ** 1.5 * 0.85;
  const stop = (alpha, at) =>
    `color-mix(in srgb, ${color} ${(alpha * 100).toFixed(2)}%, transparent) ${(at * 100).toFixed(2)}%`;
  const list = [stop(1, 0)];
  for (let i = 0; i <= 14; i++) {
    const t = core + ((1 - core) * i) / 14;
    const g = (t - core) / (1 - core);
    const smooth = 1 - g * g * (3 - 2 * g);
    const glow = Math.exp(-4.6 * g * g) * (1 - g ** 6);
    list.push(stop(smooth + (glow - smooth) * soft, t));
  }
  return list.join(', ');
};

const SpotlightCard = ({
  target,
  spotlightColor,
  intensity = 0.15,
  spotlightSize = 240,
  softness = 0.7,
  shape = 'circle',
  borderGlow = 0.6,
  proximity = 80,
  smoothing = 0.3,
  ambient = false,
  flare = true,
  grain = 0,
  theme = 'dark'
}) => {
  const rootRef = useRef(null);
  const lightRef = useRef(null);
  const grainRef = useRef(null);
  const edgeRef = useRef(null);
  const wakeRef = useRef(null);
  const palette = THEMES[theme] ?? THEMES.dark;
  const color = spotlightColor ?? palette.light;
  const form = SHAPES.includes(shape) ? shape : 'circle';
  const settings = {
    shape: form,
    fill: falloff(color, softness),
    edge: falloff(color, 1),
    size: Math.max(20, spotlightSize),
    intensity: clamp(intensity, 0, 1) * palette.fill,
    borderGlow: clamp(borderGlow, 0, 1) * palette.edge,
    proximity: Math.max(0, proximity),
    smoothing: clamp(smoothing, 0, 1),
    ambient,
    flare,
    grain: clamp(grain, 0, 1)
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    wakeRef.current?.();
  });

  useEffect(() => {
    // Adapted: add the light layers to an existing card.
    const root = target;
    if (!root) return undefined;
    const layer = cls => {
      const node = document.createElement('span');
      node.className = cls;
      node.setAttribute('aria-hidden', 'true');
      return node;
    };
    const light = layer('spotlight-card__light');
    const noise = layer('spotlight-card__grain');
    noise.style.backgroundImage = NOISE;
    const edge = layer('spotlight-card__edge');
    root.classList.add('rb-spotlight');
    root.prepend(light, noise);
    root.append(edge);

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const state = { x: 0, y: 0, presence: 0, flare: 0, time: Math.random() * 60, pressed: false, visible: true };
    const pointer = { x: 0, y: 0, active: false };
    const drawn = { light: '', edge: '', noise: '' };
    let focus = null;
    let raf = 0;
    let last = 0;
    let alive = true;

    const gradient = (s, size, x, y, stops) => {
      if (s.shape === 'beam') {
        const reach = Math.max(size * 0.6, y + size * 0.55);
        return `radial-gradient(${(size * 0.55).toFixed(1)}px ${reach.toFixed(1)}px at ${x.toFixed(1)}px 0px, ${stops})`;
      }
      return `radial-gradient(circle ${size.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, ${stops})`;
    };

    const paint = s => {
      const size = s.size * (1 + 0.2 * state.flare);
      const boost = 1 + 0.7 * state.flare;
      const fill = gradient(s, size, state.x, state.y, s.fill);
      const rim = gradient(s, size * 0.6, state.x, s.shape === 'beam' ? 0 : state.y, s.edge);
      if (fill !== drawn.light) {
        drawn.light = fill;
        light.style.background = fill;
      }
      if (rim !== drawn.edge) {
        drawn.edge = rim;
        edge.style.background = rim;
      }
      light.style.opacity = String(Math.min(1, state.presence * s.intensity * boost));
      edge.style.opacity = String(Math.min(1, state.presence * s.borderGlow * boost));
      const grainy = s.grain > 0 ? gradient(s, size, state.x, state.y, '#000 0%, transparent 100%') : 'none';
      if (grainy !== drawn.noise) {
        drawn.noise = grainy;
        noise.style.webkitMaskImage = grainy;
        noise.style.maskImage = grainy;
      }
      noise.style.opacity = String(state.presence * s.grain);
    };

    const tick = now => {
      raf = 0;
      if (!alive) return;
      const s = settingsRef.current;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const rect = root.getBoundingClientRect();
      let tx = state.x;
      let ty = state.y;
      let target = 0;
      if (focus && root.contains(focus)) {
        const box = focus.getBoundingClientRect();
        tx = box.left + box.width / 2 - rect.left;
        ty = box.top + box.height / 2 - rect.top;
        target = 1;
      } else if (pointer.active) {
        tx = pointer.x - rect.left;
        ty = pointer.y - rect.top;
        const gap = Math.hypot(Math.max(0, -tx, tx - rect.width), Math.max(0, -ty, ty - rect.height));
        if (gap === 0) target = 1;
        else if (s.proximity > 0) target = Math.max(0, 1 - gap / s.proximity) ** 2;
      }
      if (target < 0.6 && s.ambient && state.visible) {
        if (!reduce) state.time += dt;
        const drift = 0.6 - target;
        tx += (rect.width * (0.5 + 0.34 * Math.sin(state.time * 0.43)) - tx) * (drift / 0.6);
        ty += (rect.height * (0.5 + 0.3 * Math.sin(state.time * 0.61 + 1.3)) - ty) * (drift / 0.6);
        target = 0.6;
      }
      if (state.presence < 0.02 && target > 0 && !s.ambient) {
        state.x = tx;
        state.y = ty;
      }
      const follow = reduce || s.smoothing === 0 ? 1 : 1 - Math.exp(-dt / (0.015 + s.smoothing * 0.22));
      state.x += (tx - state.x) * follow;
      state.y += (ty - state.y) * follow;
      const fade = reduce ? 1 : 1 - Math.exp(-dt / (target > state.presence ? 0.1 : 0.32));
      state.presence += (target - state.presence) * fade;
      if (Math.abs(target - state.presence) < 0.002) state.presence = target;
      const press = state.pressed && s.flare && !reduce ? 1 : 0;
      state.flare += (press - state.flare) * (1 - Math.exp(-dt / (press ? 0.05 : 0.28)));
      if (Math.abs(press - state.flare) < 0.002) state.flare = press;
      paint(s);
      const moving = Math.abs(tx - state.x) > 0.1 || Math.abs(ty - state.y) > 0.1;
      const settled = !moving && state.presence === target && state.flare === press;
      if (!settled || (s.ambient && state.visible && !reduce)) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    wakeRef.current = wake;

    const onMove = event => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      if (state.presence > 0 || settingsRef.current.proximity > 0 || root.contains(event.target)) wake();
    };
    const onOut = event => {
      if (event.relatedTarget) return;
      pointer.active = false;
      wake();
    };
    const onDown = event => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      state.pressed = true;
      wake();
    };
    const onUp = event => {
      if (event.pointerType !== 'mouse') pointer.active = false;
      if (!state.pressed && event.pointerType === 'mouse') return;
      state.pressed = false;
      wake();
    };
    const onFocusIn = event => {
      if (!(event.target instanceof Element) || !event.target.matches(':focus-visible')) return;
      focus = event.target;
      wake();
    };
    const onFocusOut = event => {
      if (root.contains(event.relatedTarget)) return;
      focus = null;
      wake();
    };
    const onScroll = () => {
      if (pointer.active || state.presence > 0) wake();
    };

    const observer = new IntersectionObserver(entries => {
      state.visible = entries.some(entry => entry.isIntersecting);
      if (state.visible) wake();
    });
    observer.observe(root);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    document.addEventListener('pointerout', onOut);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    wake();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('scroll', onScroll, { capture: true });
      document.removeEventListener('pointerout', onOut);
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      wakeRef.current = null;
      light.remove();
      noise.remove();
      edge.remove();
      root.classList.remove('rb-spotlight');
    };
  }, [target]);

  return null;
};

return SpotlightCard;
})();

// ---------- Magnet ----------
const Magnet = (() => {
const DEFAULT_SPRING = { stiffness: 170, damping: 16, mass: 1 };

const smoothstep = (edge0, edge1, value) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const registry = new Set();
const field = { pointer: null, owner: null };
let detach = null;

const reach = (rect, pointer) => {
  const dx = pointer.x - (rect.left + rect.width / 2);
  const dy = pointer.y - (rect.top + rect.height / 2);
  const outside = Math.hypot(Math.max(0, Math.abs(dx) - rect.width / 2), Math.max(0, Math.abs(dy) - rect.height / 2));
  return { dx, dy, outside };
};

const arbitrate = () => {
  let winner = null;
  let nearest = Infinity;
  let closest = Infinity;
  for (const entry of registry) {
    const s = entry.settings.current;
    let near = null;
    if (field.pointer && !s.disabled && !entry.reduce) {
      near = reach(entry.wrapper.getBoundingClientRect(), field.pointer);
      if (near.outside > s.padding) near = null;
    }
    if (!s.exclusive) {
      if (near || entry.active) entry.wake();
      continue;
    }
    if (!near) continue;
    const center = Math.hypot(near.dx, near.dy);
    if (near.outside < nearest || (near.outside === nearest && center < closest)) {
      winner = entry;
      nearest = near.outside;
      closest = center;
    }
  }
  const previous = field.owner;
  field.owner = winner;
  if (previous && previous !== winner) previous.wake();
  if (winner) winner.wake();
};

const attach = () => {
  const onPointerMove = event => {
    if (event.pointerType === 'touch') return;
    field.pointer = { x: event.clientX, y: event.clientY };
    arbitrate();
  };
  const onLeave = () => {
    field.pointer = null;
    arbitrate();
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', arbitrate, { passive: true, capture: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);
  return () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('scroll', arbitrate, { capture: true });
    document.documentElement.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('blur', onLeave);
  };
};

const Magnet = ({
  target,
  padding = 100,
  disabled = false,
  magnetStrength = 2,
  maxOffset,
  exclusive = true,
  axis = 'both',
  tilt = 0,
  scale = 1,
  spring,
  onActiveChange,
}) => {
  const wrapperRef = useRef(null);
  const innerRef = useRef(null);
  const wakeRef = useRef(null);
  const settings = {
    padding: Math.max(0, padding),
    disabled,
    strength: Math.max(0.1, magnetStrength),
    maxOffset,
    exclusive,
    axis,
    tilt,
    scale,
    stiffness: Math.max(1, spring?.stiffness ?? DEFAULT_SPRING.stiffness),
    damping: Math.max(0, spring?.damping ?? DEFAULT_SPRING.damping),
    mass: Math.max(0.01, spring?.mass ?? DEFAULT_SPRING.mass),
    onActiveChange
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    // Adapted: wrap an existing element (wrapper stays put, inner moves).
    if (!target || !target.parentNode) return undefined;
    const wrapper = document.createElement('span');
    wrapper.className = 'rb-magnet';
    const inner = document.createElement('span');
    inner.className = 'rb-magnet__inner';
    target.parentNode.insertBefore(wrapper, target);
    inner.appendChild(target);
    wrapper.appendChild(inner);

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const current = { x: 0, y: 0, tiltX: 0, tiltY: 0, scale: 1 };
    const velocity = { x: 0, y: 0, tiltX: 0, tiltY: 0, scale: 0 };
    let active = false;
    let raf = 0;
    let last = 0;

    const solve = (target, dt) => {
      const s = settingsRef.current;
      let resting = true;
      Object.keys(current).forEach(key => {
        const force = s.stiffness * (target[key] - current[key]) - s.damping * velocity[key];
        velocity[key] += (force / s.mass) * dt;
        current[key] += velocity[key] * dt;
        const epsilon = key === 'scale' ? 0.001 : 0.05;
        if (Math.abs(target[key] - current[key]) > epsilon || Math.abs(velocity[key]) > epsilon) resting = false;
      });
      return resting;
    };

    const measure = () => {
      const s = settingsRef.current;
      const target = { x: 0, y: 0, tiltX: 0, tiltY: 0, scale: 1 };
      if (s.disabled || reduce || !field.pointer) return { target, engaged: false };
      if (s.exclusive && field.owner !== entry) return { target, engaged: false };
      const rect = wrapper.getBoundingClientRect();
      const { dx, dy, outside } = reach(rect, field.pointer);
      if (outside > s.padding) return { target, engaged: false };
      const pull = s.padding > 0 ? 1 - smoothstep(s.padding * 0.5, s.padding, outside) : 1;
      let x = s.axis === 'y' ? 0 : (dx / s.strength) * pull;
      let y = s.axis === 'x' ? 0 : (dy / s.strength) * pull;
      if (s.maxOffset !== undefined && s.maxOffset !== null) {
        const length = Math.hypot(x, y);
        if (length > s.maxOffset) {
          x *= s.maxOffset / length;
          y *= s.maxOffset / length;
        }
      }
      const nx = Math.max(-1, Math.min(1, dx / Math.max(rect.width / 2, 1)));
      const ny = Math.max(-1, Math.min(1, dy / Math.max(rect.height / 2, 1)));
      target.x = x;
      target.y = y;
      target.tiltX = -ny * s.tilt * pull;
      target.tiltY = nx * s.tilt * pull;
      target.scale = 1 + (s.scale - 1) * pull;
      return { target, engaged: true };
    };

    const apply = () => {
      const { x, y, tiltX, tiltY, scale } = current;
      const turned = Math.abs(tiltX) > 0.01 || Math.abs(tiltY) > 0.01;
      inner.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)${
        turned ? ` perspective(800px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)` : ''
      }${Math.abs(scale - 1) > 0.0005 ? ` scale(${scale.toFixed(4)})` : ''}`;
    };

    const frame = now => {
      raf = 0;
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      const { target, engaged } = measure();
      if (engaged !== active) {
        active = engaged;
        entry.active = engaged;
        if (engaged) wrapper.setAttribute('data-magnet-active', '');
        else wrapper.removeAttribute('data-magnet-active');
        settingsRef.current.onActiveChange?.(engaged);
      }
      const steps = Math.ceil(dt / (1 / 120));
      let resting = true;
      for (let i = 0; i < steps; i++) resting = solve(target, dt / steps);
      if (resting) {
        Object.keys(current).forEach(key => {
          current[key] = target[key];
          velocity[key] = 0;
        });
      }
      apply();
      if (!resting) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    function wake() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    const entry = { wrapper, settings: settingsRef, reduce, wake, active: false };
    registry.add(entry);
    if (!detach) detach = attach();
    wakeRef.current = () => {
      arbitrate();
      wake();
    };

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = null;
      registry.delete(entry);
      if (field.owner === entry) field.owner = null;
      if (!registry.size && detach) {
        detach();
        detach = null;
      }
      if (wrapper.parentNode) wrapper.parentNode.insertBefore(target, wrapper);
      wrapper.remove();
    };
  }, [target]);

  useEffect(() => {
    wakeRef.current?.();
  });

  return null;
};

return Magnet;
})();

// ---------- ShinyText ----------
const ShinyText = (() => {
const EASINGS = {
  linear: t => t,
  smooth: t => 0.5 - Math.cos(Math.PI * t) / 2,
  snappy: t => (t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2)
};
const TRIGGERS = ['loop', 'hover', 'view'];
const FALLOFF = [0, 0.2, 0.4, 0.6, 0.8, 1];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

let paint = null;

const parseColor = value => {
  if (typeof document === 'undefined') return null;
  if (!paint) paint = document.createElement('canvas').getContext('2d');
  if (!paint) return null;
  paint.fillStyle = '#000000';
  paint.fillStyle = value;
  const resolved = String(paint.fillStyle);
  if (resolved.startsWith('#')) {
    return [1, 3, 5].map(i => parseInt(resolved.slice(i, i + 2), 16)).concat(1);
  }
  const parts = resolved.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return null;
  return [Number(parts[0]), Number(parts[1]), Number(parts[2]), parts.length > 3 ? Number(parts[3]) : 1];
};

const blend = (from, to, amount) => {
  const channel = (a, b) =>
    Math.round(Math.pow(Math.pow(a / 255, 2.2) * (1 - amount) + Math.pow(b / 255, 2.2) * amount, 1 / 2.2) * 255);
  const alpha = from[3] * (1 - amount) + to[3] * amount;
  if (alpha <= 0) return 'rgba(0, 0, 0, 0)';
  const weigh = (a, b) => (a * from[3] * (1 - amount) + b * to[3] * amount) / alpha;
  const r = from[3] === to[3] ? channel(from[0], to[0]) : Math.round(weigh(from[0], to[0]));
  const g = from[3] === to[3] ? channel(from[1], to[1]) : Math.round(weigh(from[1], to[1]));
  const b = from[3] === to[3] ? channel(from[2], to[2]) : Math.round(weigh(from[2], to[2]));
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`;
};

const ShinyText = ({
  target,
  color = '#b5b5b5',
  shineColor = '#ffffff',
  speed = 2,
  delay = 0,
  angle = 120,
  shineWidth = 40,
  softness = 0.8,
  bands = 1,
  glow = 0,
  direction = 'left',
  easing = 'smooth',
  trigger = 'loop',
  yoyo = false,
  followPointer = false,
  pauseOnHover = false,
  disabled = false,
}) => {
  const rootRef = useRef(null);
  const glowRef = useRef(null);
  const settingsRef = useRef(null);
  const syncRef = useRef(null);

  settingsRef.current = {
    color,
    shineColor,
    speed: Math.max(0.1, speed),
    delay: Math.max(0, delay),
    angle,
    shineWidth: clamp(shineWidth, 2, 200),
    softness: clamp(softness, 0, 1),
    bands: clamp(Math.round(bands), 1, 3),
    glow: clamp(glow, 0, 1),
    sign: direction === 'right' ? 1 : -1,
    ease: EASINGS[easing] ?? EASINGS.smooth,
    trigger: TRIGGERS.includes(trigger) ? trigger : 'loop',
    yoyo,
    followPointer,
    pauseOnHover,
    disabled
  };

  useEffect(() => {
    syncRef.current?.();
  });

  useEffect(() => {
    // Adapted: shine an existing element's text.
    const root = target;
    if (!root) return undefined;
    root.classList.add('shiny-text');

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const state = {
      pos: null,
      vel: 0,
      phase: 'idle',
      from: 0,
      to: 0,
      start: 0,
      duration: 1,
      resume: 0,
      flip: false,
      inside: false,
      target: 0,
      visible: true,
      seen: false,
      colors: ''
    };
    let base = null;
    let shine = null;
    let clear = null;
    let raf = 0;
    let timer = 0;
    let last = 0;
    let alive = true;

    const extent = () => {
      const s = settingsRef.current;
      return s.shineWidth / 2 + (s.bands - 1) * s.shineWidth * 1.3 + 2;
    };
    const entry = () => (settingsRef.current.sign > 0 ? -extent() : 100 + extent());
    const exit = () => (settingsRef.current.sign > 0 ? 100 + extent() : -extent());
    const nearest = () => (state.target < 50 ? -extent() : 100 + extent());

    const gradient = (pos, fill) => {
      const s = settingsRef.current;
      const half = s.shineWidth / 2;
      const core = half * (1 - s.softness);
      const fade = half - core;
      const stops = [];
      for (let band = 0; band < s.bands; band++) {
        const center = pos - s.sign * band * s.shineWidth * 1.3;
        const strength = 1 - band * 0.28;
        for (const side of [-1, 1]) {
          for (const f of FALLOFF) {
            const at = center + side * (core + fade * (1 - f));
            const amount = f * f * (3 - 2 * f) * strength;
            stops.push([at, amount]);
          }
        }
      }
      stops.sort((a, b) => a[0] - b[0]);
      const list = stops.map(([at, amount]) => `${blend(fill, shine, amount)} ${at.toFixed(2)}%`);
      return `linear-gradient(${s.angle}deg, ${blend(fill, shine, 0)} 0%, ${list.join(', ')}, ${blend(fill, shine, 0)} 100%)`;
    };

    const draw = () => {
      const s = settingsRef.current;
      const key = `${s.color}|${s.shineColor}`;
      if (key !== state.colors) {
        state.colors = key;
        base = parseColor(s.color);
        shine = parseColor(s.shineColor);
        clear = shine ? [shine[0], shine[1], shine[2], 0] : null;
      }
      if (!base || !shine) {
        root.style.backgroundImage = `linear-gradient(${s.color}, ${s.color})`;
        return;
      }
      if (state.pos === null || s.disabled) {
        root.style.backgroundImage = `linear-gradient(${s.color}, ${s.color})`;
        if (glowRef.current) glowRef.current.style.backgroundImage = 'none';
        return;
      }
      root.style.backgroundImage = gradient(state.pos, base);
      if (glowRef.current) {
        glowRef.current.style.backgroundImage = gradient(state.pos, clear);
        glowRef.current.style.opacity = String(s.glow);
      }
    };

    const sweep = (from, to, now) => {
      const s = settingsRef.current;
      const span = Math.abs(exit() - entry()) || 1;
      state.phase = 'sweep';
      state.from = from;
      state.to = to;
      state.start = now;
      state.duration = s.speed * 1000 * Math.max(0.15, Math.abs(to - from) / span);
    };

    const wake = () => {
      if (raf || !alive) return;
      window.clearTimeout(timer);
      timer = 0;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const tick = now => {
      raf = 0;
      if (!alive) return;
      const s = settingsRef.current;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (s.disabled) {
        state.pos = null;
        state.phase = 'idle';
        draw();
        return;
      }
      const following = s.followPointer && state.inside;
      if (following) {
        if (state.pos === null) state.pos = nearest();
        const stiffness = 220;
        state.vel += ((state.target - state.pos) * stiffness - state.vel * 2 * Math.sqrt(stiffness)) * dt;
        state.pos += state.vel * dt;
        state.phase = 'follow';
        draw();
        raf = requestAnimationFrame(tick);
        return;
      }
      if (state.phase === 'follow') {
        state.vel = 0;
        sweep(state.pos ?? nearest(), nearest(), now);
      }
      if (state.phase === 'sweep') {
        if (s.pauseOnHover && state.inside) {
          state.start += dt * 1000;
          raf = requestAnimationFrame(tick);
          return;
        }
        const t = clamp((now - state.start) / state.duration, 0, 1);
        state.pos = state.from + (state.to - state.from) * s.ease(t);
        draw();
        if (t < 1) {
          raf = requestAnimationFrame(tick);
          return;
        }
        if (s.trigger !== 'loop' || reduce) {
          state.phase = 'idle';
          state.pos = null;
          draw();
          return;
        }
        state.phase = 'wait';
        state.resume = now + s.delay * 1000;
      }
      if (state.phase === 'wait') {
        if (!state.visible) return;
        if (now < state.resume) {
          window.clearTimeout(timer);
          timer = window.setTimeout(wake, state.resume - now);
          return;
        }
        if (s.yoyo) {
          state.flip = !state.flip;
          sweep(state.flip ? exit() : entry(), state.flip ? entry() : exit(), now);
        } else {
          sweep(entry(), exit(), now);
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      if (state.phase === 'idle' && s.trigger === 'loop' && !reduce && state.visible) {
        state.flip = false;
        sweep(entry(), exit(), now);
        raf = requestAnimationFrame(tick);
      }
    };

    const locate = event => {
      const s = settingsRef.current;
      const rect = root.getBoundingClientRect();
      const radians = (s.angle * Math.PI) / 180;
      const dx = Math.sin(radians);
      const dy = -Math.cos(radians);
      const length = Math.abs(rect.width * dx) + Math.abs(rect.height * dy) || 1;
      const along =
        (event.clientX - rect.left - rect.width / 2) * dx + (event.clientY - rect.top - rect.height / 2) * dy;
      return 50 + (along / length) * 100;
    };

    const onEnter = event => {
      const s = settingsRef.current;
      state.inside = true;
      state.target = locate(event);
      if (s.disabled) return;
      if (s.followPointer) {
        if (state.pos === null) state.pos = nearest();
      } else if (s.trigger === 'hover' && state.phase === 'idle' && !reduce) {
        sweep(entry(), exit(), performance.now());
      }
      wake();
    };
    const onMove = event => {
      state.target = locate(event);
      if (settingsRef.current.followPointer) wake();
    };
    const onLeave = () => {
      state.inside = false;
      wake();
    };

    const observer = new IntersectionObserver(entries => {
      const visible = entries.some(item => item.isIntersecting);
      state.visible = visible;
      const s = settingsRef.current;
      if (!visible) return;
      if (s.trigger === 'view' && !state.seen && !reduce && !s.disabled) {
        state.seen = true;
        sweep(entry(), exit(), performance.now());
      }
      wake();
    });
    observer.observe(root);

    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);

    syncRef.current = () => {
      const s = settingsRef.current;
      if (s.disabled) {
        state.pos = null;
        state.phase = 'idle';
      } else if (s.trigger !== 'loop' && state.phase === 'wait') {
        state.phase = 'idle';
        state.pos = null;
      }
      draw();
      wake();
    };
    draw();
    wake();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      observer.disconnect();
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      syncRef.current = null;
      root.classList.remove('shiny-text');
      root.style.backgroundImage = '';
    };
  }, [target]);

  return null;
};

return ShinyText;
})();

// ---------- ClickSpark ----------
const ClickSpark = (() => {
const EASINGS = {
  linear: t => t,
  'ease-in': t => t * t,
  'ease-out': t => 1 - Math.pow(1 - t, 3),
  'ease-in-out': t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  spring: t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2)
};

const SHAPES = ['line', 'streak', 'dot', 'star'];
const MAX_BURSTS = 32;
const GRAVITY = 500;
const REDUCED_MS = 320;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const toColors = value => {
  const list = (Array.isArray(value) ? value : [value]).filter(Boolean);
  return list.length ? list : ['#ffffff'];
};

const starPath = (ctx, x, y, radius, rotation) => {
  const pinch = radius * 0.16;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(rotation) * radius, y + Math.sin(rotation) * radius);
  for (let i = 1; i <= 4; i++) {
    const a = rotation + (i * Math.PI) / 2;
    const mid = a - Math.PI / 4;
    ctx.quadraticCurveTo(
      x + Math.cos(mid) * pinch,
      y + Math.sin(mid) * pinch,
      x + Math.cos(a) * radius,
      y + Math.sin(a) * radius
    );
  }
  ctx.closePath();
};

const channels = (ctx, color) => {
  ctx.fillStyle = color;
  const normal = String(ctx.fillStyle);
  const hex = /^#([0-9a-f]{6})$/i.exec(normal);
  if (hex) {
    const value = parseInt(hex[1], 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(normal);
  if (rgb)
    return rgb[1]
      .split(',')
      .slice(0, 3)
      .map(part => parseFloat(part));
  return [0, 0, 0];
};

const ClickSpark = forwardRef(
  (
    {
      sparkColor = '#fff',
      sparkSize = 14,
      sparkRadius = 30,
      sparkCount = 8,
      sparkWidth = 2,
      duration = 500,
      easing = 'ease-out',
      extraScale = 1,
      shape = 'line',
      randomness = 0.2,
      gravity = 0,
      spread = 360,
      direction = 0,
      glow = 0,
      ring = false,
      layer = 'front',
      disabled = false,
      className = '',
      style,
      children
    },
    ref
  ) => {
    const rootRef = useRef(null);
    const layerRef = useRef(null);
    const engineRef = useRef(null);
    const settings = {
      colors: toColors(sparkColor),
      size: Math.max(0, sparkSize),
      radius: Math.max(0, sparkRadius) * Math.max(0, extraScale),
      count: clamp(Math.round(sparkCount), 1, 64),
      width: Math.max(0.5, sparkWidth),
      duration: Math.max(60, duration),
      ease: EASINGS[easing] ?? EASINGS['ease-out'],
      shape: SHAPES.includes(shape) ? shape : 'line',
      randomness: clamp(randomness, 0, 1),
      gravity: Math.max(0, gravity),
      spread: clamp(spread, 0, 360),
      direction,
      glow: clamp(glow, 0, 1),
      ring,
      disabled
    };
    const settingsRef = useRef(settings);
    settingsRef.current = settings;

    useEffect(() => {
      // Adapted: listen page-wide, draw on a fixed overlay.
      const root = document.documentElement;
      const layer = document.createElement('div');
      layer.className = 'rb-click-spark';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const bursts = [];
      let raf = 0;
      let lastPress = { time: -1e9, x: 0, y: 0 };

      const drop = (s, seconds) => 0.5 * s.gravity * GRAVITY * seconds * seconds;

      const position = (burst, spark, distance, seconds) => [
        burst.x + Math.cos(spark.angle) * distance,
        burst.y + Math.sin(spark.angle) * distance + drop(burst.settings, seconds)
      ];

      const drawSpark = (ctx, burst, spark, elapsed) => {
        const s = burst.settings;
        const life = reduced ? REDUCED_MS : s.duration * spark.life;
        const p = elapsed / life;
        if (p >= 1) return false;
        const e = reduced ? 0.55 : s.ease(clamp(p, 0, 1));
        const seconds = reduced ? 0 : elapsed / 1000;
        const distance = s.radius * spark.reach * e;
        const width = s.width * spark.scale;
        const fade = reduced ? 1 - p : 1 - smoothstep(s.shape === 'line' ? 0.55 : 0.7, 1, p);
        if (fade <= 0) return true;
        ctx.strokeStyle = spark.color;
        ctx.fillStyle = spark.color;

        if (s.shape === 'line') {
          const length = s.size * spark.scale * (reduced ? 0.5 : Math.pow(1 - p, 1.6));
          const [x1, y1] = position(burst, spark, distance, seconds);
          const [x2, y2] = position(burst, spark, distance + Math.max(0.01, length), seconds);
          ctx.lineCap = 'round';
          if (spark.glow > 0) {
            ctx.globalAlpha = fade * 0.14 * spark.glow;
            ctx.lineWidth = width * 4.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          ctx.globalAlpha = fade;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          return true;
        }

        if (s.shape === 'streak') {
          const lag = reduced ? 0 : Math.min(elapsed, 70 + s.size * 4 * spark.scale);
          const back = reduced ? 0.4 : s.ease(clamp((elapsed - lag) / life, 0, 1));
          const [hx, hy] = position(burst, spark, distance, seconds);
          const [tx, ty] = position(burst, spark, s.radius * spark.reach * back, Math.max(0, seconds - lag / 1000));
          const dx = hx - tx;
          const dy = hy - ty;
          const length = Math.hypot(dx, dy) || 1;
          const nx = (-dy / length) * width * 0.5;
          const ny = (dx / length) * width * 0.5;
          const paint = (spreadWidth, alpha) => {
            const gradient = ctx.createLinearGradient(tx, ty, hx, hy);
            gradient.addColorStop(0, spark.clear);
            gradient.addColorStop(1, spark.color);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(hx + nx * spreadWidth, hy + ny * spreadWidth);
            ctx.lineTo(hx - nx * spreadWidth, hy - ny * spreadWidth);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = spark.color;
            ctx.beginPath();
            ctx.arc(hx, hy, width * 0.5 * spreadWidth, 0, Math.PI * 2);
            ctx.fill();
          };
          if (spark.glow > 0) paint(3.2, fade * 0.16 * spark.glow);
          paint(1, fade);
          return true;
        }

        if (s.shape === 'dot') {
          const [x, y] = position(burst, spark, distance, seconds);
          const radius = width * 1.25 * (1 - 0.5 * e);
          if (spark.glow > 0) {
            ctx.globalAlpha = fade * 0.18 * spark.glow;
            ctx.beginPath();
            ctx.arc(x, y, radius * 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = fade;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
          return true;
        }

        const [x, y] = position(burst, spark, distance, seconds);
        const twinkle = reduced ? 1 - p : Math.pow(Math.sin(Math.PI * clamp(p * 1.1, 0, 1)), 0.7);
        const radius = s.size * 0.6 * spark.scale * twinkle;
        const rotation = spark.angle + spark.spin * p * Math.PI * 0.5;
        if (radius <= 0.05) return true;
        if (spark.glow > 0) {
          ctx.globalAlpha = fade * 0.2 * spark.glow;
          ctx.beginPath();
          ctx.arc(x, y, radius * 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = fade;
        starPath(ctx, x, y, radius, rotation);
        ctx.fill();
        return true;
      };

      const drawRing = (ctx, burst, elapsed) => {
        const s = burst.settings;
        const life = reduced ? REDUCED_MS : s.duration * 0.8;
        const p = elapsed / life;
        if (p >= 1) return false;
        const radius = 2 + s.radius * 0.6 * (reduced ? 0.6 : EASINGS['ease-out'](p));
        ctx.globalAlpha = Math.pow(1 - p, 2) * 0.7;
        ctx.strokeStyle = burst.sparks[0]?.color ?? s.colors[0];
        ctx.lineWidth = Math.max(0.5, s.width * (1 - p) * 0.9);
        ctx.beginPath();
        ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        return true;
      };

      const remove = burst => {
        burst.canvas.remove();
        const index = bursts.indexOf(burst);
        if (index >= 0) bursts.splice(index, 1);
      };

      const frame = now => {
        raf = 0;
        for (const burst of [...bursts]) {
          const elapsed = now - burst.start;
          const ctx = burst.ctx;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, burst.canvas.width, burst.canvas.height);
          ctx.setTransform(burst.ratio, 0, 0, burst.ratio, -burst.left * burst.ratio, -burst.top * burst.ratio);
          let alive = false;
          if (burst.settings.ring && drawRing(ctx, burst, elapsed)) alive = true;
          for (const spark of burst.sparks) {
            if (drawSpark(ctx, burst, spark, elapsed)) alive = true;
          }
          ctx.globalAlpha = 1;
          if (!alive) remove(burst);
        }
        if (bursts.length) raf = requestAnimationFrame(frame);
      };

      const spawn = (clientX, clientY) => {
        const s = settingsRef.current;
        if (s.disabled) return;
        const rect = layer.getBoundingClientRect();
        const offset = Math.floor(Math.random() * s.colors.length);
        const full = s.spread >= 359.5;
        const arc = (s.spread * Math.PI) / 180;
        const heading = ((s.direction - 90) * Math.PI) / 180;
        const step = full ? (Math.PI * 2) / s.count : s.count > 1 ? arc / (s.count - 1) : 0;
        const sparks = Array.from({ length: s.count }, (_, i) => {
          const base = full ? heading + step * i : s.count > 1 ? heading - arc / 2 + step * i : heading;
          const jitter = (Math.random() - 0.5) * s.randomness;
          return {
            angle: base + jitter * (step || arc || 1) * 0.9,
            reach: 1 + (Math.random() - 0.5) * 0.7 * s.randomness,
            scale: 1 + (Math.random() - 0.5) * 0.8 * s.randomness,
            life: 1 + (Math.random() - 0.5) * 0.5 * s.randomness,
            spin: Math.random() - 0.5,
            color: s.colors[(i + offset) % s.colors.length],
            clear: '',
            glow: 0
          };
        });
        const longest = s.duration * (1 + 0.25 * s.randomness);
        const fall = drop(s, longest / 1000);
        const reach =
          s.radius * (1 + 0.35 * s.randomness) * (s.ease === EASINGS.spring ? 1.15 : 1) +
          s.size * (1 + 0.4 * s.randomness) +
          s.width * (s.glow > 0 ? 6 : 2) +
          6;
        const box = {
          left: Math.max(clientX - reach, 0),
          top: Math.max(clientY - reach, 0),
          right: Math.min(clientX + reach, window.innerWidth),
          bottom: Math.min(clientY + reach + fall, window.innerHeight)
        };
        if (box.right - box.left < 1 || box.bottom - box.top < 1) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil((box.right - box.left) * ratio);
        canvas.height = Math.ceil((box.bottom - box.top) * ratio);
        Object.assign(canvas.style, {
          position: 'absolute',
          left: `${box.left - rect.left}px`,
          top: `${box.top - rect.top}px`,
          width: `${box.right - box.left}px`,
          height: `${box.bottom - box.top}px`,
          display: 'block',
          pointerEvents: 'none'
        });
        canvas.setAttribute('aria-hidden', 'true');
        layer.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          canvas.remove();
          return;
        }
        for (const spark of sparks) {
          const [r, g, b] = channels(ctx, spark.color);
          spark.clear = `rgba(${r}, ${g}, ${b}, 0)`;
          spark.glow = s.glow * (0.35 + 0.65 * ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255));
        }
        bursts.push({
          x: clientX,
          y: clientY,
          start: performance.now(),
          sparks,
          settings: { ...s },
          canvas,
          ctx,
          ratio,
          left: box.left,
          top: box.top
        });
        while (bursts.length > MAX_BURSTS) remove(bursts[0]);
        if (!raf) raf = requestAnimationFrame(frame);
      };

      const onPointerDown = event => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        lastPress = { time: performance.now(), x: event.clientX, y: event.clientY };
        spawn(event.clientX, event.clientY);
      };

      const onClick = event => {
        if ('pointerType' in event && event.pointerType === 'mouse') return;
        if (event.detail === 0) {
          const target = event.target instanceof Element ? event.target : root;
          const rect = target.getBoundingClientRect();
          spawn(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return;
        }
        const recent =
          performance.now() - lastPress.time < 700 &&
          Math.hypot(event.clientX - lastPress.x, event.clientY - lastPress.y) < 12;
        if (!recent) spawn(event.clientX, event.clientY);
      };

      root.addEventListener('pointerdown', onPointerDown);
      root.addEventListener('click', onClick);

      engineRef.current = {
        spark: (x, y) => {
          const rect = root.getBoundingClientRect();
          spawn(rect.left + (x ?? rect.width / 2), rect.top + (y ?? rect.height / 2));
        }
      };

      return () => {
        cancelAnimationFrame(raf);
        root.removeEventListener('pointerdown', onPointerDown);
        root.removeEventListener('click', onClick);
        for (const burst of [...bursts]) remove(burst);
        engineRef.current = null;
        layer.remove();
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        spark: (x, y) => engineRef.current?.spark(x, y)
      }),
      []
    );

    return null;
  }
);

ClickSpark.displayName = 'ClickSpark';

return ClickSpark;
})();

// =====================================================================
// Site hook-up. Everything below decides which React Bits effect goes
// where. Tweak the props here to change timing, colours or feel.
// =====================================================================

const AQUA = '#0ADDD3';
const AQUA_LIGHT = '#99F2EE';

// Follow the site's light/dark toggle (data-theme on <html>).
function useSiteTheme() {
  const read = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

// Turn "25" / "50+" into CountUp props. Anything non-numeric (∞) is left alone.
function readStat(node) {
  const match = /^\s*(\d+(?:\.\d+)?)\s*(\D*)\s*$/.exec(node.textContent || '');
  if (!match) return null;
  node.textContent = '';
  return { node, to: parseFloat(match[1]), suffix: match[2] };
}

// SplitText splits every character, including the line breaks and indents
// that sit between block-level rows in the HTML. Those would render as
// empty lines, so drop whitespace-only text that only exists for layout.
function tidyWhitespace(el) {
  if (!el) return el;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const blanks = [];
  while (walker.nextNode()) {
    if (!walker.currentNode.nodeValue.trim()) blanks.push(walker.currentNode);
  }
  const isBreak = node =>
    !node || (node.nodeType === 1 && (node.tagName === 'BR' || getComputedStyle(node).display === 'block'));
  blanks.forEach(node => {
    if (isBreak(node.previousSibling) || isBreak(node.nextSibling)) node.remove();
  });
  return el;
}

function collectTargets() {
  const all = selector => Array.from(document.querySelectorAll(selector));
  return {
    heroName: tidyWhitespace(document.querySelector('.hero-name')),
    photoTitle: tidyWhitespace(document.querySelector('.photo-hero h1')),
    sectionTitles: all('.section-title').map(tidyWhitespace),
    stats: all('.stat .n').map(readStat).filter(Boolean),
    heroButtons: all('.hero-actions .btn'),
    cards: all('.service-card, .ref-card'),
    accentWords: all('.contact-h .ac'),
    velocity: document.getElementById('velocityStrip')
  };
}

function ReactBitsSite() {
  const theme = useSiteTheme();
  const [targets] = useState(collectTargets);

  return (
    <>
      {/* Aqua sparks wherever you click */}
      <ClickSpark
        sparkColor={[AQUA, AQUA_LIGHT, '#ffffff']}
        sparkSize={12}
        sparkRadius={26}
        sparkCount={9}
        duration={520}
        randomness={0.35}
      />

      {/* Hero name: letters rise in on load, ripple when hovered */}
      {targets.heroName && (
        <SplitText
          target={targets.heroName}
          trigger="load"
          splitType="chars"
          effect="rise"
          mask
          delay={38}
          duration={1.1}
          hoverEffect="wave"
        />
      )}

      {/* Photography page title */}
      {targets.photoTitle && (
        <SplitText
          target={targets.photoTitle}
          trigger="load"
          splitType="chars"
          effect="rise"
          mask
          delay={45}
          duration={1.1}
          hoverEffect="wave"
        />
      )}

      {/* Section titles: rise in as they scroll into view */}
      {targets.sectionTitles.map((node, i) => (
        <SplitText
          key={`title-${i}`}
          target={node}
          splitType="chars"
          effect="rise"
          mask
          delay={22}
          duration={0.9}
          threshold={0.15}
          rootMargin="-40px"
        />
      ))}

      {/* Hero stats: odometer roll */}
      {targets.stats.map(({ node, to, suffix }, i) =>
        ReactDOM.createPortal(
          <CountUp to={to} suffix={suffix} mode="roll" easing="spring" duration={1.8} delay={0.1 * i} />,
          node,
          `stat-${i}`
        )
      )}

      {/* Hero buttons pull toward the cursor */}
      {targets.heroButtons.map((node, i) => (
        <Magnet key={`magnet-${i}`} target={node} padding={60} magnetStrength={4} maxOffset={14} />
      ))}

      {/* Service and reference cards: aqua spotlight follows the cursor */}
      {targets.cards.map((node, i) => (
        <SpotlightCard
          key={`card-${i}`}
          target={node}
          theme={theme}
          spotlightColor={AQUA}
          intensity={theme === 'dark' ? 0.16 : 0.5}
          spotlightSize={260}
          borderGlow={0.9}
          proximity={90}
        />
      ))}

      {/* "create" / "capture" in the contact heading */}
      {targets.accentWords.map((node, i) => (
        <ShinyText
          key={`shine-${i}`}
          target={node}
          color={AQUA}
          shineColor="#ffffff"
          speed={2.4}
          delay={1.6}
          shineWidth={36}
        />
      ))}

      {/* Disciplines and tools strip, speeds up with scroll, draggable */}
      {targets.velocity &&
        ReactDOM.createPortal(
          <ScrollVelocity
            texts={[
              'Graphic Design / Video Editing / Motion Design / Videography / Social Content / Branding',
              'After Effects / Premiere / DaVinci Resolve / Photoshop / Illustrator / InDesign / Audition'
            ]}
            separator="/"
            velocity={55}
            numCopies={4}
            gap={24}
            outlineAlternate
            fadeEdges
            skewWithVelocity={6}
            draggable
            parallaxClassName="parallax rb-velocity__row"
            scrollerClassName="scroller rb-velocity__scroller"
          />,
          targets.velocity
        )}
    </>
  );
}

const rbRoot = document.createElement('div');
rbRoot.id = '__react_bits_root';
rbRoot.hidden = true;
document.body.appendChild(rbRoot);
ReactDOM.createRoot(rbRoot).render(<ReactBitsSite />);

})();
