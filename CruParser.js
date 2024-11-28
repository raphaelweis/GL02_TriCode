const Course = require('./Course');

const CruParser = function(showErrors = true) {
    this.showErrors = showErrors;
    this.courses = [];
    this.errorCount = 0;
    this.currentCourse = null;
};

// Découpage des données en lignes
CruParser.prototype.tokenize = function(data) {
    return data.split(/\r?\n/).filter(line => line.trim());
};

// Fonction principale de parsing
CruParser.prototype.parse = function(data) {
    const tokens = this.tokenize(data);
    while (tokens.length > 0) {
        this.course(tokens);
    }
    return this.courses;
};

// Gestion des erreurs
CruParser.prototype.errMsg = function(message, input) {
    this.errorCount++;
    if (this.showErrors) {
        console.error(`Parsing Error ! on "${input}" -- msg : ${message}`);
    }
};

// Extraction de la ligne suivante
CruParser.prototype.next = function(input) {
    return input.shift();
};

// Analyse du cours
CruParser.prototype.course = function(input) {
    const line = this.next(input);

    if (line.startsWith('+')) {
        this.name(line);
    } else {
        this.errMsg('Expected course name but got something else', line);
        return;
    }

    while (input.length > 0 && !input[0].startsWith('+')) {
        this.creneau(input);
    }
};

// Analyse du nom du cours
CruParser.prototype.name = function(line) {
    if (!line.match(/^\+[A-Z0-9]{4}$/)) {
        this.errMsg('Invalid course name format', line);
        return;
    }

    this.currentCourse = new Course(line);
    this.courses.push(this.currentCourse);
};

CruParser.prototype.creneau = function(input) {
    const line = this.next(input);

    // Correction du regex et décomposition correcte
    const match = line.match(/^1,([A-Z0-9]+),P=(\d+),H=([A-Z]+)\s(\d{1,2}:\d{2}-\d{1,2}:\d{2}),F([A-Z0-9]+),S=([A-Z0-9]{4})\/\//);

    if (!match) {
        this.errMsg('Invalid creneau format', line);
        return;
    }

    // Décomposition correcte des éléments.
    const [_, type, nbPlaces, jour, horaire, sousGroupe, salle] = match;

    // Appel avec les bonnes valeurs.
    this.addCreneau(type, parseInt(nbPlaces, 10), jour, horaire, sousGroupe, salle);
};


CruParser.prototype.addCreneau = function(type, nbPlaces, jour, horaire, sousGroupe, salle) {
    if (!this.currentCourse) {
        this.errMsg('Creneau found without an associated course', '');
        return;
    }

    // Vérification d'unicité : même jour, même horaire et même salle.
    const isDuplicate = this.currentCourse.creneaux.some(creneau =>
        creneau.jour === jour && creneau.horaire === horaire && creneau.salle === salle
    );

    if (isDuplicate) {
        this.errMsg(`Duplicate creneau found for salle ${salle} at ${jour} ${horaire}`, `${type}, ${jour}, ${horaire}, ${sousGroupe}, ${salle}`);
        return;
    }

    this.currentCourse.addCreneau(type, nbPlaces, jour, horaire, sousGroupe, salle);
};


// Affichage du résumé des erreurs
CruParser.prototype.printSummary = function() {
    console.log(`Parsing completed with ${this.errorCount} error(s).`);
};

module.exports = CruParser;
