(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.getElementById("year").textContent = new Date().getFullYear();

  /* Nav scroll state */
  const nav = document.getElementById("nav");
  let lastY = window.scrollY;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    nav.classList.toggle("scrolled", y > 10);
    nav.classList.toggle("is-hidden", y > lastY && y > 120);
    lastY = y;
  }, { passive: true });

  /* Mobile nav */
  const navToggle = document.querySelector(".nav-toggle");
  const mobileNav = document.getElementById("mobileNav");
  navToggle.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* Scroll reveal */
  const revealEls = document.querySelectorAll(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add("in"), Math.min(i, 5) * 60);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
    revealEls.forEach((el) => io.observe(el));
  }

  /* Reel sliders */
  function initSlider(trackId, prevId, nextId) {
    const track = document.getElementById(trackId);
    const prev = document.getElementById(prevId);
    const next = document.getElementById(nextId);
    if (!track || !prev || !next) return;

    const step = () => {
      const card = track.querySelector(".reel-stack");
      if (!card) return 320;
      const gap = parseFloat(getComputedStyle(track).columnGap || "24");
      return card.getBoundingClientRect().width + gap;
    };

    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 1;
      prev.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft >= max;
    };

    prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    setTimeout(update, 80);
  }
  initSlider("vimeoTrack", "vimeoPrev", "vimeoNext");
  initSlider("ytTrack", "ytPrev", "ytNext");

  /* Social icon SVGs */
  const ICONS = {
    vimeo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.977 6.416c-.105 2.338-1.74 5.541-4.908 9.61-3.275 4.252-6.045 6.378-8.309 6.378-1.401 0-2.586-1.295-3.553-3.886L5.275 12.21C4.563 9.616 3.798 8.318 2.979 8.318c-.179 0-.806.378-1.881 1.132L0 8.018c1.185-1.041 2.351-2.083 3.501-3.124C5.078 3.532 6.261 2.81 7.05 2.737c1.863-.18 3.01 1.097 3.443 3.831.467 2.952.79 4.788.967 5.507.533 2.42 1.118 3.63 1.756 3.63.495 0 1.238-.78 2.232-2.341.99-1.561 1.522-2.749 1.594-3.566.144-1.371-.395-2.058-1.594-2.058-.567 0-1.151.13-1.751.387 1.16-3.804 3.378-5.653 6.652-5.548 2.428.072 3.572 1.645 3.428 4.713z"/></svg>',
    behance: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 7h-7V5h7zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14H15.97c.13 3.211 3.483 3.312 4.588 2.029zm-7.717-5.013h4.985c-.106-1.547-1.136-2.219-2.451-2.219-1.437 0-2.231.768-2.534 2.219m-7.851.022s2.518.122 2.518-2.346c0-2.46-1.708-2.464-2.518-2.464H3v4.81zM3 13.484v5.516h5.534c1.014 0 2.694-.32 2.694-2.711C11.228 13.673 9.6 13.485 8.534 13.485z"/></svg>',
    instagram: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
    linkedin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5V5c0-2.761-2.238-5-5-5zM8 19H5V8h3zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764S7.466 6.732 6.5 6.732zM20 19h-3v-5.604c0-3.368-4-3.113-4 0V19h-3V8h3v1.765c1.396-2.586 7-2.777 7 2.476z"/></svg>',
    youtube: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
  };
  document.querySelectorAll(".ic[data-icon]").forEach((el) => {
    el.innerHTML = ICONS[el.dataset.icon] || "";
  });

  /* Custom cursor */
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  if (!isTouch && !prefersReducedMotion) {
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    (function animateRing() {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateRing);
    })();

    document.querySelectorAll("a, button, .work-card").forEach((el) => {
      el.addEventListener("mouseenter", () => ring.classList.add("is-active"));
      el.addEventListener("mouseleave", () => ring.classList.remove("is-active"));
    });
  }

  /* Count-up stats */
  const statEls = document.querySelectorAll(".stat .n");
  if (statEls.length && "IntersectionObserver" in window) {
    const parseTarget = (text) => {
      const match = text.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : null;
    };
    const countIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const original = el.textContent.trim();
        const target = parseTarget(original);
        countIo.unobserve(el);
        if (prefersReducedMotion || target === null) return;
        const suffix = original.replace(/^[\d.]+/, "");
        const duration = 1200;
        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (progress < 1) requestAnimationFrame(tick);
          else el.textContent = original;
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    statEls.forEach((el) => countIo.observe(el));
  }

  /* Scroll-spy nav highlighting */
  const navLinks = document.querySelectorAll(".nav-links a");
  const spySections = Array.from(navLinks)
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if (spySections.length && "IntersectionObserver" in window) {
    const spyIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = "#" + entry.target.id;
        navLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === id));
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    spySections.forEach((section) => spyIo.observe(section));
  }

  /* Parallax hero background on scroll */
  const heroBgs = document.querySelectorAll(".hero-bg");
  if (heroBgs.length && !prefersReducedMotion) {
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      heroBgs.forEach((bg) => {
        bg.style.transform = `translateY(${y * 0.15}px)`;
      });
    }, { passive: true });
  }

  /* Hero art "shatter" — slices the hero artwork into a grid of tiles
     sharing one background image/position, so it reconstructs perfectly
     when at rest. On pointer move within the hero, tiles translate away
     from the image's center, scaled by how far the cursor is from
     center — the image visually cracks apart, then springs back on
     mouseleave. Falls back to a single static image on touch devices
     and when reduced motion is requested. */
  (function initHeroShatter() {
    const container = document.querySelector("[data-shatter]");
    if (!container) return;
    const artUrl = container.dataset.artUrl;
    const cols = 6, rows = 4;

    if (isTouch || prefersReducedMotion) {
      container.style.backgroundImage = `url(${artUrl})`;
      container.style.backgroundSize = "cover";
      container.style.backgroundPosition = "center";
      return;
    }

    const tiles = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = document.createElement("div");
        tile.className = "shatter-tile";
        const w = 100 / cols, h = 100 / rows;
        tile.style.left = `${c * w}%`;
        tile.style.top = `${r * h}%`;
        tile.style.width = `${w}%`;
        tile.style.height = `${h}%`;
        tile.style.backgroundImage = `url(${artUrl})`;
        tile.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
        tile.style.backgroundPosition = `${(c / (cols - 1)) * 100}% ${(r / (rows - 1)) * 100}%`;
        // Direction each tile drifts, relative to the grid's center.
        const dirX = (c + 0.5) / cols - 0.5;
        const dirY = (r + 0.5) / rows - 0.5;
        tile.dataset.dirX = dirX;
        tile.dataset.dirY = dirY;
        container.appendChild(tile);
        tiles.push(tile);
      }
    }

    const card = container.closest(".hero-art-card");
    const maxShatterPx = 46;

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      const magnitude = Math.min(Math.sqrt(px * px + py * py) * 2, 1);
      tiles.forEach((tile) => {
        const dirX = parseFloat(tile.dataset.dirX);
        const dirY = parseFloat(tile.dataset.dirY);
        const tx = dirX * magnitude * maxShatterPx;
        const ty = dirY * magnitude * maxShatterPx;
        const rot = dirX * magnitude * 5;
        tile.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
      });
    });

    card.addEventListener("mouseleave", () => {
      tiles.forEach((tile) => { tile.style.transform = ""; });
    });
  })();

  /* Grunge dividers — draw in (stroke + spray dots) once scrolled into view */
  const grungeDividers = document.querySelectorAll("[data-grunge]");
  if (grungeDividers.length) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      grungeDividers.forEach((el) => el.classList.add("in"));
    } else {
      const grungeIo = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            grungeIo.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      grungeDividers.forEach((el) => grungeIo.observe(el));
    }
  }

  /* Magnetic buttons — listener stays on the static .btn hitbox; transform
     applies to the inner span so the hitbox never moves under the cursor
     (moving the listened-to element itself causes a mouseleave/mouseenter
     feedback loop that snaps the transform back to empty). */
  if (!isTouch && !prefersReducedMotion) {
    document.querySelectorAll(".btn").forEach((btn) => {
      const inner = btn.querySelector(".btn-inner");
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        inner.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      btn.addEventListener("mouseleave", () => { inner.style.transform = ""; });
    });
  }

  /* 3D tilt on work cards — same fix: listener on the static .work-card,
     transform applied to .work-card-inner. */
  if (!isTouch && !prefersReducedMotion) {
    document.querySelectorAll(".work-card").forEach((card) => {
      const inner = card.querySelector(".work-card-inner");
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        inner.style.transform = `rotateX(${-py * 8}deg) rotateY(${px * 8}deg) translateY(-4px)`;
      });
      card.addEventListener("mouseleave", () => { inner.style.transform = ""; });
    });
  }

  /* Drag-to-scroll on reel tracks */
  document.querySelectorAll(".reel-track").forEach((track) => {
    let isDown = false, startX = 0, startScroll = 0, moved = false;
    track.addEventListener("pointerdown", (e) => {
      isDown = true; moved = false;
      startX = e.clientX; startScroll = track.scrollLeft;
      track.classList.add("is-dragging");
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      const delta = e.clientX - startX;
      if (Math.abs(delta) > 4) moved = true;
      track.scrollLeft = startScroll - delta;
    });
    const endDrag = () => { isDown = false; track.classList.remove("is-dragging"); };
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("click", (e) => {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  });

  /* Work lightbox */
  const lightbox = document.getElementById("lightbox");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxNum = document.getElementById("lightboxNum");
  const lightboxTag = document.getElementById("lightboxTag");
  const lightboxTitle = document.getElementById("lightboxTitle");
  const lightboxClient = document.getElementById("lightboxClient");
  const lightboxDesc = document.getElementById("lightboxDesc");

  function openLightbox(card) {
    const num = card.querySelector(".ph-num")?.textContent || "";
    lightboxNum.textContent = num;
    lightboxTag.textContent = card.dataset.tag || "";
    lightboxTitle.textContent = card.dataset.title || "";
    lightboxClient.innerHTML = card.dataset.client ? `Client &nbsp;&middot;&nbsp; <strong>${card.dataset.client}</strong>` : "";
    lightboxDesc.textContent = card.dataset.description || "";
    document.body.classList.add("lb-open");
  }
  function closeLightbox() {
    document.body.classList.remove("lb-open");
  }

  document.querySelectorAll(".work-card").forEach((card) => {
    card.addEventListener("click", () => openLightbox(card));
  });
  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });
})();
