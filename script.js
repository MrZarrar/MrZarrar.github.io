const menuIcon = document.querySelector('#menu-icon');
const navbar = document.querySelector('.navbar');

menuIcon.addEventListener('click', () => {
  menuIcon.classList.toggle('bx-x');
  navbar.classList.toggle('active');
});

window.addEventListener('scroll', () => {
  const header = document.querySelector('.header');
  header.classList.toggle('sticky', window.scrollY > 80);

  if (navbar.classList.contains('active')) {
    menuIcon.classList.remove('bx-x');
    navbar.classList.remove('active');
  }

  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('header nav a');
  sections.forEach(sec => {
    const top = window.scrollY;
    const offset = sec.offsetTop - 160;
    const height = sec.offsetHeight;
    const id = sec.getAttribute('id');
    if (top >= offset && top < offset + height) {
      navLinks.forEach(link => link.classList.remove('active'));
      const active = document.querySelector(`header nav a[href*=${id}]`);
      if (active) active.classList.add('active');
    }
  });
});

document.querySelectorAll('.read-more-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    const hidden = btn.previousElementSibling;
    const expanded = hidden.style.display === 'block';
    hidden.style.display = expanded ? 'none' : 'block';
    btn.textContent = expanded ? 'Read More' : 'Read Less';
  });
});

/* Touch tap-to-reveal for project cards */
document.querySelectorAll('.portfolio-box').forEach(box => {
  box.addEventListener('click', () => {
    const isActive = box.classList.contains('active');
    document.querySelectorAll('.portfolio-box').forEach(b => b.classList.remove('active'));
    if (!isActive) box.classList.add('active');
  });
});

/* Scroll reveal */
ScrollReveal({ distance: '60px', duration: 1800, delay: 150 });
ScrollReveal().reveal('.home-content, .heading', { origin: 'top' });
ScrollReveal().reveal('.portfolio-box, .skills-box', { origin: 'bottom', interval: 80 });
ScrollReveal().reveal('.home-bio, .about-content', { origin: 'right' });

/* Typed.js */
new Typed('.multiple-text', {
  strings: ['CS Student', 'Game Developer', 'Web Developer'],
  typeSpeed: 90,
  backSpeed: 60,
  backDelay: 1400,
  loop: true,
});
