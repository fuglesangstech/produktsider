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
const CSS = fs.readFileSync(path.join(__dirname, 'side.css'), 'utf8');
const CSSV = require('crypto').createHash('md5').update(CSS + fs.readFileSync(path.join(__dirname, 'ramme.js'), 'utf8')).digest('hex').slice(0, 8);   // endres bare når stilen endres
// lastmod i sitemap: behold forrige dato for sider som ikke er endret (så Google ser hva som faktisk er nytt)
const FORRIGE = {};
try { fs.readFileSync(path.join(ROT, 'sitemap.xml'), 'utf8').replace(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g, (m, u, d) => { FORRIGE[u] = d; }); } catch (e) {}
const LASTMOD = {};
const SOK_IKON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
const RAMME_JS = fs.readFileSync(path.join(__dirname, 'ramme.js'), 'utf8');

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
<link rel="stylesheet" href="${o.rel}assets/side.css?v=${CSSV}">
${(o.ld || []).map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
${PROD ? '' : '<div class="fv">Forhåndsvisning – ikke synlig i Google ennå</div>'}
<header class="hd" id="hd">
  <a class="logo" href="${WWW}/"><img src="${LOGO}" alt="Fuglesangs Tech" width="255" height="79"></a>
  <nav class="hd-nav" aria-label="Hovedmeny">
    <a href="${WWW}/produkter">Produkter</a><a href="${WWW}/tjenester">Tjenester</a><a href="${WWW}/leverandorer">Leverandører</a><a href="${WWW}/artikler">Artikler</a>
    <div class="hd-folder"><button type="button" aria-expanded="false" aria-controls="hd-om">Om oss<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M5 13.5l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></button>
      <div class="hd-dd" id="hd-om"><a href="${WWW}/om-oss">Om oss</a><a href="${WWW}/vre-ansatte">Ansatte</a><a href="${WWW}/kontakt-oss">Kontakt</a></div></div>
  </nav>
  <div class="hd-right"><a href="/search" class="fts-btn" aria-label="Søk i produkter og sider">${SOK_IKON}<span class="fts-t">Søk</span><span class="fts-k" aria-hidden="true" title="Trykk / for å søke">/</span></a></div>
  <div class="hd-mob"><a href="/search" class="fts-btn fts-mob" aria-label="Søk i produkter og sider">${SOK_IKON}</a>
    <button type="button" class="hd-burger header-burger-btn" aria-label="Åpne menyen" aria-expanded="false" aria-controls="hd-meny"><span></span><span></span></button></div>
</header>
<div class="hd-meny" id="hd-meny" hidden>
  <nav class="m1"><a href="${WWW}/produkter">Produkter</a><a href="${WWW}/tjenester">Tjenester</a><a href="${WWW}/leverandorer">Leverandører</a><a href="${WWW}/artikler">Artikler</a><button type="button" class="m-om">Om oss<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M8 4l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.3"/></svg></button></nav>
  <nav class="m2" hidden><button type="button" class="m-tilbake"><svg viewBox="0 0 22 22" aria-hidden="true"><path d="M14 4l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>Tilbake</button><a href="${WWW}/om-oss">Om oss</a><a href="${WWW}/vre-ansatte">Ansatte</a><a href="${WWW}/kontakt-oss">Kontakt</a></nav>
</div>
<main class="wrap">
${o.innhold}
</main>
<footer class="ft">
  <div class="ft-c1"><h4>Fuglesangs Tech AS</h4><p>Organisasjonsnr. 985 081 220<br>Caspar Storms vei 21, 0664 Oslo<br>Tlf: <a href="tel:22542000">22 54 20 00</a> (man-fre 08:00-16:00)<br>Etter 16:00: <a href="tel:91542002">915 42 002</a></p></div>
  <div class="ft-c2"><p>Fuglesangs Tech er en del av Fuglesangs-gruppen:</p><p class="grp"><a href="https://www.fuglesangs.no/nb/">Fuglesangs AS</a><br><a href="https://www.fsubsea.com/">FSubsea AS</a><br><a href="https://www.flocean.green/">Flocean AS</a></p></div>
  <div class="ft-c3"><div class="soc">
    <a href="https://www.linkedin.com/company/fuglesangs-tech/" target="_blank" rel="noopener" aria-label="LinkedIn"><svg viewBox="0 0 24 24"><path d="M6.94 8.5H3.56V20h3.38V8.5zM5.25 3.5a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92zM20.44 13.3c0-3.1-1.66-4.55-3.87-4.55-1.78 0-2.58.98-3.03 1.67V8.5h-3.38c.05.95 0 11.5 0 11.5h3.38v-6.42c0-.34.02-.69.13-.93.27-.69.89-1.4 1.94-1.4 1.37 0 1.92 1.05 1.92 2.58V20h3.38l-.47-6.7z" fill="currentColor"/></svg></a>
    <a href="https://www.instagram.com/fuglesangs_tech/" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg></a>
    <a href="https://www.facebook.com/profile.php?id=61581818741869" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M13.4 21v-7.6h2.6l.4-3h-3V8.5c0-.86.24-1.45 1.48-1.45h1.58V4.37a21 21 0 0 0-2.3-.12c-2.28 0-3.84 1.39-3.84 3.95v2.2H7.73v3h2.59V21h3.08z" fill="currentColor"/></svg></a>
  </div><p class="pv"><a href="${WWW}/personvern">Personvern</a></p></div>
</footer>
<button type="button" class="ftx-totop" aria-label="Til toppen av siden"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
<script>window.FT_SOK = { www: '${WWW}', data: '${o.rel}assets/sok.json', produkt: '${o.rel}{id}/' };</script>
<script src="https://fuglesangstech.github.io/fuglesangstech-datablad/nett/sok.js"></script>
<script src="${o.rel}assets/ramme.js?v=${CSSV}"></script>
</body>
</html>
`;
}

/* ---------- produktside ---------- */
function dokListe(tittel, lst, kort) {
  if (!lst || !lst.length) return '';
  // «380» alene sier lite – vis «Sikkerhetsdatablad 380»
  const navn = d => /^[\d\s()A-Z.\-–,/]+$/.test(d[0]) && !/^(SDS|PDS)\b/.test(d[0]) ? kort + ' ' + d[0] : d[0];
  const li = d => `<li><a href="${esc(d[2])}" target="_blank" rel="noopener"><span class="t">${esc(navn(d))}</span><span class="m">PDF${SPRAK[d[1]] ? ' · ' + SPRAK[d[1]] : ''}</span></a></li>`;
  const MAX = 6;
  return `<h3>${tittel}</h3><ul class="docs">` + lst.slice(0, MAX).map(li).join('') + '</ul>' +
    (lst.length > MAX ? `<details class="flere-dok"><summary>Vis alle ${lst.length}</summary><ul class="docs">${lst.slice(MAX).map(li).join('')}</ul></details>` : '');
}
// samme regler som katalogen på /produkter (erFett/erOlje der)
const erFett = x => /^(Industrifett|Fett)$/.test(x.kat) || (x.gradeLabel === 'NLGI-klasse' && !/Fettpresser|Rengjøring/.test(x.kat));
const erOlje = x => !erFett(x) && /oljer$|^Wire og kjetting$|^Åpne gir$/.test(x.kat) && !(x.packs || []).every(k => /spray/i.test(k));
// smøreapparater som leveres fylt: hvilke smøremidler kan de fylles med (samme regel som katalogen)
function fyllListe(p) {
  if (!p.fettValg && !p.fyll) return '';
  const f = p.fyll, olje = f && f.type === 'olje';
  const l = P.filter(x => x.sup !== 'perma' && !x.utgatt && (f ? x.sup === f.lev && (olje ? erOlje(x) : erFett(x)) : erFett(x)));
  if (!l.length) return '';
  const grp = {}; l.forEach(x => { (grp[lev(x).navn] = grp[lev(x).navn] || []).push(x); });
  return `<section class="sec"><h2>Fylles med ${olje ? 'olje' : 'fett'} fra ${f ? esc(lev(p).navn) : 'Fuglesangs Tech'}</h2><p class="lead2">${olje ? 'Apparatet leveres fylt med olje' : 'Apparatet leveres fylt med fett'} etter eget valg. Er du usikker, hjelper vi deg å velge riktig til bruksområdet – skriv det i forespørselen.</p>` +
    Object.keys(grp).sort().map(k => `<h3>${esc(k)}</h3><ul class="liste">${grp[k].sort((a, b) => a.navn.localeCompare(b.navn, 'nb', { numeric: true })).map(x => `<li><a href="../${encodeURIComponent(x.id)}/">${esc(x.navn)}</a></li>`).join('')}</ul>`).join('') + '</section>';
}
const PLASS = '<svg class="plass" viewBox="0 0 120 120" aria-hidden="true"><rect x="1" y="1" width="118" height="118" rx="14" fill="#f3f6fb" stroke="#d6dbe2"/><path d="M48 36h24v10l6 8v34a6 6 0 0 1-6 6H48a6 6 0 0 1-6-6V54l6-8z" fill="none" stroke="#9aa9bf" stroke-width="3" stroke-linejoin="round"/><path d="M48 46h24" stroke="#9aa9bf" stroke-width="3"/></svg>';
function produktside(p) {
  const l = lev(p), navn = merke(p), rel = '../';
  const tekst = (p.paras && p.paras.length ? p.paras : [p.short || p.tagline]).filter(Boolean);
  const tags = (p.eg || []).filter(e => e !== 'Norsk sikkerhetsdatablad');
  const multi = p.varianter.length > 1;
  const harPack = p.varianter.some(v => v.packs && v.packs.length), harDesc = p.varianter.some(v => v.desc);
  const vt = p.varianter.length ? `<section class="sec"><h2>${p.gradeLabel ? 'Varianter' : 'Emballasje og produktnummer'}</h2>${p.vintro ? `<p class="lead2">${esc(p.vintro)}</p>` : ''}
    <div class="tbl"><table><thead><tr><th>${esc(p.noLabel || 'Produktnr.')}</th>${p.gradeLabel ? `<th>${esc(p.gradeLabel)}</th>` : ''}${harDesc ? `<th>${esc(p.descLabel || 'Merknad')}</th>` : ''}${harPack ? '<th>Emballasje</th>' : ''}<th><span class="sr">Tilbud</span></th></tr></thead><tbody>` +
    p.varianter.map(v => `<tr><td class="no">${esc(v.no || '–')}</td>${p.gradeLabel ? `<td data-l="${esc(p.gradeLabel)}">${esc(v.grade || '–')}</td>` : ''}${harDesc ? `<td data-l="${esc(p.descLabel || 'Merknad')}">${esc(v.desc || '–')}</td>` : ''}${harPack ? `<td data-l="Emballasje">${esc((v.packs || []).join(', ') || '–')}</td>` : ''}<td class="q"><a href="${esc(tilbud(p, multi ? v : null))}">Be om tilbud</a></td></tr>`).join('') +
    '</tbody></table></div></section>' : '';
  const spec = (p.spec || []).length ? `<dl class="spec">${p.spec.map(s => `<dt>${esc(s[0])}</dt><dd>${esc(s[1])}</dd>`).join('')}${!p.varianter.length && p.packs && p.packs.length ? `<dt>Emballasje</dt><dd>${esc(p.packs.join(', '))}</dd>` : ''}</dl>` :
    (!p.varianter.length && p.packs && p.packs.length ? `<dl class="spec"><dt>Emballasje</dt><dd>${esc(p.packs.join(', '))}</dd></dl>` : '');
  const docs = dokListe('Sikkerhetsdatablad (SDS)', p.sds, 'Sikkerhetsdatablad') + dokListe('Produktdatablad (PDS)', p.pds, 'Produktdatablad') + dokListe('Bruksanvisning', p.manual, 'Bruksanvisning') + dokListe('Sertifikater og godkjenninger', p.cert, 'Sertifikat');
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
  const galleri = bilder.length ? `<div class="gal"><div class="hoved"><img id="gal-img" src="${esc(bilder[0])}" alt="${esc(navn)}" width="560" height="560"></div>${bilder.length > 1 ? `<div class="tn">${bilder.map((b, i) => `<button type="button" data-src="${esc(b)}"${i ? '' : ' aria-current="true"'}><img src="${esc(b)}" alt="" width="72" height="72" loading="lazy"></button>`).join('')}</div>` : ''}</div>` : `<div class="gal tom"><div class="hoved">${PLASS}<p>Bilde kommer</p></div></div>`;
  const beskr = kutt(`${navn}: ${tekst[0] || p.kat}`, 158);
  const ld = [
    // Ingen Product-data: Google krever pris eller omtaler for produktutdrag, og uten dem melder Search Console feil på alle sidene.
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
${fyllListe(p)}
<section class="sec"><h2>Om ${esc(l.navn)}</h2><p>${esc(l.sole)} ${l.side ? `<a href="${WWW}${esc(l.side)}">Les mer om ${esc(l.kort || l.navn)} →</a>` : ''}</p></section>
${kontakt}
${flere.length ? `<section class="sec"><h2>Flere produkter i ${esc(p.kat.toLowerCase())}</h2><ul class="flere">${flere.map(x => `<li><a href="${rel}${encodeURIComponent(x.id)}/">${x.bilder && x.bilder[0] ? `<img src="${esc(x.bilder[0])}" alt="" width="64" height="64" loading="lazy">` : `<span class="ph">${PLASS}</span>`}<span><b>${esc(merke(x))}</b><small>${esc(kutt(x.short || (x.paras || [])[0] || '', 90))}</small></span></a></li>`).join('')}</ul></section>` : ''}
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
let endret = 0;
function skriv(rel, innhold) {
  const f = path.join(ROT, rel); fs.mkdirSync(path.dirname(f), { recursive: true });
  let gml = null; try { gml = fs.readFileSync(f, 'utf8'); } catch (e) {}
  if (gml === innhold) return false;
  fs.writeFileSync(f, innhold); endret++; return true;
}
// fjern sider for produkter som ikke lenger finnes (mapper med index.html som ikke er en kjent produkt-id)
const BEHOLD = new Set(['assets', 'data', 'verktoy', '.git', '.github', 'node_modules']);
fs.readdirSync(ROT, { withFileTypes: true }).forEach(d => {
  if (d.isDirectory() && !BEHOLD.has(d.name) && !BYID[d.name] && fs.existsSync(path.join(ROT, d.name, 'index.html'))) fs.rmSync(path.join(ROT, d.name), { recursive: true });
});
P.forEach(p => { const ny = skriv(p.id + '/index.html', produktside(p)); const u = sideUrl(p); LASTMOD[u] = ny || !FORRIGE[u] ? IDAG : FORRIGE[u]; });
LASTMOD[BASE] = skriv('index.html', oversikt()) || !FORRIGE[BASE] ? IDAG : FORRIGE[BASE];
skriv('404.html', ramme({ tittel: 'Fant ikke siden | Fuglesangs Tech', beskr: 'Siden finnes ikke.', rel: '/', noindex: true, innhold: `<h1>Fant ikke produktet</h1><p class="lead">Produktet kan ha fått ny adresse eller er tatt ut av sortimentet.</p><div class="cta"><a class="btn" href="${WWW}/produkter">Gå til produktkatalogen</a><a class="btn alt" href="/">Alle produkter</a></div>` }));
skriv('assets/side.css', CSS);
skriv('assets/ramme.js', RAMME_JS);
// søkeindeks i samme format som søket på www: [id, navn, leverandør, kategori, bilde, beskrivelse, lenke, egenskaper]
skriv('assets/sok.json', JSON.stringify(P.map(p => [p.id, p.navn, lev(p).navn, p.kat, (p.bilder || [])[0] || '', kutt(p.short || (p.paras || [])[0] || '', 160), '', (p.eg || []).join('|') + '|' + (p.code || '') + '|' + p.varianter.map(v => v.no + ' ' + (v.grade || '')).join(' ')])));
const urls = [BASE].concat(P.filter(p => !EGNE[p.id]).map(sideUrl));
skriv('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(u => `<url><loc>${esc(u)}</loc><lastmod>${LASTMOD[u] || IDAG}</lastmod></url>`).join('\n') + '\n</urlset>\n');
skriv('robots.txt', PROD ? `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
skriv('.nojekyll', '');
console.log(`Bygget ${P.length} produktsider (${PROD ? 'for ' + CNAME : 'forhåndsvisning, noindex'}). Endrede filer: ${endret}.`);
