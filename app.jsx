// app.jsx — Toby Lakeman portfolio (Aqua 2026)
const { useEffect, useState } = React;

// ---------- Video URL parsing ----------
function parseVideoUrl(url, opts = {}) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  let m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (m) {
    const p = new URLSearchParams();
    p.set('title', '0');p.set('byline', '0');p.set('portrait', '0');
    if (opts.autoplay) p.set('autoplay', '1');
    if (opts.loop) p.set('loop', '1');
    if (opts.muted) p.set('muted', '1');
    return `https://player.vimeo.com/video/${m[1]}?${p.toString()}`;
  }
  m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
  if (m) {
    const id = m[1];
    const p = new URLSearchParams();
    p.set('rel', '0');p.set('modestbranding', '1');
    if (opts.autoplay) p.set('autoplay', '1');
    if (opts.muted) p.set('mute', '1');
    if (opts.loop) {p.set('loop', '1');p.set('playlist', id);}
    return `https://www.youtube-nocookie.com/embed/${id}?${p.toString()}`;
  }
  return null;
}

function VideoFrame({ url, label, big }) {
  const src = parseVideoUrl(url);
  if (!src) {
    return (
      <div className="reel-empty">
        <div className="play">
          <svg width={big ? 28 : 20} height={big ? 28 : 20} viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20" /></svg>
        </div>
        <span>{label || 'Add video URL via Tweaks'}</span>
      </div>);

  }
  return (
    <iframe
      src={src}
      allow="fullscreen; autoplay; encrypted-media"
      allowFullScreen
      webkitallowfullscreen="true"
      mozallowfullscreen="true"
      title={label || 'Video'} />);


}

function VideoFramePortal({ targetId, url, label, big }) {
  const [node, setNode] = useState(null);
  useEffect(() => {setNode(document.getElementById(targetId));}, [targetId]);
  if (!node) return null;
  return ReactDOM.createPortal(<VideoFrame url={url} label={label} big={big} />, node);
}

// ---------- Reveal on scroll ----------
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {els.forEach((el) => el.classList.add('in'));return;}
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {e.target.classList.add('in');io.unobserve(e.target);}
      });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useNavScrolled() {
  useEffect(() => {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const onScroll = () => {
      if (window.scrollY > 32) nav.classList.add('scrolled');else
      nav.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
}

// ---------- Social icons ----------
const ICONS = {
  vimeo: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.977 6.416c-.105 2.338-1.74 5.541-4.908 9.61-3.275 4.252-6.045 6.378-8.309 6.378-1.401 0-2.586-1.295-3.553-3.886L5.275 12.21C4.563 9.616 3.798 8.318 2.979 8.318c-.179 0-.806.378-1.881 1.132L0 8.018c1.185-1.041 2.351-2.083 3.501-3.124C5.078 3.532 6.261 2.81 7.05 2.737c1.863-.18 3.01 1.097 3.443 3.831.467 2.952.79 4.788.967 5.507.533 2.42 1.118 3.63 1.756 3.63.495 0 1.238-.78 2.232-2.341.99-1.561 1.522-2.749 1.594-3.566.144-1.371-.395-2.058-1.594-2.058-.567 0-1.151.13-1.751.387 1.16-3.804 3.378-5.653 6.652-5.548 2.428.072 3.572 1.645 3.428 4.713z" /></svg>,
  behance: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 7h-7V5h7zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14H15.97c.13 3.211 3.483 3.312 4.588 2.029zm-7.717-5.013h4.985c-.106-1.547-1.136-2.219-2.451-2.219-1.437 0-2.231.768-2.534 2.219m-7.851.022s2.518.122 2.518-2.346c0-2.46-1.708-2.464-2.518-2.464H3v4.81zM3 13.484v5.516h5.534c1.014 0 2.694-.32 2.694-2.711C11.228 13.673 9.6 13.485 8.534 13.485z" /></svg>,
  instagram: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>,
  linkedin: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5V5c0-2.761-2.238-5-5-5zM8 19H5V8h3zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764S7.466 6.732 6.5 6.732zM20 19h-3v-5.604c0-3.368-4-3.113-4 0V19h-3V8h3v1.765c1.396-2.586 7-2.777 7 2.476z" /></svg>,
  youtube: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
};

function SocialLinkList({ t, dark }) {
  const items = [
  { id: 'vimeo', label: 'Vimeo', url: t.vimeoHandle },
  { id: 'youtube', label: 'YouTube', url: t.youtubeHandle },
  { id: 'behance', label: 'Behance', url: t.behanceHandle },
  { id: 'instagram', label: 'Instagram', url: t.instagramHandle },
  { id: 'linkedin', label: 'LinkedIn', url: t.linkedinHandle }].
  filter((x) => x.url && x.url.trim());
  return (
    <>
      {items.map(({ id, label, url }) =>
      <a key={id} className="social-link" href={url} target="_blank" rel="noopener">
          <span className="ic">{ICONS[id]}</span>
          {label}
        </a>
      )}
    </>);

}

function FeedGrid({ t }) {
  const [node, setNode] = useState(null);
  useEffect(() => {setNode(document.getElementById('feedGrid'));}, []);
  if (!node) return null;

  const items = [
  {
    id: 'instagram',
    label: 'Instagram',
    url: t.instagramHandle,
    handle: extractHandle(t.instagramHandle, /instagram\.com\/([\w.\-]+)/),
    grad: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
  },
  {
    id: 'youtube',
    label: 'YouTube',
    url: t.youtubeHandle,
    handle: extractHandle(t.youtubeHandle, /youtube\.com\/(?:@|c\/|channel\/|user\/)?([\w.\-]+)/),
    grad: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)'
  },
  {
    id: 'vimeo',
    label: 'Vimeo',
    url: t.vimeoHandle,
    handle: extractHandle(t.vimeoHandle, /vimeo\.com\/([\w.\-]+)/),
    grad: 'linear-gradient(135deg, #00adef 0%, #007fbf 100%)'
  },
  {
    id: 'behance',
    label: 'Behance',
    url: t.behanceHandle,
    handle: extractHandle(t.behanceHandle, /behance\.net\/([\w.\-]+)/),
    grad: 'linear-gradient(135deg, #1769ff 0%, #0050d0 100%)'
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    url: t.linkedinHandle,
    handle: extractHandle(t.linkedinHandle, /linkedin\.com\/in\/([\w.\-]+)/),
    grad: 'linear-gradient(135deg, #0a66c2 0%, #084a8e 100%)'
  }].
  filter((x) => x.url && x.url.trim());

  return ReactDOM.createPortal(
    <>
      {items.map((it) =>
      <a key={it.id} className="feed-tile feed-tile--link" href={it.url} target="_blank" rel="noopener" style={{ background: it.grad }}>
          <div className="feed-icon">{ICONS[it.id]}</div>
          <div className="feed-info">
            <span className="feed-platform">{it.label}</span>
            {it.handle && <span className="feed-handle">@{it.handle}</span>}
            <span className="feed-cta">View profile <span className="arr-sm">→</span></span>
          </div>
        </a>
      )}
    </>,
    node
  );
}

function extractHandle(url, regex) {
  if (!url) return '';
  const m = url.match(regex);
  return m ? m[1].replace(/\/$/, '') : '';
}

function SocialLinks({ t }) {
  const [node, setNode] = useState(null);
  useEffect(() => {setNode(document.getElementById('socialLinks'));}, []);
  if (!node) return null;
  return ReactDOM.createPortal(<SocialLinkList t={t} />, node);
}

function ContactSocialLinks({ t }) {
  const [node, setNode] = useState(null);
  useEffect(() => {setNode(document.getElementById('contactSocials'));}, []);
  if (!node) return null;
  return ReactDOM.createPortal(<SocialLinkList t={t} dark />, node);
}

// ---------- Work lightbox ----------
function WorkLightbox() {
  const [item, setItem] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const card = e.target.closest('.work-card');
      if (!card) return;
      e.preventDefault();
      const img = card.querySelector('.thumb img');
      const ttl = card.querySelector('.cap .t')?.textContent || '';
      const k = card.querySelector('.cap .k')?.textContent || '';
      const description = card.dataset.description || '';
      const client = card.dataset.client || '';
      const thumbSrc = img?.src || '';
      // Lightbox uses the higher-res JPG (assets/portfolio/pXX-full.jpg)
      const fullSrc = thumbSrc.replace(/(\/p\d{2})\.png(\?.*)?$/, '$1-full.jpg');
      setItem({ src: fullSrc, alt: img?.alt || '', ttl, k, description, client });
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    const onKey = (e) => {if (e.key === 'Escape') setItem(null);};
    if (item) {
      document.body.classList.add('lb-open');
      window.addEventListener('keydown', onKey);
    } else {
      document.body.classList.remove('lb-open');
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('lb-open');
    };
  }, [item]);

  if (!item) return null;
  return (
    <div className="lightbox" onClick={(e) => {if (e.target.classList.contains('lightbox') || e.target.classList.contains('lightbox-inner')) setItem(null);}}>
      <button className="lightbox-close" onClick={() => setItem(null)} aria-label="Close">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
      <div className="lightbox-inner">
        <div className="lightbox-img">
          <img src={item.src} alt={item.alt} />
        </div>
        <div className="lightbox-meta">
          {item.k && <p className="lightbox-k">{item.k}</p>}
          <h3 className="lightbox-t">
            {item.ttl.split(/,\s*/).map((part, i, arr) =>
            <React.Fragment key={i}>
                {part}{i < arr.length - 1 && <br />}
              </React.Fragment>
            )}
          </h3>
          {item.client && <p className="lightbox-client">Client &nbsp;·&nbsp; <strong>{item.client}</strong></p>}
          {item.description &&
          <p className="lightbox-desc" style={{ textAlign: "left" }}>
              {item.description.split('\n').map((line, i, arr) =>
            <React.Fragment key={i}>
                  {line}{i < arr.length - 1 && <br />}
                </React.Fragment>
            )}
            </p>
          }
        </div>
      </div>
    </div>);

}

// ---------- App ----------
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => {
    // Set on <html> (not <body>) so the page is themed before first paint,
    // and default to dark — light is opt-in via the toggle.
    const mode = t.theme || 'dark';
    document.documentElement.dataset.theme = mode;
    document.body.dataset.theme = mode;
  }, [t.theme]);

  useEffect(() => {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const handler = () => setTweak('theme', t.theme === 'dark' ? 'light' : 'dark');
    btn.addEventListener('click', handler);
    return () => btn.removeEventListener('click', handler);
  }, [t.theme, setTweak]);

  useReveal();
  useNavScrolled();

  return (
    <>
      <VideoFramePortal targetId="reelMain" url={t.motionReelUrl} label="Motion design showreel" big />
      <VideoFramePortal targetId="heroReel" url={t.showreelUrl} label="Hero showreel" big />
      <VideoFramePortal targetId="reelTile1" url={t.videoUrl1} label="Project video 1" />
      <VideoFramePortal targetId="reelTile2" url={t.videoUrl2} label="Project video 2" />
      <SocialLinks t={t} />
      <ContactSocialLinks t={t} />
      <FeedGrid t={t} />
      <WorkLightbox />

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakRadio
          label="Mode"
          value={t.theme}
          options={['light', 'dark']}
          onChange={(v) => setTweak('theme', v)} />
        

        <TweakSection label="Showreel" />
        <TweakText
          label="Hero showreel URL (top of page)"
          value={t.showreelUrl}
          placeholder="vimeo.com/… or youtube.com/…"
          onChange={(v) => setTweak('showreelUrl', v)} />
        
        <TweakText
          label="In-motion top video URL"
          value={t.motionReelUrl}
          placeholder="vimeo.com/… or youtube.com/…"
          onChange={(v) => setTweak('motionReelUrl', v)} />
        

        <TweakSection label="Project videos" />
        <TweakText
          label="Video 1"
          value={t.videoUrl1}
          placeholder="vimeo.com/…"
          onChange={(v) => setTweak('videoUrl1', v)} />
        
        <TweakText
          label="Video 2"
          value={t.videoUrl2}
          placeholder="vimeo.com/…"
          onChange={(v) => setTweak('videoUrl2', v)} />
        
        <TweakText
          label="Video 3"
          value={t.videoUrl3}
          placeholder="vimeo.com/…"
          onChange={(v) => setTweak('videoUrl3', v)} />
        

        <TweakSection label="Social links" />
        <TweakText
          label="Vimeo"
          value={t.vimeoHandle}
          placeholder="https://vimeo.com/…"
          onChange={(v) => setTweak('vimeoHandle', v)} />
        
        <TweakText
          label="YouTube"
          value={t.youtubeHandle}
          placeholder="https://youtube.com/@…"
          onChange={(v) => setTweak('youtubeHandle', v)} />
        
        <TweakText
          label="Behance"
          value={t.behanceHandle}
          placeholder="https://behance.net/…"
          onChange={(v) => setTweak('behanceHandle', v)} />
        
        <TweakText
          label="Instagram"
          value={t.instagramHandle}
          placeholder="https://instagram.com/…"
          onChange={(v) => setTweak('instagramHandle', v)} />
        
        <TweakText
          label="LinkedIn"
          value={t.linkedinHandle}
          placeholder="https://linkedin.com/in/…"
          onChange={(v) => setTweak('linkedinHandle', v)} />
        
      </TweaksPanel>
    </>);

}

const root = document.createElement('div');
root.id = '__app_root';
document.body.appendChild(root);
ReactDOM.createRoot(root).render(<App />);

// Tag elements for reveal animation
function tagReveal() {
  document.querySelectorAll(
    '.work-card, .exp-row, .ref-card, .cap-col, .feed-tile, .reel-tile, .about-quote-block, .about-body, .stat'
  ).forEach((el) => el.classList.add('reveal'));
}
if (document.readyState !== 'loading') tagReveal();else
document.addEventListener('DOMContentLoaded', tagReveal);

// Reel slider — prev / next arrow buttons
function initReelSlider(trackId, prevId, nextId) {
  const track = document.getElementById(trackId);
  const prev = document.getElementById(prevId);
  const next = document.getElementById(nextId);
  if (!track || !prev || !next) return;

  const step = () => {
    const card = track.querySelector('.reel-stack, .reel-yt-stack');
    if (!card) return 320;
    const gap = parseFloat(getComputedStyle(track).columnGap || '24');
    return card.getBoundingClientRect().width + gap;
  };

  const update = () => {
    const max = track.scrollWidth - track.clientWidth - 1;
    prev.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft >= max;
  };

  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  // Initial state — wait a tick so layout settles
  setTimeout(update, 80);
}
function initAllSliders() {
  initReelSlider('reelTrack', 'reelPrev', 'reelNext');
  initReelSlider('ytTrack', 'ytPrev', 'ytNext');
}
if (document.readyState !== 'loading') initAllSliders();else
document.addEventListener('DOMContentLoaded', initAllSliders);