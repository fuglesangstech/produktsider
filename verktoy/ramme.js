/* Toppmeny og bunn på produktsidene – oppfører seg som på www.fuglesangstech.no */
(function () {
  var root = document.documentElement;
  // toppmenyen blir gjennomsiktig med uskarp bakgrunn når siden rulles, «til toppen»-knappen vises
  var top = document.querySelector('.ftx-totop');
  function rull() { var y = window.scrollY > 8; root.classList.toggle('ftx-scrolled', y); if (top) top.classList.toggle('vis', window.scrollY > 700); }
  window.addEventListener('scroll', rull, { passive: true }); rull();
  if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  // «Om oss» i toppmenyen (klikk og tastatur; mus åpner med hover)
  var f = document.querySelector('.hd-folder');
  if (f) {
    var b = f.querySelector('button');
    b.addEventListener('click', function () { var o = !f.classList.contains('open'); f.classList.toggle('open', o); b.setAttribute('aria-expanded', o); });
    document.addEventListener('click', function (e) { if (!f.contains(e.target)) { f.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); } });
  }
  // menyen på mobil
  var bu = document.querySelector('.hd-burger'), m = document.getElementById('hd-meny');
  if (bu && m) {
    var m1 = m.querySelector('.m1'), m2 = m.querySelector('.m2');
    function vis(o) { m.hidden = !o; bu.setAttribute('aria-expanded', o); bu.setAttribute('aria-label', o ? 'Lukk menyen' : 'Åpne menyen'); root.classList.toggle('hd-apen', o); if (!o) { m1.hidden = false; m2.hidden = true; } }
    bu.addEventListener('click', function () { vis(m.hidden); });
    m.querySelector('.m-om').addEventListener('click', function () { m1.hidden = true; m2.hidden = false; });
    m.querySelector('.m-tilbake').addEventListener('click', function () { m2.hidden = true; m1.hidden = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !m.hidden) vis(false); });
    // søket lukker menyen (søket ser etter .burger--active)
    bu.classList.toggle('burger--active', false);
    new MutationObserver(function () { bu.classList.toggle('burger--active', !m.hidden); }).observe(m, { attributes: true, attributeFilter: ['hidden'] });
  }
})();
