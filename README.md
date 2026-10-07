# Carnet 2.0 — application web installable

Carnet sert à écrire des recettes, suivre leurs préparations, prévoir une version en bocaux et retrouver des idées avec les ingrédients du frigo. Il inclut les saisons des fruits et légumes en France et un calendrier indicatif de cueillette autour d’Annecy.

## Installation

Ouvrez l’adresse de Carnet avec Internet. Sur iPhone/iPad, utilisez Safari → Partager → Sur l’écran d’accueil. Sur Android ou ordinateur, utilisez « Installer » dans le menu d’un navigateur compatible. Installez avant d’importer votre carnet : le stockage de l’app installée peut être distinct de celui de Safari.

Attendez « Disponible hors connexion » avant de quitter la connexion. Les mises à jour sont proposées dans **Installation et sauvegardes**. Une fiche non enregistrée n’est jamais rechargée sans confirmation.

## Vos données

Les recettes, photos et ingrédients du frigo sont enregistrés dans IndexedDB sur chaque appareil. Aucun compte, serveur de données, télémétrie ou outil d’IA n’est utilisé. Les fichiers hébergés sont uniquement les ressources de l’app. L’hébergeur reçoit les demandes de téléchargement habituelles du site ; le contenu du carnet n’est pas transmis.

Chaque appareil et chaque navigateur possède son propre carnet. Il n’y a pas de synchronisation automatique. Pour transférer le carnet, exportez un fichier JSON puis importez-le sur l’autre appareil. Les recettes avec le même identifiant sont mises à jour ; les autres sont conservées. La liste du frigo contenue dans la sauvegarde remplace celle de l’appareil.

Dans l’application Mac : **Sauvegarder mon carnet**, transférer le fichier par AirDrop ou Fichiers, puis **Installation et sauvegardes → Importer un carnet** dans l’application web installée. Photos, étapes, historique et temps d’attente sont inclus.

Exportez régulièrement une sauvegarde et vérifiez que le fichier est conservé. Les données peuvent disparaître si le stockage du navigateur est effacé, si le navigateur libère de la place ou si l’app est supprimée. La demande de stockage persistant dépend du navigateur. Une copie du dernier enregistrement précédent est aussi gardée localement ; elle ne remplace pas une sauvegarde externe.

Conservez la même adresse : le stockage est lié au domaine et au chemin de l’app. Avant un changement d’adresse, exportez le carnet.

## Hébergement GitHub Pages

Le dossier `docs/` contient l’intégralité de l’application et fonctionne sous un sous-dossier de GitHub Pages. Publiez depuis `main` / `docs` dans **Settings → Pages → Deploy from a branch**. `.nojekyll` désactive les transformations Jekyll. Ne placez jamais de sauvegarde personnelle dans le dépôt.

## Développement

Aucune dépendance ni compilation nécessaire : HTML, CSS, JavaScript et SVG locaux. Pour prévisualiser : `python3 -m http.server 8765`, puis ouvrir `http://localhost:8765/docs/`.

Après toute modification des ressources, exécuter `python3 scripts/build-sw.py` : l’empreinte du cache est calculée sur les fichiers publics. Le service worker ne met en cache que cette liste, ne traite pas les requêtes externes et nettoie uniquement les caches appartenant à cette app. Le carnet est stocké séparément et ne fait pas partie du cache d’application.

Tests : `node scripts/test-core.cjs` et `node scripts/test-web.cjs`. Tester aussi le formulaire, l’import de photos, l’export, le rechargement après arrêt du serveur et la mise à jour dans un navigateur réel. Les petits écrans sont pris en charge ; un essai sur un iPhone physique reste nécessaire pour valider son menu d’installation et les sélecteurs de photos propres à iOS.
