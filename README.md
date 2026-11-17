# Produktsider for Fuglesangs Tech

Én side per produkt for `produkter.fuglesangstech.no`, laget automatisk fra produktkatalogen på
www.fuglesangstech.no/produkter. Sidene er innganger fra Google; katalogen på www er fortsatt stedet kundene bruker.

- `verktoy/hent-katalog.js` henter katalogen (krever `window.FTKatalog` i koden på /produkter) → `data/produkter.json`
- `verktoy/bygg.js` lager sidene, `index.html`, `sitemap.xml` og `robots.txt`
- Uten filen `CNAME` er alt forhåndsvisning: `noindex`, og robots.txt stenger for søkemotorer.

Oppdatering (månedlig):

    NODE_USE_ENV_PROXY=1 node verktoy/hent-katalog.js
    node verktoy/bygg.js

Ikke rediger sidene for hånd – de lages på nytt hver gang.
