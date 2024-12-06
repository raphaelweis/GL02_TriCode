# GL02_TriCode




## 🛠 Installation

Avant de pouvoir utiliser l'application, vous devez installer les dépendances nécessaires. Exécutez la commande suivante dans votre terminal :

```bash
npm install
```

## 🔧 Fonctionnalités

### EF0
**Obtenir les salles et leurs types de cours pour un cours donné** : Utilisez la commande suivante pour obtenir les salles avec leur type de cours associé : 
```bash 
node ./caporalCli.js get-classroom ./sample.cru +AP03 
```


### EF1
**Obtenir la capacité d'une salle** : Vous pouvez récupérer la capacité d'une salle en précisant le fichier `.cru` et le nom de la salle avec la commande suivante : 
```bash 
node ./caporalCli.js get-capacity ./sample.cru B103
```


### EF2
**Obtenir les créneaux disponibles pour une salle donnée** : Affichez les créneaux disponibles pour une salle sur la semaine actuelle avec cette commande : 
```bash 
node ./caporalCli.js get-slots B101
```


### EF3
**Obtenir les salles disponibles pour un créneau donné** : Cette commande permet de lister les salles disponibles sur un créneau donné pour la semaine actuelle.  
```bash
node ./caporalCli.js get-free-classrooms sample.cru
```


### EF4
**Générer un fichier ICS pour une période donnée** : Cette fonctionnalité permet de générer un fichier ICS (au format RFC 5545) contenant tous les enseignements auxquels vous participez pendant une période définie. Utilisez la commande suivante : 
```bash 
node ./caporalCli.js get-calendar 2024-12-06 2024-12-20 +NF16 +GL02 +PO03
```
Le fichier sera sauvegardé dans le dossier `Downloads`.


### EF5
**Visualiser le taux d'occupation des salles** : Vous pouvez générer une visualisation graphique du taux d'occupation des salles ainsi qu'un classement basé sur leur capacité. Pour cela, utilisez cette commande : 
```bash 
node ./caporalCli.js generate-occupancy sample.cru
```


### EF6
**Générer un classement des salles par capacité d'accueil** : Cette commande produit un tableau classant les salles selon leur capacité d'accueil, accompagné d'un graphique. Exemple :
```bash 
node ./caporalCli.js rank-classrooms sample.cru
```

