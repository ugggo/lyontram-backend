# Repli horaires théoriques GTFS (Lyon / TCL)

Date : 2026-08-28
Statut : design validé, prêt pour plan d'implémentation

## Problème

La nuit, le flux temps réel TCL (`tcl_sytral.tclpassagearret`, datapusher Grand Lyon)
renvoie `nb_results == 0` **pour tout le réseau** (flux 100 % temps réel basé sur le
suivi des véhicules ; non alimenté la nuit). Résultat : l'app `lyontram` n'affiche aucun
passage alors que le métro circule encore (dernier ~00h04). Le problème est réseau-wide,
pas propre à un arrêt.

La seule source qui répond la nuit est l'**horaire théorique GTFS** : un ZIP statique
(~40 Mo) à télécharger et parser soi-même.

- Miroir Google (ODbL) qui fonctionne :
  `https://gtech-transit-prod.apigee.net/v1/google/gtfs/odbl/lyon_tcl.zip?apikey=<APIKEY>&secret=<SECRET>`
  (clé API tierce dans l'URL, hors de notre contrôle).
- Le GTFS officiel grandlyon est mort (figé 2022).

## Objectif

Fournir un repli en **horaires théoriques** couvrant **tout le réseau** (4641 arrêts),
déclenché côté app quand le temps réel renvoie 0 résultat. Contrainte forte : coût
d'exploitation **0 €**, aucun runtime serveur, pas de plan Firebase Blaze.

## Décisions actées (contexte du brainstorming)

1. **Périmètre** : tout le réseau (tout le flux temps réel est vide la nuit).
2. **Forme de stockage** : fichiers pré-calculés par arrêt (statiques) + CDN. Pas de base
   de données, pas de Firestore.
3. **Où vit la résolution calendrier / >24h / fuseau** : entièrement **cuite à l'ETL**.
   Full-statique : les fichiers contiennent des passages datés concrets. L'app ne fait
   qu'un filtre trivial « depuis maintenant ». Aucune Function de service au runtime.
4. **Ingestion + hébergement** : ETL en CI gratuite (**GitHub Actions**, cron hebdo) qui
   publie des fichiers statiques sur **GitHub Pages**. Zéro compute serveur, pas de Blaze.
5. **Mapping identifiants** : fait à l'ETL. Fichiers **nommés par code TCL** (le même code
   que l'app passe déjà au temps réel). L'app ne connaît aucun `stop_id` GTFS.
6. **UX** : repli produit `isRealTime = false` et **réutilise le rendu existant**. Pas de
   nouveau badge / traduction en v1.

Le repo `lyontram-backend` est **réaffecté** à ce rôle. L'ancienne Cloud Function proxy
(`functions/index.js`) interrogeait le même flux temps réel (vide la nuit) : elle est
retirée du périmètre. On garde le repo comme foyer de l'ETL + Pages.

## Architecture

Deux moitiés indépendantes reliées par un contrat de fichiers statiques.

### Partie 1 — ETL (GitHub Actions, cron hebdo)

- **Déclencheur** : workflow planifié (ex. lundi 03h00 Europe/Paris) + `workflow_dispatch`.
- **Langage** : Node (réutilise les helpers de parsing existants du repo).
- **Étapes** :
  1. Télécharger le ZIP GTFS depuis le miroir Google.
  2. Dézipper + parser : `stops`, `stop_times`, `trips`, `routes`, `calendar`,
     `calendar_dates`, `id_mappings`.
  3. Construire le mapping `stop_id GTFS → code TCL` (via `id_mappings.txt` ; le métro
     coïncide déjà, ex. Foch = `46053`).
  4. **Résolution calendrier** : pour chaque date de la fenêtre `[aujourd'hui, +14 j]`,
     calculer les `service_id` actifs = `calendar` (jour de semaine ∩ plage de dates)
     puis appliquer `calendar_dates` (type 1 = ajout, 2 = retrait).
  5. Pour chaque arrêt, déplier `stop_times` en **passages datés concrets**. Gérer les
     **heures > 24h** (`24:04:49` = jour de service D mais horloge réelle D+1 00:04) et
     sceller le fuseau **Europe/Paris**.
  6. Émettre `stops/{codeTCL}.json` (passages triés) + `manifest.json`
     (`generatedAt`, `validThrough`).
  7. **Force-push sur une branche orpheline `gh-pages`** → GitHub Pages sert (historique
     git non gonflé).
- **Codes TCL non résolus** : loggés et comptés, arrêt ignoré (pas de fichier = pas de
  repli pour lui, dégradation silencieuse acceptable).

### Partie 2 — Format de fichier

`stops/{codeTCL}.json` :

```json
{
  "stopId": "46053",
  "stopName": "Foch",
  "generatedAt": "2026-07-08T03:00:00Z",
  "validThrough": "2026-07-22",
  "departures": [
    { "datetime": "2026-07-08T23:40:00", "line": "A", "direction": "Vaulx-en-Velin La Soie" },
    { "datetime": "2026-07-09T00:04:00", "line": "A", "direction": "Vaulx-en-Velin La Soie" }
  ]
}
```

- Passages datés concrets, wall-clock Europe/Paris, sans offset (`YYYY-MM-DDTHH:MM:SS`), triés ascendant, fenêtre 14 jours.
- Toute la complexité GTFS (calendrier, >24h, fuseau) est cuite ici, une seule fois.

### Partie 3 — Hébergement

- GitHub Pages depuis la branche orpheline `gh-pages` du repo `lyontram-backend`.
- URL type `https://<user>.github.io/<repo>/stops/{code}.json`, servie via CDN GitHub.
- Force-push à chaque run.

### Partie 4 — Intégration app

- Point d'insertion : `MonitoringRepository`
  (`app/src/main/kotlin/lyontram/data/monitoring/MonitoringRepository.kt`), les 3 méthodes
  (`getFavoritesSchedules`, `getTramStopSchedules`, `getLineStopSchedules`).
- Logique : après `monitoringApi.getStopDepartures(code)`, **si `values` est vide →
  appeler un nouveau `TheoreticalScheduleApi`** (Retrofit, base URL GitHub Pages, sans
  auth) : `GET stops/{code}.json`.
- Adapter la réponse théorique vers `MonitoredLineStop` avec `isRealTime = false`,
  `expectedDepartureTime` calculé depuis `datetime` vs now, filtré `> now`, trié, tronqué
  à N. Réutilise le rendu `isRealTime = false` existant.
- Nouveau service Retrofit + entrée dans `LyontramRepositoryModule.kt`.

### Partie 5 — Robustesse

- Fenêtre glissante 14 j = 14 jours de marge si le miroir Google tombe.
- ETL défensif : si le download échoue **ou** si le nombre d'arrêts parsés chute
  anormalement → on abandonne sans publier (l'ancien `gh-pages` reste servi).
- App : si le fichier théorique manque ou est vide aussi → comportement actuel (liste
  vide), pas de crash.
- Observabilité : l'ETL logge le taux de couverture du mapping ; seuil d'échec du build
  si la couverture s'effondre.

## Hors périmètre (YAGNI)

- Pas de temps réel dans l'ETL (théorique seulement).
- Pas de Firebase Function / Firestore / Cloud Run.
- Pas d'embarquement hors-ligne des horaires dans l'app en v1 (repli réseau uniquement —
  extensible plus tard).
- Pas de nouveau badge UX « théorique » en v1.

## Repères codebase

- App (repo `lyontram`, branche `master`) :
  - `app/src/main/kotlin/lyontram/data/monitoring/MonitoringRepository.kt` — point de repli.
  - `app/src/main/kotlin/lyontram/data/monitoring/api/MonitoringApi.kt` —
    `getStopDepartures(id__eq, ...)` → `LyonScheduleResponse`.
  - `app/src/main/kotlin/lyontram/data/monitoring/api/MonitoringResponse.kt` —
    `LyonScheduleResponse(values, nb_results, last_update_fme)`, `LyonPassage`.
  - `app/src/main/kotlin/lyontram/di/LyontramRepositoryModule.kt` — DI, base URL, auth.
  - `app/src/main/res/stations_lyon.json` — 4641 arrêts (`id`, `nom`, `desserte`, ...).
- Backend (repo `lyontram-backend`) : foyer de l'ETL + Pages. Firebase déjà présent
  (`.firebaserc` projet `lyon-back`) mais non requis par ce design.
