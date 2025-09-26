document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.nav-toggle');
  const menu = document.getElementById('navLinks');

  if (!btn || !menu) return;

  function open(v) {
    if (v) {
      menu.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    } else {
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    open(!menu.classList.contains('open'));
  });

  // Закрыть при клике по ссылке
  menu.addEventListener('click', (e) => {
    if (e.target.tagName.toLowerCase() === 'a') open(false);
  });

  // Закрыть при клике вне меню
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) open(false);
  });

  // Закрыть по Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') open(false);
  });
});
