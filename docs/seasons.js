'use strict';
// Repères sélectionnés dans les calendriers mensuels Manger Bouger (consultés le 11/09/2026).
const SEASONS = [
{fruits:['Citron','Clémentine','Kiwi','Mandarine','Orange','Poire','Pomme'],vegetables:['Betterave','Carotte','Chou','Chou de Bruxelles','Chou-fleur','Courge','Céleri','Endive','Mâche','Navet','Oignon','Panais','Poireau','Potiron','Topinambour','Épinard']},
{fruits:['Citron','Clémentine','Kiwi','Mandarine','Orange','Poire','Pomme'],vegetables:['Betterave','Carotte','Chou','Chou de Bruxelles','Chou-fleur','Céleri','Endive','Mâche','Navet','Oignon','Panais','Poireau','Topinambour','Épinard']},
{fruits:['Kiwi','Orange','Poire','Pomme'],vegetables:['Betterave','Carotte','Chou','Chou de Bruxelles','Chou-fleur','Céleri','Endive','Navet','Oignon','Panais','Poireau','Radis','Épinard']},
{fruits:['Pomme','Rhubarbe'],vegetables:['Asperge','Betterave','Carotte','Chou rouge','Cresson','Endive','Fenouil','Navet','Oignon','Poireau','Radis','Salade','Épinard']},
{fruits:['Fraise','Rhubarbe'],vegetables:['Artichaut','Asperge','Carotte','Chou rouge','Concombre','Courgette','Cresson','Fenouil','Navet','Petit pois','Pois gourmand','Radis','Salade','Épinard']},
{fruits:['Abricot','Cassis','Cerise','Fraise','Framboise','Groseille','Melon','Pastèque','Pêche','Rhubarbe'],vegetables:['Artichaut','Asperge','Aubergine','Blette','Carotte','Concombre','Courgette','Fenouil','Haricot vert','Petit pois','Poivron','Radis','Salade','Tomate']},
{fruits:['Abricot','Brugnon','Cassis','Cerise','Figue','Fraise','Framboise','Groseille','Melon','Myrtille','Pastèque','Prune','Pêche'],vegetables:['Ail','Artichaut','Aubergine','Blette','Carotte','Concombre','Cornichon','Courgette','Fenouil','Haricot vert','Maïs','Petit pois','Poivron','Radis','Salade','Tomate']},
{fruits:['Abricot','Brugnon','Figue','Framboise','Groseille','Melon','Myrtille','Pastèque','Poire','Pomme','Prune','Pêche'],vegetables:['Ail','Artichaut','Aubergine','Blette','Carotte','Concombre','Cornichon','Courgette','Fenouil','Haricot vert','Maïs','Poivron','Salade','Tomate']},
{fruits:['Figue','Raisin','Poire','Pomme','Prune','Melon','Myrtille','Pêche'],vegetables:['Aubergine','Tomate','Courgette','Poivron','Artichaut','Blette','Brocoli','Carotte','Chou-fleur','Concombre','Courge','Fenouil','Haricot vert','Poireau','Potiron','Salade','Épinard']},
{fruits:['Coing','Figue','Kaki','Poire','Pomme','Raisin'],vegetables:['Betterave','Blette','Brocoli','Carotte','Chou','Chou de Bruxelles','Chou-fleur','Courge','Céleri','Endive','Fenouil','Navet','Oignon','Panais','Poireau','Potiron','Épinard']},
{fruits:['Clémentine','Kaki','Kiwi','Mandarine','Poire','Pomme'],vegetables:['Betterave','Brocoli','Carotte','Chou','Chou de Bruxelles','Chou-fleur','Courge','Céleri','Endive','Fenouil','Mâche','Navet','Oignon','Panais','Poireau','Potiron','Topinambour','Épinard']},
{fruits:['Clémentine','Kaki','Kiwi','Mandarine','Poire','Pomme'],vegetables:['Betterave','Carotte','Chou','Chou de Bruxelles','Chou-fleur','Courge','Céleri','Endive','Mâche','Navet','Oignon','Panais','Poireau','Potiron','Topinambour','Épinard']}
];
