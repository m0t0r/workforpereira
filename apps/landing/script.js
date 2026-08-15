document.querySelectorAll('[data-toast]').forEach((button) => {
  button.addEventListener('click', () => {
    const toast = document.querySelector('.toast');
    toast.textContent = button.dataset.toast;
    toast.classList.add('is-visible');
    window.clearTimeout(window.toastTimeout);
    window.toastTimeout = window.setTimeout(() => toast.classList.remove('is-visible'), 3400);
  });
});

document.querySelectorAll('.quick-search button').forEach((button) => {
  button.addEventListener('click', () => {
    const field = document.querySelector('.search-panel input');
    if (field) field.value = button.textContent;
  });
});

document.querySelectorAll('[data-save]').forEach((button) => {
  button.addEventListener('click', () => {
    const saved = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!saved));
    button.setAttribute('aria-label', `${saved ? 'Guardar' : 'Quitar de guardadas'} ${button.closest('.compact-job')?.querySelector('h3')?.textContent ?? 'vacante'}`);
    const toast = document.querySelector('.toast');
    toast.textContent = saved ? 'Quitamos la vacante de tu lista.' : 'Guardamos la vacante para que la revises después.';
    toast.classList.add('is-visible');
    window.clearTimeout(window.toastTimeout);
    window.toastTimeout = window.setTimeout(() => toast.classList.remove('is-visible'), 3400);
  });
});
