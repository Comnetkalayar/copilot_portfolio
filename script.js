const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');
const currentYear = document.getElementById('currentYear');
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');

// Prevent flashing default content until CMS data is applied
try { document.documentElement.classList.add('cms-loading'); } catch (e) {}

// Try to fetch CMS data and populate the page dynamically when available.
async function populateFromCMS() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) return;
    const data = await res.json();

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    if (data.name) {
      const brand = document.getElementById('brandName');
      if (brand) brand.textContent = data.name;
      // persist name locally so header shows immediately after admin save
      try { localStorage.setItem('siteName', data.name); } catch(e){}
      // footer year span is currentYear; don't overwrite it. update footer label if present
      const footerLabel = document.querySelector('.footer-copy p');
      if (footerLabel) footerLabel.textContent = `© ${new Date().getFullYear()} ${data.name}. Crafted with HTML, CSS, and JavaScript.`;
    } else {
      // fallback to previously saved site name
      try {
        const saved = localStorage.getItem('siteName');
        if (saved) {
          const brand = document.getElementById('brandName'); if (brand) brand.textContent = saved;
        }
      } catch(e){}
    }

    if (data.avatarUrl) {
      const img = document.getElementById('profileImage');
      if (img) { img.src = data.avatarUrl; img.style.display = 'block'; }
    }

    if (data.eyebrow) setText('eyebrow', data.eyebrow);
    if (data.headline) setText('heroHeadline', data.headline);
    if (data.intro) setText('introText', data.intro);
    if (data.experienceYears) setText('experienceYears', data.experienceYears);
    if (data.focusAreas && Array.isArray(data.focusAreas)) {
      const ul = document.getElementById('focusAreas');
      if (ul) {
        ul.innerHTML = data.focusAreas.map(i => `<li>${i}</li>`).join('');
      }
    }

    if (data.aboutHeadline) setText('aboutHeadline', data.aboutHeadline);
    if (data.aboutText) setText('aboutText', data.aboutText);
    if (data.location) setText('location', data.location);
    if (data.specialty) setText('specialty', data.specialty);
    if (data.tools) setText('tools', data.tools);

    if (data.skills && Array.isArray(data.skills)) {
      const skillsList = document.getElementById('skillsList');
      if (skillsList) {
        skillsList.innerHTML = data.skills.map(s => `
          <article class="skill-card">
            <h3>${s.title}</h3>
            <p>${s.desc}</p>
          </article>
        `).join('');
      }
    }

    if (data.projects && Array.isArray(data.projects)) {
      const projectsList = document.getElementById('projectsList');
      if (projectsList) {
        projectsList.innerHTML = data.projects.map((p, i) => {
          const tech = p.tech || [];
          const img = p.image ? `<div class="project-media"><img src="${p.image}" alt="${p.title} screenshot" loading="lazy"/></div>` : '';
          const liveBtn = p.live ? `<a class="button primary" href="${p.live}" target="_blank" rel="noreferrer">Live</a>` : '';
          const gitBtn = p.github ? `<a class="button secondary" href="${p.github}" target="_blank" rel="noreferrer">GitHub</a>` : '';
          return `
            <article class="project-card" data-index="${i}" data-tech='${JSON.stringify(tech)}' tabindex="0">
              ${img}
              <div class="project-body">
                <div class="project-meta">${p.meta || ''}</div>
                <h3>${p.title}</h3>
                <p>${p.desc}</p>
                <div class="tech-badges">${tech.map(t=>`<span class="tech-badge">${t}</span>`).join('')}</div>
                <div class="project-actions">
                  ${liveBtn}
                  ${gitBtn}
                  <a class="button outline" href="project-detail.html?i=${i}">Details</a>
                </div>
              </div>
            </article>
          `;
        }).join('');

        // initialize card interactions
        try { initProjectInteractions(); } catch (e) {}
      }
    }

    if (data.contactEmail) {
      const contactEl = document.getElementById('contactEmail');
      if (contactEl) { contactEl.href = `mailto:${data.contactEmail}`; contactEl.textContent = data.contactEmail; }
    }

    if (data.socialLinks) {
      const githubLink = document.getElementById('socialGithub');
      if (githubLink && data.socialLinks.github) githubLink.href = data.socialLinks.github;
      const linkedinLink = document.getElementById('socialLinkedIn');
      if (linkedinLink && data.socialLinks.linkedin) linkedinLink.href = data.socialLinks.linkedin;
      const twitterLink = document.getElementById('socialTwitter');
      if (twitterLink && data.socialLinks.twitter) twitterLink.href = data.socialLinks.twitter;
    }

    if (data.availability) setText('availability', data.availability);

  } catch (err) {
    // ignore — site will use static content
  }
}

async function startApp() {
  // Wait for CMS data but don't block forever — use 5s timeout as fallback
  const loadPromise = populateFromCMS();
  try {
    await Promise.race([
      loadPromise,
      new Promise((res) => setTimeout(res, 5000)),
    ]);
  } catch (e) {
    // ignore
  }

  // Remove loading state so page becomes visible
  try { document.documentElement.classList.remove('cms-loading'); } catch (e) {}

  // Hide loading screen element when ready
  try {
    const loader = document.getElementById('loadingScreen');
    if (loader) {
      loader.setAttribute('aria-hidden', 'true');
      // remove from DOM after transition
      setTimeout(() => { try { loader.remove(); } catch (e) {} }, 500);
    }
  } catch (e) {}

  // Enhanced interactions
  try { initHeroTyping(); } catch (e) {}
  try { initCursorGlow(); } catch (e) {}

  initRevealAnimations();
  initProjectSlider();
  await populateProjectDetailFromCMS();
}

startApp();

// Typing animation for hero headline
function initHeroTyping() {
  const el = document.getElementById('heroHeadline');
  if (!el) return;
  const staticText = el.dataset.fallback || el.textContent || 'Building clean digital experiences';
  const variants = [staticText, 'Designing delightful interfaces', 'Shipping reliable production systems'];
  let vi = 0, ci = 0, deleting = false;
  el.textContent = '';
  function step(){
    const full = variants[vi];
    if (!deleting) {
      ci++;
      el.textContent = full.slice(0,ci);
      if (ci >= full.length) { deleting = true; setTimeout(step, 1600); return; }
    } else {
      ci--;
      el.textContent = full.slice(0,ci);
      if (ci <= 0) { deleting = false; vi = (vi+1)%variants.length; setTimeout(step, 300); return; }
    }
    setTimeout(step, deleting?40:60);
  }
  step();
}

// Cursor glow
function initCursorGlow() {
  let glow = document.querySelector('.cursor-glow');
  if (!glow) {
    glow = document.createElement('div'); glow.className = 'cursor-glow'; document.body.appendChild(glow);
  }
  window.addEventListener('mousemove', (e)=>{
    glow.style.left = e.clientX+'px'; glow.style.top = e.clientY+'px'; glow.style.opacity = '1';
    clearTimeout(glow._fade);
    glow._fade = setTimeout(()=>{ glow.style.opacity='0'; }, 800);
  });
}

function initRevealAnimations() {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.hero-content > *, .panel-card, .skill-card, .project-card, .section-heading, .contact-panel').forEach((el) => {
    el.classList.add('reveal');
    observer.observe(el);
  });
}

function initProjectSlider() {
  const projectsList = document.getElementById('projectsList');
  const prevBtn = document.getElementById('projectPrev');
  const nextBtn = document.getElementById('projectNext');

  if (!projectsList || !prevBtn || !nextBtn) return;

  const children = () => Array.from(projectsList.children);

  function scrollToChild(index) {
    const child = projectsList.children[index];
    if (!child) return;
    projectsList.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
  }

  prevBtn.addEventListener('click', () => {
    const scrollLeft = projectsList.scrollLeft;
    const kids = children();
    for (let i = kids.length - 1; i >= 0; i--) {
      if (kids[i].offsetLeft < scrollLeft - 1) {
        scrollToChild(i);
        return;
      }
    }
    projectsList.scrollTo({ left: 0, behavior: 'smooth' });
  });

  nextBtn.addEventListener('click', () => {
    const scrollLeft = projectsList.scrollLeft;
    const kids = children();
    for (let i = 0; i < kids.length; i++) {
      if (kids[i].offsetLeft > scrollLeft + 1) {
        scrollToChild(i);
        return;
      }
    }
    projectsList.scrollTo({ left: projectsList.scrollWidth - projectsList.clientWidth, behavior: 'smooth' });
  });

  // Init basic tilt for mouse/keyboard users
  initProjectInteractions();
}

// Project card interactions & tilt
function initProjectInteractions() {
  const cards = document.querySelectorAll('.project-card');
  cards.forEach((card) => {
    card.style.transformStyle = 'preserve-3d';
    card.style.transition = 'transform 220ms ease, box-shadow 220ms ease';
    const rect = () => card.getBoundingClientRect();

    function onMove(e) {
      const r = rect();
      const mx = (e.clientX - (r.left + r.width/2)) / (r.width/2);
      const my = (e.clientY - (r.top + r.height/2)) / (r.height/2);
      const rx = (-my * 6).toFixed(2);
      const ry = (mx * 8).toFixed(2);
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`;
      card.style.boxShadow = '0 30px 80px rgba(2,6,23,0.6)';
    }

    function onLeave() {
      card.style.transform = '';
      card.style.boxShadow = '';
    }

    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    card.addEventListener('blur', onLeave);
    card.addEventListener('focus', (e) => { card.style.transform = 'perspective(900px) translateZ(6px)'; });

    // subtle parallax for media
    const img = card.querySelector('img');
    if (img) {
      img.style.transition = 'transform 300ms ease';
      card.addEventListener('mousemove', (e) => {
        const r = rect();
        const mx = (e.clientX - (r.left + r.width/2)) / (r.width/2);
        img.style.transform = `translateX(${mx*6}px) translateZ(8px)`;
      });
      card.addEventListener('mouseleave', () => { img.style.transform = ''; });
    }
  });
}

async function populateProjectDetailFromCMS() {
  if (!window.location.pathname.endsWith('project-detail.html')) return;
  const params = new URLSearchParams(window.location.search);
  const index = parseInt(params.get('i'), 10);
  if (Number.isNaN(index)) return;
  try {
    const res = await fetch('/api/data');
    if (!res.ok) return;
    const data = await res.json();
    const project = (data.projects && data.projects[index]) || null;
    if (!project) {
      const h = document.querySelector('h1');
      if (h) h.textContent = 'Project not found';
      return;
    }
    const titleEl = document.getElementById('projectTitle') || document.querySelector('h1');
    const introEl = document.getElementById('projectIntro') || document.querySelector('.intro');
    const metaEl = document.getElementById('projectMeta') || document.querySelector('.section-tag');
    const goalsListEl = document.getElementById('projectGoalsList');
    const deliverablesListEl = document.getElementById('projectDeliverablesList');
    if (titleEl) titleEl.textContent = project.title;
    if (introEl) introEl.textContent = project.desc;
    if (metaEl) metaEl.textContent = project.meta || 'Project';
    if (goalsListEl && Array.isArray(project.goals) && project.goals.length > 0) {
      goalsListEl.innerHTML = project.goals.map((goal) => `<li>${goal}</li>`).join('');
    }
    if (deliverablesListEl && Array.isArray(project.deliverables) && project.deliverables.length > 0) {
      deliverablesListEl.innerHTML = project.deliverables.map((deliverable) => `<li>${deliverable}</li>`).join('');
    }
  } catch (err) {
    // ignore
  }
}

if (navToggle && siteNav) {
  // Position the mobile dropdown centered under the burger button and keep it fixed (no scroll repositioning)
  function positionNav() {
    try {
      const rect = navToggle.getBoundingClientRect();
      siteNav.style.position = 'fixed';
      // temporarily show to measure if hidden
      const wasHidden = getComputedStyle(siteNav).display === 'none';
      if (wasHidden) siteNav.style.display = 'flex';
      const navRect = siteNav.getBoundingClientRect();
      // align menu right edge with burger right edge
      const rightAlignedLeft = Math.round(rect.right - navRect.width);
      const minLeft = 8;
      const maxLeft = Math.max(8, window.innerWidth - navRect.width - 8);
      const clampedLeft = Math.min(Math.max(rightAlignedLeft, minLeft), maxLeft);
      // position slightly closer to burger (smaller gap)
      const top = Math.round(rect.bottom + 4);
      siteNav.style.left = clampedLeft + 'px';
      siteNav.style.top = top + 'px';
      if (wasHidden && !siteNav.classList.contains('open')) siteNav.style.display = 'none';
    } catch (e) {
      // ignore
    }
  }

  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      positionNav();
      window.addEventListener('resize', positionNav);
      // intentionally do NOT reposition on scroll so the menu stays fixed under the burger
    } else {
      window.removeEventListener('resize', positionNav);
    }
  });

  // Close menu with Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && siteNav.classList.contains('open')) {
      siteNav.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.focus();
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (siteNav.classList.contains('open') && !siteNav.contains(e.target) && !navToggle.contains(e.target)) {
      siteNav.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
}


document.querySelectorAll('.site-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    siteNav.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

if (contactForm && formStatus) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!contactForm.checkValidity()) {
      formStatus.textContent = 'Please complete all required fields correctly.';
      formStatus.classList.remove('form-status-success');
      formStatus.classList.add('form-status-error');
      return;
    }

    const formData = new FormData(contactForm);
    const action = contactForm.getAttribute('action') || '';

    if (action.includes('formspree.io') && !action.includes('yourFormId')) {
      try {
        const response = await fetch(action, {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Unable to submit form.');
        }

        formStatus.textContent = 'Thanks! Your message has been sent successfully.';
        formStatus.classList.remove('form-status-error');
        formStatus.classList.add('form-status-success');
        contactForm.reset();
      } catch (error) {
        formStatus.textContent = 'There was an issue sending your message. Please try again later.';
        formStatus.classList.remove('form-status-success');
        formStatus.classList.add('form-status-error');
      }
      return;
    }

    const name = encodeURIComponent(formData.get('name') || '');
    const email = encodeURIComponent(formData.get('email') || '');
    const subject = encodeURIComponent(formData.get('subject') || 'Portfolio inquiry');
    const message = encodeURIComponent(formData.get('message') || '');
    const mailto = `mailto:hello@example.com?subject=${subject}&body=Name:%20${name}%0AEmail:%20${email}%0A%0A${message}`;

    formStatus.textContent = 'Opening your email client so you can send the message directly.';
    formStatus.classList.remove('form-status-error');
    formStatus.classList.add('form-status-success');
    contactForm.reset();
    window.location.href = mailto;
  });
}

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}
