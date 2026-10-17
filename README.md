# Carnet 2.4 — application web installable

Carnet sert à écrire des recettes, suivre leurs préparations, prévoir une version en bocaux et retrouver des idées avec les ingrédients du frigo. Il inclut les saisons des fruits et légumes en France et un calendrier indicatif de cueillette autour d’Annecy.

## Installation

Ouvrez l’adresse de Carnet avec Internet. Sur iPhone/iPad, utilisez Safari → Partager → Sur l’écran d’accueil. Sur Android ou ordinateur, utilisez « Installer » dans le menu d’un navigateur compatible. Installez avant d’importer votre carnet : le stockage de l’app installée peut être distinct de celui de Safari.

Attendez « Disponible hors connexion » avant de quitter la connexion. Les mises à jour sont proposées dans **Installation et sauvegardes**. Une fiche non enregistrée n’est jamais rechargée sans confirmation.

## Vos données

Les recettes, photos et ingrédients du frigo sont enregistrés dans IndexedDB sur chaque appareil. Aucun compte, serveur de données, télémétrie ou outil d’IA n’est utilisé. Les fichiers hébergés sont uniquement les ressources de l’app. L’hébergeur reçoit les demandes de téléchargement habituelles du site ; le contenu du carnet n’est pas transmis.

Chaque appareil et chaque navigateur possède son propre carnet. La synchronisation locale avec le Mac est déclenchée à votre demande (voir ci-dessous). Vous pouvez aussi transférer un carnet en exportant un fichier JSON puis en l’important sur l’autre appareil. Les recettes avec le même identifiant sont mises à jour ; les autres sont conservées. La liste du frigo contenue dans la sauvegarde remplace celle de l’appareil.

Dans l’application Mac : **Sauvegarder mon carnet**, transférer le fichier par AirDrop ou Fichiers, puis **Installation et sauvegardes → Importer un carnet** dans l’application web installée. Photos, étapes, historique et temps d’attente sont inclus.

Exportez régulièrement une sauvegarde et vérifiez que le fichier est conservé. Les données peuvent disparaître si le stockage du navigateur est effacé, si le navigateur libère de la place ou si l’app est supprimée. La demande de stockage persistant dépend du navigateur. Une copie du dernier enregistrement précédent est aussi gardée localement ; elle ne remplace pas une sauvegarde externe.

Conservez la même adresse : le stockage est lié au domaine et au chemin de l’app. Avant un changement d’adresse, exportez le carnet.

## Hébergement GitHub Pages

Le dossier `docs/` contient l’intégralité de l’application et fonctionne sous un sous-dossier de GitHub Pages. Publiez depuis `main` / `docs` dans **Settings → Pages → Deploy from a branch**. `.nojekyll` désactive les transformations Jekyll. Ne placez jamais de sauvegarde personnelle dans le dépôt.

## Développement

Aucune dépendance ni compilation nécessaire : HTML, CSS, JavaScript et SVG locaux. Pour prévisualiser : `python3 -m http.server 8765`, puis ouvrir `http://localhost:8765/docs/`.

Après toute modification des ressources, exécuter `python3 scripts/build-sw.py` : l’empreinte du cache est calculée sur les fichiers publics. Le service worker ne met en cache que cette liste, ne traite pas les requêtes externes et nettoie uniquement les caches appartenant à cette app. Le carnet est stocké séparément et ne fait pas partie du cache d’application.

Tests : `node scripts/test-core.cjs` et `node scripts/test-web.cjs`. Tester aussi le formulaire, l’import de photos, l’export, le rechargement après arrêt du serveur et la mise à jour dans un navigateur réel. Les petits écrans sont pris en charge ; un essai sur un iPhone physique reste nécessaire pour valider son menu d’installation et les sélecteurs de photos propres à iOS.


## Synchronisation locale (2.1.0)

La version Mac native et la version web installée échangent les recettes, les photos, les favoris, l’historique et le frigo directement sur le réseau local. GitHub héberge seulement les fichiers publics de l’application.

1. Remplacer l’ancienne application Mac par Carnet 2.1.0. Les données restent dans Application Support/CarnetCuisine.
2. Dans l’app iPhone : Installation et sauvegardes → Vérifier les mises à jour → Installer la mise à jour. Garder cette installation : ne pas effacer ses données.
3. Sur le Mac : Synchroniser mes appareils → Démarrer la connexion au Mac.
4. À la première connexion seulement, ouvrir « Première connexion : préparer l’iPhone ». Enregistrer le certificat, l’envoyer par AirDrop à l’iPhone, puis installer le profil dans Réglages → Général → VPN et gestion de l’appareil. Activer ensuite le certificat « Carnet - connexion personnelle au Mac » dans Général → Informations → Réglages des certificats. Le profil ne contient que le certificat public de ce Mac. Sa clé privée reste sur le Mac. [Instructions Apple](https://support.apple.com/fr-fr/102390).
5. Copier le code du Mac et le coller dans Carnet sur l’iPhone → Synchroniser mes appareils. Le presse-papiers universel peut faciliter cette étape si déjà configuré ; sinon recopier le code. Relancer la connexion Mac si les 10 minutes ont expiré pendant la configuration.
6. Choisir les versions à garder si une recette a changé sur les deux appareils, puis confirmer l’échange. Garder les deux apps ouvertes jusqu’à la confirmation.

Le serveur HTTPS est lié à une adresse privée du Mac, accessible pendant dix minutes, avec un code aléatoire renouvelé à chaque session. Il s’arrête après confirmation de l’iPhone, annulation, expiration ou fermeture de l’app. Aucune ouverture de port sur la Freebox n’est nécessaire. Accepter l’accès au réseau local si macOS ou iOS le demande. La synchronisation Mac nécessite macOS 15 ou ultérieur ; les recettes restent utilisables sur macOS 13+.

Les ajouts et les modifications faits sur un seul appareil sont repris automatiquement. Les suppressions sont propagées après une première synchronisation réussie. Lorsqu’une recette est modifiée des deux côtés, l’app propose la version iPhone, la version Mac ou les deux. Pour le frigo, les changements d’un seul côté sont repris ; si les deux listes ont changé, les ingrédients sont réunis.

Une copie avant synchronisation est conservée sur chaque appareil et peut être récupérée depuis le panneau de synchronisation. Une transaction interrompue est mémorisée sur l’iPhone et reprise lors d’une nouvelle connexion. Les copies et la référence de synchronisation sont locales ; elles ne sont pas téléversées. Garder aussi des sauvegardes exportées hors de l’app.

Le certificat expire après cinq ans : il faudra alors le renouveler et refaire la configuration iPhone. Il peut être retiré à tout moment dans Réglages → Général → VPN et gestion de l’appareil. Les clés, certificats personnels et carnets ne font jamais partie du dépôt public.

Tests : `node scripts/test-sync.cjs` et `node scripts/test-sync-flow.cjs`, en plus des tests existants. Après modification des fichiers publics, régénérer le service worker avec `python3 scripts/build-sw.py`.

## Correctif 2.1.2

Mettre à jour les deux apps. Le PIN à 4 chiffres est valable dix minutes, avec un blocage après cinq erreurs. Le code copié inclut l’adresse du Mac. Le PIN sert uniquement à obtenir un jeton de transfert aléatoire de 192 bits sur HTTPS. Le panneau iPhone affiche les étapes, la durée et un diagnostic local sans code de connexion ni contenu des recettes. Le bouton « Tester la connexion seulement » ne modifie aucun carnet. Un rechargement interrompant un échange est signalé à la réouverture, puis la transaction éventuelle reprend à la prochaine tentative. Aucune mise à jour ne recharge automatiquement sans demande.

## Carnet 2.2

QR code lu dans l’app installée via la caméra, sans envoi d’images. Décodeur jsQR inclus localement (commit et licence Apache-2.0 dans docs/jsQR-NOTICE.txt et docs/jsQR-LICENSE.txt). Résumé avant synchronisation, planning hebdomadaire, courses regroupées avec unités compatibles, adaptation des quantités, mode cuisine et impression/PDF. Le partage JSON contient une seule recette et ses photos. Les temps de cuisson ne sont pas multipliés. Les quantités libres sont conservées. Le frigo contient des noms : l’exclusion des ingrédients disponibles est explicite et ne vérifie aucune quantité.

Planning et courses sont sauvegardés avec les recettes et fusionnés par identifiant selon la dernière synchronisation réussie. Les conflits proposent iPhone, Mac ou les deux. Le protocole de données 2 exige la mise à jour des deux apps pour éviter qu’une ancienne version perde ces nouveaux champs. Le PIN temporaire et les certificats restent inchangés. Le maintien de l’écran dépend des possibilités du navigateur ; sur Mac, une activité de mode cuisine le maintient éveillé. La caméra est libérée dès fermeture/arrêt/masquage. Tests : node scripts/test-kitchen.cjs et tests existants.


### Correctif 2.2.1

Catalogue de pictogrammes élargi : produits frais, fromages, céréales, ingrédients végétaux, épices, sauces et fruits de mer. Les suggestions sont disponibles avant de créer des recettes. Meilleure reconnaissance des noms composés, accents, pluriels et graphies courantes (échalotte, palenta). Icônes vectorielles locales, disponibles hors connexion.


### Carnet 2.3 — design

Navigation claire avec icônes vectorielles, sept sections visibles sur petit écran, couleurs par catégorie sur les filtres et fiches, repères visuels des ingrédients et temps de préparation. Les couleurs complètent les libellés et icônes. Les fonctions, le stockage et le protocole de synchronisation restent compatibles avec 2.2.


### Carnet 2.4 — sous-recettes

Créer et enregistrer séparément les préparations (bouillon, œufs marinés, sauce). Dans la fiche du plat, ouvrir Modifier → Les sous-recettes → Ajouter une sous-recette. Choisir la préparation, les portions utilisées pour le nombre de personnes de la fiche, et une précision facultative. Une base pour 4 portions utilisée à moitié se règle à 2 portions. Les fractions sont acceptées. Ne pas répéter les ingrédients des préparations dans ceux du plat.

À la consultation, adapter les personnes : les quantités de chaque préparation suivent ce choix, les durées restent inchangées. Ouvrir les ingrédients/étapes dans la fiche ou ouvrir la préparation et revenir au plat. Les modifications de la préparation sont reprises dans tous les plats qui l’utilisent. Les courses additionnent les ingrédients de toute la composition. Le mode cuisine parcourt les préparations avant l’assemblage ; PDF et partage JSON incluent les sous-recettes, photos comprises.

Une recette utilisée doit être retirée des liens avant suppression. Les cycles et les liens manquants sont refusés ; imbrication limitée à 8 niveaux et 64 préparations directes. Mettre à jour Mac et iPhone vers 2.4 avant synchronisation : le protocole 3 protège les nouveaux liens contre leur perte par les anciennes versions. Les anciennes sauvegardes restent importables. Aucun exemple n’est ajouté au carnet personnel et aucune donnée n’est envoyée à GitHub.
