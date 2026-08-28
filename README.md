# lyontram-backend

Backend statique de repli en **horaires théoriques GTFS** pour l'app Lyon (TCL).

La nuit (et lors des pannes), le flux temps réel TCL renvoie 0 passage sur tout le
réseau. Ce repo génère, à partir du GTFS, des fichiers JSON statiques par arrêt que
l'app va chercher en repli.

## Contenu

- **`etl/`** — pipeline Node qui télécharge le ZIP GTFS, le déplie en `stops/{codeTCL}.json`
  (passages datés wall-clock Europe/Paris, fenêtre 14 jours) et un `manifest.json`.
  Voir [`etl/README.md`](etl/README.md).
- **`.github/workflows/build-gtfs.yml`** — job hebdo qui lance l'ETL et force-push la
  sortie sur la branche `gh-pages` (servie par GitHub Pages).
- **`docs/superpowers/`** — spec de design et plan d'implémentation.

## Démarrage rapide

```bash
cd etl && npm install && npm test
GTFS_URL="<url miroir GTFS>" npm run build   # écrit etl/out/
```

Déploiement : pousser sur GitHub, ajouter le secret `GTFS_URL`, activer Pages sur la
branche `gh-pages`. Détails dans [`etl/README.md`](etl/README.md).
