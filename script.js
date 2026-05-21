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
      const footerName = document.querySelector('.footer-inner p span');
      if (footerName) footerName.textContent = data.name;
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
        projectsList.innerHTML = data.projects.map((p, i) => `
          <article class="project-card reveal">
            <div class="project-meta">${p.meta}</div>
            <h3>${p.title}</h3>
            <p>${p.desc}</p>
            <a class="button secondary project-link" href="project-detail.html?i=${i}">View details</a>
          </article>
        `).join('');
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

  initRevealAnimations();
  initProjectSlider();
  await populateProjectDetailFromCMS();
}

startApp();

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
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
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
