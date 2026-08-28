# ETL GTFS Lyon

Génère `stops/{codeTCL}.json` (14 jours d'horaires théoriques) publiés sur GitHub Pages.

## Local
    cd etl && npm install && npm test
    GTFS_URL="<url miroir>" npm run build   # écrit etl/out/

## CI
- Secret repo requis : `GTFS_URL` (URL du miroir GTFS avec clé).
- Cron hebdo (lundi) + déclenchement manuel (onglet Actions).
- Sortie force-pushée sur la branche `gh-pages`.

## Activer GitHub Pages
Settings > Pages > Source = branche `gh-pages`, dossier `/`.
URL publique : `https://<user>.github.io/<repo>/stops/{code}.json`
