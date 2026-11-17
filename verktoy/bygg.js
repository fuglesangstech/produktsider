/*
  Bygger produktsidene for produkter.fuglesangstech.no fra data/produkter.json (se hent-katalog.js).

  Kjør: node verktoy/bygg.js
  Resultat (i roten av repoet, publiseres med GitHub Pages):
    index.html            oversikt over alle produktene, gruppert etter leverandør og kategori
    <produkt-id>/index.html  én side per produkt
    sitemap.xml, robots.txt, 404.html, assets/side.css

  Forhåndsvisning: så lenge filen CNAME ikke finnes, får alle sidene «noindex» og robots.txt stenger for
  søkemotorer. Når domenet er satt opp (CNAME = produkter.fuglesangstech.no), bygges de for Google.

  Katalogen på www.fuglesangstech.no/produkter er fortsatt stedet kundene bruker. Produktsidene er innganger
  fra Google, med «Be om tilbud» (rett i tilbudslisten på www) og «Åpne i produktkatalogen».
*/
const fs = require('fs'), path = require('path');
const ROT = path.join(__dirname, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROT, 'data', 'produkter.json'), 'utf8'));
const CNAME = fs.existsSync(path.join(ROT, 'CNAME')) ? fs.readFileSync(path.join(ROT, 'CNAME'), 'utf8').trim() : '';
const PROD = !!CNAME;                       // produksjon når domenet er satt opp
const BASE = 'https://' + (CNAME || 'produkter.fuglesangstech.no') + '/';
const WWW = 'https://www.fuglesangstech.no';
const LOGO = 'https://images.squarespace-cdn.com/content/v1/677e40c5efe7602e25c6185b/de1bdadc-9976-4265-a30a-3d59328492f1/fuglesangs-tech-logo-transparent.png?format=500w';
const FAVICON = 'https://images.squarespace-cdn.com/content/v1/677e40c5efe7602e25c6185b/6924ef89-fabb-41f0-8c35-1c6046bd6093/favicon.ico';
const BILDE_CDN = 'https://images.squarespace-cdn.com/content/v1/677e40c5efe7602e25c6185b/';
const IDAG = new Date().toISOString().slice(0, 10);

const P = DATA.produkter, LEV = {}, BYID = {};
DATA.leverandorer.forEach(l => { LEV[l.key] = l; });
P.forEach(p => { BYID[p.id] = p; });
const EGNE = {};   // alle produkter har sin side her (også de mest populære)
// Ekstra innhold for utvalgte produkter (spørsmål og svar m.m.), i data/tillegg.json – redigeres for hånd
const TILLEGG = fs.existsSync(path.join(ROT, 'data', 'tillegg.json')) ? JSON.parse(fs.readFileSync(path.join(ROT, 'data', 'tillegg.json'), 'utf8')) : {};

/* ---------- hjelpere ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lev = p => LEV[p.sup] || { navn: p.supNavn || '', kort: '', side: '', sole: '' };
function merke(p) {   // «Chesterton 785 Parting Lubricant», «LE Monolec® …», men ikke «Chesterton Chesterton …»
  const l = lev(p), k = p.sup === 'le' ? 'LE' : p.sup === 'rpi' ? 'Royal Purple' : l.navn;
  return new RegExp('^(' + [l.navn, l.kort, k, p.sup === 'perma' ? 'perma' : ''].filter(Boolean).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'i').test(p.navn) ? p.navn : k + ' ' + p.navn;
}
function kutt(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; s = s.slice(0, n - 1); return s.slice(0, s.lastIndexOf(' ')).replace(/[,;:–-]$/, '') + '…'; }
function b64url(s) { return Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
// samme format som tilbudslisten på www: [lev, navn, nr, variant, emb, fett, varenr, antall, url]
function tilbud(p, v) {
  const r = [lev(p).navn, p.navn, v && v.no && v.no !== '–' ? v.no : (p.varianter.length > 1 ? '' : (p.code || '')), v ? (v.grade || '') : '', '', '', '', 1, '/produkter#' + p.id];
  while (r.length && r[r.length - 1] === '') r.pop();
  return WWW + '/tilbud#legg=' + b64url(JSON.stringify([r]));
}
const katUrl = p => WWW + '/produkter?lev=' + encodeURIComponent(p.sup) + '&kat=' + encodeURIComponent(p.kat);
const levUrl = p => WWW + '/produkter?lev=' + encodeURIComponent(p.sup);
const sideUrl = p => BASE + encodeURIComponent(p.id) + '/';
const kanonisk = p => EGNE[p.id] ? WWW + EGNE[p.id].replace(/#.*$/, '') : sideUrl(p);
const SPRAK = { NO: 'norsk', EN: 'engelsk', SV: 'svensk', DA: 'dansk', DE: 'tysk' };

/* ---------- felles ramme ---------- */
function ramme(o) {
  const robots = PROD && !o.noindex ? 'index,follow' : 'noindex,nofollow';
  return `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.tittel)}</title>
<meta name="description" content="${esc(o.beskr)}">
<meta name="robots" content="${robots}">
${o.kanon ? `<link rel="canonical" href="${esc(o.kanon)}">` : ''}
<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:site_name" content="Fuglesangs Tech">
<meta property="og:title" content="${esc(o.ogTittel || o.tittel)}">
<meta property="og:description" content="${esc(o.beskr)}">
${o.kanon ? `<meta property="og:url" content="${esc(o.kanon)}">` : ''}
${o.bilde ? `<meta property="og:image" content="${esc(o.bilde)}">` : ''}
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${o.rel}assets/side.css?v=${IDAG}">
${(o.ld || []).map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
${PROD ? '' : '<div class="fv">Forhåndsvisning – ikke synlig i Google ennå</div>'}
<header class="hd"><div class="wrap">
  <a class="logo" href="${WWW}/"><img src="${LOGO}" alt="Fuglesangs Tech" width="250" height="68"></a>
  <nav aria-label="Hovedmeny"><a href="${WWW}/produkter">Produkter</a><a href="${WWW}/tjenester">Tjenester</a><a href="${WWW}/leverandorer">Leverandører</a><a href="${WWW}/artikler">Artikler</a><a href="${WWW}/kontakt-oss">Kontakt</a></nav>
  <a class="hd-cta" href="${WWW}/tilbud">Tilbudslisten</a>
</div></header>
<main class="wrap">
${o.innhold}
</main>
<footer class="ft"><div class="wrap">
  <div><b>Fuglesangs Tech AS</b><br>Organisasjonsnr. 985 081 220<br>Caspar Storms vei 21, 0664 Oslo<br>Tlf. <a href="tel:+4722542000">22 54 20 00</a> (man–fre 08:00–16:00)<br><a href="mailto:post@fuglesangstech.no">post@fuglesangstech.no</a></div>
  <div><b>Fuglesangs Tech er en del av Fuglesangs-gruppen</b><br><a href="${WWW}/om-oss">Om oss</a> · <a href="${WWW}/vre-ansatte">Våre ansatte</a> · <a href="${WWW}/datablad">Datablad</a> · <a href="${WWW}/personvern">Personvern</a></div>
</div></footer>
</body>
</html>
`;
}

/* ---------- produktside ---------- */
function dokListe(tittel, lst) {
  if (!lst || !lst.length) return '';
  return `<h3>${tittel}</h3><ul class="docs">` + lst.map(d => `<li><a href="${esc(d[2])}" target="_blank" rel="noopener"><span class="t">${esc(d[0])}</span><span class="m">PDF${SPRAK[d[1]] ? ' · ' + SPRAK[d[1]] : ''}</span></a></li>`).join('') + '</ul>';
}
function produktside(p) {
  const l = lev(p), navn = merke(p), rel = '../';
  const tekst = (p.paras && p.paras.length ? p.paras : [p.short || p.tagline]).filter(Boolean);
  const tags = (p.eg || []).filter(e => e !== 'Norsk sikkerhetsdatablad');
  const multi = p.varianter.length > 1;
  const harPack = p.varianter.some(v => v.packs && v.packs.length), harDesc = p.varianter.some(v => v.desc);
  const vt = p.varianter.length ? `<section class="sec"><h2>${p.gradeLabel ? 'Varianter' : 'Emballasje og produktnummer'}</h2>${p.vintro ? `<p class="lead2">${esc(p.vintro)}</p>` : ''}
    <div class="tbl"><table><thead><tr><th>${esc(p.noLabel || 'Produktnr.')}</th>${p.gradeLabel ? `<th>${esc(p.gradeLabel)}</th>` : ''}${harDesc ? `<th>${esc(p.descLabel || 'Merknad')}</th>` : ''}${harPack ? '<th>Emballasje</th>' : ''}<th><span class="sr">Tilbud</span></th></tr></thead><tbody>` +
    p.varianter.map(v => `<tr><td class="no">${esc(v.no || '–')}</td>${p.gradeLabel ? `<td>${esc(v.grade || '–')}</td>` : ''}${harDesc ? `<td>${esc(v.desc || '–')}</td>` : ''}${harPack ? `<td>${esc((v.packs || []).join(', ') || '–')}</td>` : ''}<td class="q"><a href="${esc(tilbud(p, multi ? v : null))}">Be om tilbud</a></td></tr>`).join('') +
    '</tbody></table></div></section>' : '';
  const spec = (p.spec || []).length ? `<dl class="spec">${p.spec.map(s => `<dt>${esc(s[0])}</dt><dd>${esc(s[1])}</dd>`).join('')}${!p.varianter.length && p.packs && p.packs.length ? `<dt>Emballasje</dt><dd>${esc(p.packs.join(', '))}</dd>` : ''}</dl>` :
    (!p.varianter.length && p.packs && p.packs.length ? `<dl class="spec"><dt>Emballasje</dt><dd>${esc(p.packs.join(', '))}</dd></dl>` : '');
  const docs = dokListe('Sikkerhetsdatablad (SDS)', p.sds) + dokListe('Produktdatablad (PDS)', p.pds) + dokListe('Bruksanvisning', p.manual) + dokListe('Sertifikater og godkjenninger', p.cert);
  const res = (p.ressurser || []).slice(0, 8);
  const resHtml = res.length ? `<section class="sec"><h2>Case studies og fagstoff</h2><ul class="docs">${res.map(r => `<li><a href="${esc(r.url)}"${/^https:\/\/www\.fuglesangstech\.no\//.test(r.url) ? '' : ' target="_blank" rel="noopener"'}><span class="t">${esc(r.navn)}</span><span class="m">${esc([r.gruppe, r.sprak].filter(Boolean).join(' · '))}</span></a></li>`).join('')}</ul></section>` : '';
  const flere = P.filter(x => x.id !== p.id && x.sup === p.sup && x.kat === p.kat && !x.utgatt).slice(0, 8);
  const ut = p.utgatt ? `<div class="utg" role="note"><b>Utgår</b><p>${esc(p.utgatt.tekst)}</p>${p.utgatt.alt.length ? '<p>Vi anbefaler i stedet:</p><ul>' + p.utgatt.alt.map(a => `<li><a href="${rel}${encodeURIComponent(a.id)}/">${esc(BYID[a.id] ? merke(BYID[a.id]) : a.navn)}</a>${a.hvorfor ? ' – ' + esc(a.hvorfor.charAt(0).toLowerCase() + a.hvorfor.slice(1)) : ''}</li>`).join('') + '</ul>' : ''}${p.utgatt.merknad ? `<small>${esc(p.utgatt.merknad)}</small>` : ''}</div>` : '';
  const k = p.kontakt;
  const kontakt = k ? `<section class="sec kontakt">${k.bilde ? `<img src="${esc(BILDE_CDN + k.bilde)}?format=200w" alt="" width="72" height="72" loading="lazy">` : ''}<div><b>${esc(k.navn)}</b>${esc([k.tittel, k.omr].filter(Boolean).join(', '))}<br>${k.tlf ? `<a href="tel:${esc(k.tlf.replace(/\s/g, ''))}">${esc(k.tlf)}</a>` : ''}${k.tlf && k.epost ? ' · ' : ''}${k.epost ? `<a href="mailto:${esc(k.epost)}">${esc(k.epost)}</a>` : ''}</div><a class="btn light" href="${esc(tilbud(p, null))}">Be om tilbud</a></section>` : '';
  const T = TILLEGG[p.id] || {};
  const faq = (T.faq || []).length ? `<section class="sec"><h2>Spørsmål og svar</h2><div class="faq">${T.faq.map(f => `<details><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join('')}</div></section>` : '';
  const egen = EGNE[p.id] ? `<p class="egen">Les mer om ${esc(navn)} – bruk, forskjeller og spørsmål – på <a href="${WWW}${esc(EGNE[p.id])}">fuglesangstech.no</a>.</p>` : '';
  const bilder = p.bilder || [];
  const galleri = bilder.length ? `<div class="gal"><div class="hoved"><img id="gal-img" src="${esc(bilder[0])}" alt="${esc(navn)}" width="560" height="560"></div>${bilder.length > 1 ? `<div class="tn">${bilder.map((b, i) => `<button type="button" data-src="${esc(b)}"${i ? '' : ' aria-current="true"'}><img src="${esc(b)}" alt="" width="72" height="72" loading="lazy"></button>`).join('')}</div>` : ''}</div>` : '<div class="gal tom"></div>';
  const beskr = kutt(`${navn}: ${tekst[0] || p.kat}`, 158);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Product', name: navn, sku: p.code || undefined, mpn: p.code || undefined, brand: { '@type': 'Brand', name: l.navn }, image: bilder.length ? bilder : undefined, description: tekst.join(' '), category: p.kat, url: kanonisk(p) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Fuglesangs Tech', item: WWW + '/' },
      { '@type': 'ListItem', position: 2, name: 'Produkter', item: BASE },
      { '@type': 'ListItem', position: 3, name: l.navn, item: BASE + '#' + p.sup },
      { '@type': 'ListItem', position: 4, name: navn, item: sideUrl(p) }] }
  ];
  if ((T.faq || []).length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: T.faq.map(f => ({ '@type': 'Question', name: f[0], acceptedAnswer: { '@type': 'Answer', text: f[1] } })) });
  const innhold = `
<p class="crumb"><a href="${WWW}/">Forside</a> / <a href="${rel}">Produkter</a> / <a href="${esc(levUrl(p))}">${esc(l.navn)}</a> / <a href="${esc(katUrl(p))}">${esc(p.kat)}</a></p>
<article class="prod">
  ${galleri}
  <div class="info">
    <p class="eyebrow">${esc(l.navn)} · ${esc(p.kat)}</p>
    <h1>${esc(navn)}</h1>
    ${p.code ? `<p class="pno">Produktnr. ${esc(p.code)}</p>` : ''}
    ${ut}
    ${tags.length ? `<p class="tags">${tags.map(t => `<span${/H1/.test(t) ? ' class="h1"' : ''}>${esc(t)}</span>`).join('')}</p>` : ''}
    <div class="body">${tekst.map(t => `<p>${esc(t)}</p>`).join('')}</div>
    ${egen}
    <div class="cta"><a class="btn" href="${esc(tilbud(p, null))}">Be om tilbud</a><a class="btn alt" href="${WWW}/produkter#${encodeURIComponent(p.id)}">Åpne i produktkatalogen</a></div>
    <p class="cta-note">Vi svarer med pris og leveringstid. Du kan samle flere produkter i tilbudslisten før du sender.</p>
    ${spec ? `<h2 class="h2s">Tekniske data</h2>${spec}` : ''}
    ${p.href ? `<p class="ext"><a href="${esc(p.href)}" target="_blank" rel="noopener">Produktside hos ${esc(l.kort || l.navn)} (engelsk) ↗</a></p>` : ''}
  </div>
</article>
${vt}
${docs ? `<section class="sec"><h2>Datablad og sertifikater</h2>${docs}<p class="note">Alle datablad finner du også i <a href="${WWW}/datablad">databladoversikten</a>, der du kan lage stoffkartotek.</p></section>` : ''}
${faq}
${resHtml}
<section class="sec"><h2>Leverandør</h2><p>${esc(l.navn)}. ${esc(l.sole)} ${l.side ? `<a href="${WWW}${esc(l.side)}">Les mer om ${esc(l.kort || l.navn)}</a>` : ''}</p></section>
${kontakt}
${flere.length ? `<section class="sec"><h2>Flere produkter i ${esc(p.kat.toLowerCase())}</h2><ul class="flere">${flere.map(x => `<li><a href="${rel}${encodeURIComponent(x.id)}/">${x.bilder && x.bilder[0] ? `<img src="${esc(x.bilder[0])}" alt="" width="64" height="64" loading="lazy">` : '<span class="ph"></span>'}<span><b>${esc(merke(x))}</b><small>${esc(kutt(x.short || (x.paras || [])[0] || '', 90))}</small></span></a></li>`).join('')}</ul></section>` : ''}
<script>
(function () {
  var g = document.querySelector('.gal .tn'); if (!g) return;
  g.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    document.getElementById('gal-img').src = b.getAttribute('data-src');
    [].forEach.call(g.querySelectorAll('button'), function (x) { x.removeAttribute('aria-current'); }); b.setAttribute('aria-current', 'true');
  });
})();
</script>`;
  const tt = (navn + ' – ' + p.kat).length <= 58 ? navn + ' – ' + p.kat : kutt(navn, 58);
  return ramme({ tittel: tt + ' | Fuglesangs Tech', ogTittel: navn, beskr, kanon: kanonisk(p), bilde: bilder[0], ld, rel, innhold, ogType: 'product' });
}

/* ---------- oversikt ---------- */
function oversikt() {
  const grupper = DATA.leverandorer.filter(l => P.some(p => p.sup === l.key));
  const innhold = `
<p class="crumb"><a href="${WWW}/">Forside</a> / Produkter</p>
<h1>Produkter fra Fuglesangs Tech</h1>
<p class="lead">Smøremidler, vedlikeholdsprodukter, belegg og smøreutstyr fra ${grupper.map(l => esc(l.navn)).join(', ').replace(/, ([^,]*)$/, ' og $1')}, med norske sikkerhetsdatablad. Ta kontakt for pris og leveringstid.</p>
<div class="cta"><a class="btn" href="${WWW}/produkter">Søk og filtrer i produktkatalogen</a><a class="btn alt" href="${WWW}/produkter#veileder">Hjelp meg å velge</a></div>
${grupper.map(l => {
  const ps = P.filter(p => p.sup === l.key), kats = [...new Set(ps.map(p => p.kat))];
  return `<section class="sec ovs" id="${esc(l.key)}"><h2>${esc(l.navn)} <small>${ps.length} produkter</small></h2><p>${esc(l.sole)}</p>` +
    kats.map(k => `<h3>${esc(k)}</h3><ul class="liste">${ps.filter(p => p.kat === k).map(p => `<li><a href="${encodeURIComponent(p.id)}/">${esc(merke(p))}</a>${p.utgatt ? ' <em>utgår</em>' : ''}</li>`).join('')}</ul>`).join('') + '</section>';
}).join('')}`;
  return ramme({ tittel: 'Produkter – smøremidler, belegg og vedlikehold | Fuglesangs Tech', beskr: `Over ${Math.floor(P.length / 10) * 10} produkter fra Chesterton, LE, UTB, Royal Purple Industrial, BioMax, Vickers Oils og Perma-Tec, med norske datablad.`, kanon: BASE, rel: '', innhold,
    ld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Produkter fra Fuglesangs Tech', url: BASE }] });
}

/* ---------- skriv filer ---------- */
function skriv(rel, innhold) { const f = path.join(ROT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, innhold); }
// fjern sider for produkter som ikke lenger finnes (mapper med index.html som ikke er en kjent produkt-id)
const BEHOLD = new Set(['assets', 'data', 'verktoy', '.git', '.github', 'node_modules']);
fs.readdirSync(ROT, { withFileTypes: true }).forEach(d => {
  if (d.isDirectory() && !BEHOLD.has(d.name) && !BYID[d.name] && fs.existsSync(path.join(ROT, d.name, 'index.html'))) fs.rmSync(path.join(ROT, d.name), { recursive: true });
});
P.forEach(p => skriv(p.id + '/index.html', produktside(p)));
skriv('index.html', oversikt());
skriv('404.html', ramme({ tittel: 'Fant ikke siden | Fuglesangs Tech', beskr: 'Siden finnes ikke.', rel: '/', noindex: true, innhold: `<h1>Fant ikke produktet</h1><p class="lead">Produktet kan ha fått ny adresse eller er tatt ut av sortimentet.</p><div class="cta"><a class="btn" href="${WWW}/produkter">Gå til produktkatalogen</a><a class="btn alt" href="/">Alle produkter</a></div>` }));
skriv('assets/side.css', fs.readFileSync(path.join(__dirname, 'side.css'), 'utf8'));
const urls = [BASE].concat(P.filter(p => !EGNE[p.id]).map(sideUrl));
skriv('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(u => `<url><loc>${esc(u)}</loc><lastmod>${IDAG}</lastmod></url>`).join('\n') + '\n</urlset>\n');
skriv('robots.txt', PROD ? `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
skriv('.nojekyll', '');
console.log(`Bygget ${P.length} produktsider (${PROD ? 'for ' + CNAME : 'forhåndsvisning, noindex'}).`);
