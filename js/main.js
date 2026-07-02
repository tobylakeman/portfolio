(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  document.getElementById("year").textContent = new Date().getFullYear();

  /* Header show/hide on scroll direction */
  const header = document.querySelector(".site-header");
  let lastY = window.scrollY;

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 10);
    if (y > lastY && y > 120) {
      header.classList.add("is-hidden");
    } else {
      header.classList.remove("is-hidden");
    }
    lastY = y;
  }, { passive: true });

  /* Mobile nav toggle */
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

  /* Custom cursor */
  if (!isTouch && !prefersReducedMotion) {
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateRing);
    };
    requestAnimationFrame(animateRing);

    document.querySelectorAll("a, button, .work-card").forEach((el) => {
      el.addEventListener("mouseenter", () => ring.classList.add("is-active"));
      el.addEventListener("mouseleave", () => ring.classList.remove("is-active"));
    });
  }

  /* Hero text scramble-in */
  const scrambleEl = document.querySelector("[data-scramble]");
  if (scrambleEl) {
    const finalText = scrambleEl.dataset.scramble;
    if (prefersReducedMotion) {
      scrambleEl.textContent = finalText;
    } else {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let frame = 0;
      const totalFrames = 24;

      const tick = () => {
        let output = "";
        for (let i = 0; i < finalText.length; i++) {
          const charProgress = (frame / totalFrames) * finalText.length;
          if (finalText[i] === " ") {
            output += " ";
          } else if (i < charProgress - 3) {
            output += finalText[i];
          } else if (i < charProgress) {
            output += chars[Math.floor(Math.random() * chars.length)];
          } else {
            output += " ";
          }
        }
        scrambleEl.textContent = output;
        frame++;
        if (frame <= totalFrames + 3) {
          requestAnimationFrame(tick);
        } else {
          scrambleEl.textContent = finalText;
        }
      };
      requestAnimationFrame(tick);
    }
  }

  /* Scroll reveal */
  const revealEls = document.querySelectorAll(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add("is-visible"), Math.min(i, 5) * 60);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });

    revealEls.forEach((el) => observer.observe(el));
  }

  /* Parallax hero watermark */
  const watermark = document.querySelector("[data-parallax]");
  if (watermark && !prefersReducedMotion) {
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      watermark.style.transform = `translate(-50%, calc(-50% + ${y * 0.25}px))`;
    }, { passive: true });
  }
})();
