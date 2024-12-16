const Course = require("./Course");

const CruParser = function (showErrors = true) {
  this.showErrors = showErrors;
  this.courses = [];
  this.errorCount = 0;
  this.currentCourse = null;
};

// Découpage des données en lignes
CruParser.prototype.tokenize = function (data) {
  return data.split(/\r?\n/).filter((line) => line.trim());
};

// Fonction principale de parsing
CruParser.prototype.parse = function (data) {
  // Filtrer les données pertinentes
  const filteredData = this.filterRelevantData(data);

  // Tokeniser les données filtrées
  const tokens = this.tokenize(filteredData.join("\n"));

  while (tokens.length > 0) {
    this.course(tokens);
  }

  return this.courses;
};

// Gestion des erreurs
CruParser.prototype.errMsg = function (message, input) {
  this.errorCount++;
  if (this.showErrors) {
    console.error(`Parsing Error ! on "${input}" -- msg : ${message}`);
  }
};

// Extraction de la ligne suivante
CruParser.prototype.next = function (input) {
  return input.shift();
};

// Analyse du cours
CruParser.prototype.course = function (input) {
  const line = this.next(input);

  if (line.startsWith("+")) {
    this.name(line);
  } else {
    this.errMsg("Expected course name but got something else", line);
    return;
  }

  while (input.length > 0 && !input[0].startsWith("+")) {
    this.creneau(input);
  }
};

CruParser.prototype.filterRelevantData = function (data) {
  const lines = data.split(/\r?\n/);

  return lines.filter((line) => {
    return (
      line.startsWith("+") || // Noms de cours
      line.match(
        /^1,[A-Z0-9]+,P=\d+,H=[A-Z]+ \d{1,2}:\d{2}-\d{1,2}:\d{2},F[A-Z0-9]+,S=[A-Z0-9]{4}\/\//,
      ) // Créneaux valides
    );
  });
};

CruParser.prototype.name = function (line) {
  // Accepter les noms de cours élargis
  if (!line.match(/^\+[A-Z0-9]+$/)) {
    // Autoriser les noms avec des lettres et des chiffres variés
    this.errMsg("Invalid course name format", line);
    return;
  }

  this.currentCourse = new Course(line);
  this.courses.push(this.currentCourse);
};

CruParser.prototype.creneau = function (input) {
  const line = this.next(input);

  const match = line.match(
    /^1,([A-Z0-9]+),P=(\d+),H=([A-Z]+)\s(\d{1,2}:\d{2}-\d{1,2}:\d{2}),F([A-Z0-9]+),S=([A-Z0-9]{4})\/\//,
  );

  if (!match) {
    this.errMsg("Invalid creneau format", line);
    return;
  }

  const [_, type, nbPlaces, jour, horaire, sousGroupe, salle] = match;

  this.addCreneau(
    type,
    parseInt(nbPlaces, 10),
    jour,
    horaire,
    sousGroupe,
    salle,
  );
};

CruParser.prototype.addCreneau = function (
  type,
  nbPlaces,
  jour,
  horaire,
  sousGroupe,
  salle,
) {
  if (!this.currentCourse) {
    this.errMsg("Creneau found without an associated course", "");
    return;
  }

  const isDuplicate = this.currentCourse.creneaux.some(
    (creneau) =>
      creneau.jour === jour &&
      creneau.horaire === horaire &&
      creneau.salle === salle,
  );

  if (isDuplicate) {
    this.errMsg(
      `Duplicate creneau found for salle ${salle} at ${jour} ${horaire}`,
      `${type}, ${jour}, ${horaire}, ${sousGroupe}, ${salle}`,
    );
    return;
  }

  this.currentCourse.addCreneau(
    type,
    nbPlaces,
    jour,
    horaire,
    sousGroupe,
    salle,
  );
};

// Affichage du résumé des erreurs
CruParser.prototype.printSummary = function () {
  console.log(`Parsing completed with ${this.errorCount} error(s).`);
};

module.exports = CruParser;
