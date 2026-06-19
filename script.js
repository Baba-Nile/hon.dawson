/* ============================================================
   Maxwell Changilwa Campaign — Main JS
   Handles: Navbar, Scroll Reveal, Counters, Typing, Mobile Menu
   ============================================================ */

'use strict';

/* ===== NAVBAR ===== */
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const mobileMenu = document.getElementById('mobileMenu');

function handleNavScroll() {
  if (!navbar) return;
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
    navbar.classList.remove('transparent');
  } else {
    navbar.classList.remove('scrolled');
    if (navbar.dataset.transparent === 'true') {
      navbar.classList.add('transparent');
    }
  }
}

if (navbar) {
  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();
}

if (navToggle && mobileMenu) {
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });
  // Close on link click
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

/* ===== ACTIVE NAV LINK ===== */
(function setActiveNav() {
  const links = document.querySelectorAll('.nav-links a, .mobile-menu a');
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href === currentPage) link.classList.add('active');
    else link.classList.remove('active');
  });
})();

/* ===== SCROLL TO TOP ===== */
const scrollTopBtn = document.getElementById('scrollTop');
if (scrollTopBtn) {
  window.addEventListener('scroll', () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ===== SCROLL REVEAL ===== */
function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger delay based on sibling index
        const siblings = [...entry.target.parentElement.querySelectorAll('.reveal:not(.visible)')];
        const idx = siblings.indexOf(entry.target);
        const delay = Math.min(idx * 80, 400);
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  items.forEach(item => observer.observe(item));
}

/* ===== ANIMATED COUNTERS ===== */
function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const duration = parseInt(el.dataset.duration || '2000', 10);
        const suffix = el.dataset.suffix || '';
        const prefix = el.dataset.prefix || '';
        let start = 0;
        const startTime = performance.now();

        function update(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
          const value = Math.floor(eased * target);
          el.textContent = prefix + value.toLocaleString() + suffix;
          if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

/* ===== TYPING ANIMATION ===== */
function initTyping() {
  const el = document.querySelector('[data-typing]');
  if (!el) return;

  const words = JSON.parse(el.dataset.typing);
  let wordIdx = 0, charIdx = 0, deleting = false;

  function type() {
    const word = words[wordIdx];
    if (!deleting) {
      el.textContent = word.substring(0, charIdx + 1);
      charIdx++;
      if (charIdx === word.length) {
        deleting = true;
        setTimeout(type, 1800);
        return;
      }
    } else {
      el.textContent = word.substring(0, charIdx - 1);
      charIdx--;
      if (charIdx === 0) {
        deleting = false;
        wordIdx = (wordIdx + 1) % words.length;
      }
    }
    setTimeout(type, deleting ? 60 : 90);
  }
  type();
}

/* ===== PROGRESS BARS ===== */
function initProgressBars() {
  const bars = document.querySelectorAll('.progress-fill[data-width]');
  if (!bars.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        setTimeout(() => {
          el.style.width = el.dataset.width + '%';
        }, 200);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.4 });

  bars.forEach(bar => observer.observe(bar));
}

/* ===== GALLERY LIGHTBOX ===== */
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const lightboxImg = lightbox.querySelector('.lightbox-img');
  const closeBtn = lightbox.querySelector('.lightbox-close');

  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const src = item.querySelector('img').src;
      lightboxImg.src = src;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) closeLightbox();
  });
}

/* ===== SMOOTH SCROLL LINKS ===== */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ===== WHATSAPP ===== */
const WHATSAPP_NUMBER = '254713530268';

function openWhatsApp(message) {
  const encoded = message ? encodeURIComponent(message) : '';
  const url = `https://wa.me/${WHATSAPP_NUMBER}${encoded ? '?text=' + encoded : ''}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function initWhatsApp() {
  // Handle all elements with data-whatsapp attribute
  document.querySelectorAll('[data-whatsapp]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const message = el.dataset.whatsapp || '';
      openWhatsApp(message);
    });
  });

  // Handle plain anchor links pointing to wa.me or whatsapp
  document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // Extract any existing message param if present
      try {
        const url = new URL(link.href);
        const msg = url.searchParams.get('text') || '';
        openWhatsApp(msg);
      } catch {
        openWhatsApp('');
      }
    });

    // Correct the href in place so it always uses the right number
    try {
      const url = new URL(link.href);
      const msg = url.searchParams.get('text') || '';
      link.href = `https://wa.me/${WHATSAPP_NUMBER}${msg ? '?text=' + encodeURIComponent(msg) : ''}`;
    } catch {
      link.href = `https://wa.me/${WHATSAPP_NUMBER}`;
    }
  });

  // Handle tel: links that contain the WhatsApp number
  document.querySelectorAll(`a[href*="713530268"]`).forEach(link => {
    if (!link.href.startsWith('tel:')) return;
    link.addEventListener('click', (e) => {
      // Let tel: links work normally — just ensure number is correct
      link.href = `tel:+254713530268`;
    });
  });
}

/* ===== NEWSLETTER FORM ===== */
function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    if (input && input.value) {
      input.value = '';
      showToast('✅ Thank you! You\'re now subscribed to campaign updates.');
    }
  });
}

/* ===== TOAST NOTIFICATION ===== */
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
    background: ${type === 'success' ? '#0a4f2a' : '#c0392b'};
    color: white; padding: 14px 28px; border-radius: 50px;
    font-family: 'Poppins', sans-serif; font-size: 0.9rem;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    z-index: 9999; opacity: 0;
    transition: opacity 0.3s ease;
    border: 1px solid ${type === 'success' ? '#c9a227' : '#e74c3c'};
    max-width: 90vw; text-align: center;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.style.opacity = '1');
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ===== CONTACT FORM ===== */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Sending...';
    btn.disabled = true;
    setTimeout(() => {
      showToast('✅ Message sent! We\'ll get back to you shortly.');
      form.reset();
      btn.textContent = 'Send Message';
      btn.disabled = false;
    }, 1500);
  });
}

/* ===== VOLUNTEER FORM ===== */
function initVolunteerForm() {
  const form = document.getElementById('volunteerForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Submitting...';
    btn.disabled = true;
    setTimeout(() => {
      showToast('🎉 Welcome to the team! We\'ll contact you soon.');
      form.reset();
      btn.textContent = 'Join the Movement';
      btn.disabled = false;
    }, 1500);
  });
}

/* ===== INIT ALL ===== */
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  animateCounters();
  initTyping();
  initProgressBars();
  initLightbox();
  initSmoothScroll();
  initWhatsApp();
  initNewsletter();
  initContactForm();
  initVolunteerForm();

  // Page transition
  document.body.classList.add('page-transition');

  // Tab filter (news/gallery)
  document.querySelectorAll('[data-filter-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.filterGroup;
      const val = btn.dataset.filterBtn;
      document.querySelectorAll(`[data-filter-group="${group}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('[data-filter-item]').forEach(item => {
        if (val === 'all' || item.dataset.filterItem === val) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
});