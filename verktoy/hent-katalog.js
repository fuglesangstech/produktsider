/*
  Henter produktkatalogen fra www.fuglesangstech.no/produkter (slik nettleseren bygger den) og lagrer den
  som data/produkter.json. Krever at koden på /produkter har window.FTKatalog.

  Kjør: NODE_USE_ENV_PROXY=1 node verktoy/hent-katalog.js
  Test med ny kode før den er limt inn: LOKAL_PRODUKTER=/sti/fuglesangs-produkter.html node verktoy/hent-katalog.js
*/
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL_ = 'https://www.fuglesangstech.no/produkter';

function splice(live, NEW) {   // bytt ut kodeblokken på siden med lokal kode (bare for testing)
  const L = NEW.trim().split('\n'), A = L.slice(0, 3).join('\n'), Z = L.slice(-4).join('\n');
  const si = live.indexOf(A), ei = live.indexOf(Z, si);
  if (si < 0 || ei < 0) throw new Error('fant ikke kodeblokken på /produkter');
  return live.slice(0, si) + NEW.trim() + live.slice(ei + Z.length);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  if (process.env.LOKAL_PRODUKTER) {
    const live = await (await fetch(URL_)).text();
    const body = splice(live, fs.readFileSync(process.env.LOKAL_PRODUKTER, 'utf8'));
    await ctx.route('**/*', r => {
      const u = new URL(r.request().url());
      if (r.request().resourceType() === 'document' && u.pathname.replace(/\/$/, '') === '/produkter') return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body });
      return r.continue();
    });
  }
  const p = await ctx.newPage();
  await p.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.FTKatalog && window.FTKatalog.produkter().length > 300, null, { timeout: 90000 });
  await p.waitForTimeout(4000);   // ressurser, utgåtte og datablad kobles på etter at produktene er lastet
  const data = await p.evaluate(() => {
    const K = window.FTKatalog;
    const ren = x => JSON.parse(JSON.stringify(x, (k, v) => (typeof v === 'function' ? undefined : v)));
    const prod = K.produkter().map(x => {
      const o = {};
      ['id', 'sup', 'supNavn', 'grp', 'kat', 'code', 'navn', 'tagline', 'short', 'img', 'href', 'paras', 'spec', 'packs', 'eg', 'sds', 'pds', 'cert', 'manual',
       'gradeLabel', 'noLabel', 'descLabel', 'vintro', 'aliases', 'fyll', 'fettValg'].forEach(k => { if (x[k] !== undefined) o[k] = ren(x[k]); });
      o.bilder = [x.img].concat((x.extra || []).map(e => e.src)).filter(Boolean);
      o.varianter = (x.variants || []).map(v => ({ no: v.no, grade: v.grade, desc: v.desc, packs: v.packs || [], orig: v.orig }));
      o.kontakt = x.contact ? ren(x.contact) : null;
      o.ressurser = (x.res || []).map(r => ({ navn: r.navn || r.tittel || '', url: r.url || '', gruppe: r.gruppe || '', generell: !!r.generell, sprak: r.sprak || '' })).filter(r => r.url && r.navn);
      if (x.utgatt) o.utgatt = { tekst: x.utgatt.tekst, merknad: x.utgatt.merknad || '', alt: (x.utgatt.alt || []).map(a => ({ id: a.p.id, navn: a.p.navn, hvorfor: a.hvorfor || '' })) };
      return o;
    });
    const lev = K.leverandorer().map(s => ({ key: s.key, navn: s.navn, kort: s.kort || '', side: s.side || '', sole: s.sole || '' }));
    return { hentet: new Date().toISOString(), produkter: prod, leverandorer: lev, egneSider: K.egneSider ? K.egneSider() : {} };
  });
  await b.close();
  const ut = path.join(__dirname, '..', 'data', 'produkter.json');
  // vern: hvis katalogen plutselig har langt færre produkter (feil på /produkter), behold forrige versjon
  let forrige = 0; try { forrige = JSON.parse(fs.readFileSync(ut, 'utf8')).produkter.length; } catch (e) {}
  if (forrige && data.produkter.length < forrige * 0.9 && !process.env.TVING) {
    console.error(`STOPP: katalogen har ${data.produkter.length} produkter, forrige gang ${forrige}. Ingenting er endret. Sjekk /produkter, eller kjør med TVING=1 hvis nedgangen er riktig.`);
    process.exit(2);
  }
  data.hentet = data.hentet.slice(0, 10);
  fs.writeFileSync(ut, JSON.stringify(data, null, 1));
  console.log('Hentet ' + data.produkter.length + ' produkter → ' + ut);
})().catch(e => { console.error('FEIL:', e.message); process.exit(1); });
