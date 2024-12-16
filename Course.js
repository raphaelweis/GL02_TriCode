class Course {
  constructor(name) {
    this.name = name;
    this.creneaux = [];
  }

  addCreneau(type, nbPlaces, jour, horaire, sousGroupe, salle) {
    this.creneaux.push({
      type: type,
      nbPlaces: nbPlaces,
      jour: jour,
      horaire: horaire,
      sousGroupe: sousGroupe,
      salle: salle,
    });
  }
}

module.exports = Course;
