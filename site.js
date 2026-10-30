(() => {
  const header = document.querySelector('header');
  const menuButton = document.querySelector('button[aria-label="Abrir menu"]');
  if (!header || !menuButton) return;

  const links = [
    ['Sobre', '#sobre'],
    ['Atuação', '#atuacao'],
    ['Empresas', '#empresas'],
    ['Psicologia', '#psicologia'],
    ['Conteúdos', '#conteudos'],
    ['Mídia', '#midia'],
    ['Avaliações', '#avaliacoes'],
  ];

  let panel = header.querySelector('nav[aria-label="Navegação mobile"]');
  if (!panel) {
    panel = document.createElement('nav');
    panel.setAttribute('aria-label', 'Navegação mobile');
    panel.style.cssText = 'position:absolute;top:100%;left:0;right:0;padding:1rem 1.25rem 1.25rem;background:var(--background);border-bottom:1px solid var(--border);box-shadow:0 12px 30px rgba(54,19,49,.08);display:grid;gap:.25rem;';
    panel.innerHTML = links.map(([label, href]) => `<a href="${href}" style="padding:.75rem 0;font-size:.68rem;font-weight:700;letter-spacing:.11em;text-transform:uppercase;">${label}</a>`).join('');
    header.appendChild(panel);
  }
  panel.hidden = true;

  const setExpanded = (expanded) => {
    panel.hidden = !expanded;
    menuButton.setAttribute('aria-expanded', String(expanded));
    menuButton.setAttribute('aria-label', expanded ? 'Fechar menu' : 'Abrir menu');
  };

  menuButton.addEventListener('click', () => setExpanded(panel.hidden));
  panel.addEventListener('click', () => setExpanded(false));
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) setExpanded(false);
  });
})();
