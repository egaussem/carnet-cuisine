'use strict';
// General phenology, not a forecast of local abundance. Sources checked 12 September 2026.
const MYCO_SOURCE='https://campus.univ-lyon1.fr/champignons/base-de-donnees/';
const FORAGING=[
 {name:'Cèpe de Bordeaux',latin:'Boletus edulis',kind:'mushroom',months:[6,7,8,9,10,11],period:'Juin à novembre',note:'Forêts de feuillus et de conifères. Les poussées dépendent fortement des pluies.',source:MYCO_SOURCE+'boletus-edulis/'},
 {name:'Girolle',latin:'Cantharellus cibarius',kind:'mushroom',months:[5,6,7,8,9,10,11],period:'Mai à novembre',note:'Sous-bois et mousses. Le démarrage peut être plus tardif en altitude.',source:MYCO_SOURCE+'cantharellus-cibarius/'},
 {name:'Pied-de-mouton',latin:'Hydnum repandum',kind:'mushroom',months:[7,8,9,10,11],period:'Juillet à novembre',note:'Forêts de feuillus ou de conifères ; observations documentées à Saint-Jorioz et Saint-Eustache.',source:'https://www.hautesavoiephotos.com/champis/photo_repandum.htm'},
 {name:'Trompette de la mort',latin:'Craterellus cornucopioides',kind:'mushroom',months:[7,8,9,10,11,12],period:'Juillet à décembre',note:'Surtout de la fin de l’été à l’automne. Les gelées peuvent écourter la saison en montagne.',source:MYCO_SOURCE+'craterellus-cornucopioides/'},
 {name:'Chanterelle en tube',latin:'Craterellus tubaeformis',kind:'mushroom',months:[9,10,11,12],period:'Septembre à décembre',note:'Milieux forestiers humides et moussus. Fin de saison très variable avec l’altitude.',source:MYCO_SOURCE+'craterellus-tubaeformis/'},
 {name:'Morille commune',latin:'Morchella esculenta',kind:'mushroom',months:[3,4,5],period:'Mars à mai',note:'Bois humides et lisières au printemps. Toxique crue ou insuffisamment cuite ; préparation adaptée indispensable après identification.',source:MYCO_SOURCE+'morchella-esculenta/'},
 {name:'Noisette',latin:'Corylus avellana',kind:'nut',months:[9,10],period:'Septembre à octobre',note:'Haies et lisières de noisetiers. Récolte à maturité ; le séchage permet une utilisation plus longue.',source:'https://www.unicoque.com/la-noisette/'},
 {name:'Noix',latin:'Juglans regia',kind:'nut',months:[9,10],period:'Mi-septembre à octobre',note:'Noyers de basse altitude et vergers, avec l’accord du propriétaire. Fraîches puis sèches selon la récolte.',source:'https://www.lesfruitsetlegumesfrais.com/fruits-legumes/fruits-a-coque/noix'},
 {name:'Châtaigne',latin:'Castanea sativa',kind:'nut',months:[9,10,11],period:'Fin septembre à novembre',note:'Châtaigneraies de basse altitude, présence variable selon le sol. Ne pas confondre avec les marrons d’Inde, toxiques.',source:'https://www.chataigne-ardeche.com/produits-chataigne/'}
];
