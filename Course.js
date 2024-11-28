class Course {
    constructor(name) {
        this.name = name; 
        this.creneaux = [];
    }

    addCreneau(type, nbPlaces, horaire, sousGroupe, salle) {
        this.creneaux.push({
            type: type,
            nbPlaces: nbPlaces,
            horaire: horaire,
            sousGroupe: sousGroupe,
            salle: salle 
        });
    }
}

module.exports = Course;
