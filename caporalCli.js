const { program } = require('@caporal/core');
const fs = require('fs');
const CruParser = require('./CruParser');


program
    //Check Cru
    .command('check', 'Check the syntax of a CRU file and display parsed data')
    .argument('<file>', 'Path to the CRU file')
    .option('--show-errors', 'Show parsing errors', { default: true })
    .action(({ args, options }) => {
        const filePath = args.file;
        const showErrors = options['show-errors'];

        
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const parser = new CruParser(showErrors);

            const courses = parser.parse(fileContent);
            parser.printSummary();

            console.log('Parsed Courses:', JSON.stringify(courses, null, 2));
        } catch (err) {
            console.error(`Error reading file ${filePath}:`, err.message);
        }
    })


    //EF0 : get-salles (type de cours + salle)
    .command('get-classroom', 'Get classroom and types of sessions for a course')
    .argument('<file>', 'Path to the CRU file')
    .argument('<courseName>', 'Name of the course')
    .action(({ args }) => {
        const filePath = args.file;
        const courseName = args.courseName;
  
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const parser = new CruParser();
            parser.parse(fileContent);
  
            const course = parser.courses.find(c => c.name === courseName);
            if (!course) {
                console.error(`Course "${courseName}" not found.`);
                return;
            }
  
            const creneauxInfo = course.creneaux.map(creneau => {
    
                const type = creneau.type; 
                const salle = creneau.salle;
                return { type, salle };
            });

           
            if (creneauxInfo.length > 0) {
                console.log(`Slots for course "${courseName}":`);
                creneauxInfo.forEach((info, index) => {
                    console.log(`Slot ${index + 1}: Type - ${info.type}, Classroom - ${info.salle}`);
                });
            } else {
                console.log(`No slot found for course "${courseName}".`);
            }
        } catch (err) {
            console.error(`Error reading file ${filePath}:`, err.message);
        }
    })

//EF1 : get-capacity (ex pour salle B103)

.command('get-capacity')
.argument('<file>', 'Path to the CRU file')
.argument('<room>', 'classroom name')
.action(({ args }) => {
    const filePath = args.file;
    const roomName = args.room;

    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parser = new CruParser(false);
        parser.parse(fileContent);

        const capacities = parser.courses.flatMap(course =>
            course.creneaux
                .filter(creneau => creneau.salle === roomName)
                .map(creneau => creneau.nbPlaces)
        );

        if (capacities.length > 0) {
            const maxCapacity = Math.max(...capacities);
            console.log(`Capacity for classroom ${roomName}: ${maxCapacity} places.`);
        } else {
            console.log(`No data found for room ${roomName}.`);
        }
    } catch (err) {
        console.error(`Error reading file ${filePath}:`, err.message);
    }
})




    // EF3: get-free-classrooms
    .command('get-free-classrooms', 'Get free classrooms for a specific slot in the week')
    .argument('<file>', 'Path to the CRU file')
    .argument('<day>', 'Day of the week ( L, MA, ME)')
    .argument('<hour>', 'Hour of the slot ( 10:00)')
    .action(({ args }) => {
        const filePath = args.file;
        const targetDay = args.day.toUpperCase(); 
        const targetHour = args.hour;
    
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const parser = new CruParser();
            parser.parse(fileContent);
    
            // Collecter les créneaux et extraire une liste de salles
            const allCreneaux = [];
            const allRoomsSet = new Set(); 
            parser.courses.forEach(course => {
                course.creneaux.forEach(creneau => {
                    allCreneaux.push({
                        jour: creneau.jour.toUpperCase(), 
                        horaire: creneau.horaire,
                        salle: creneau.salle,
                    });
                    allRoomsSet.add(creneau.salle); 
                });
            });
    
            // Convertir en tableau
            const allRooms = Array.from(allRoomsSet);
    
            // Les salles occupées
            const occupiedRooms = allCreneaux
                .filter(creneau => creneau.jour === targetDay && creneau.horaire.includes(targetHour))
                .map(creneau => creneau.salle);
    
            
            const freeRooms = allRooms.filter(room => !occupiedRooms.includes(room));
    
            //Affichage des salles vides
            if (freeRooms.length > 0) {
                console.log(`Free classrooms on ${targetDay} at ${targetHour}:`);
                freeRooms.forEach(room => console.log(`- ${room}`));
            } else {
                console.log(`No free classrooms on ${targetDay} at ${targetHour}.`);
            }
        } catch (err) {
            console.error(`Error reading file ${filePath}:`, err.message);
        }
    })
    


    // EF5: Generate-occupancy
    .command('generate-occupancy', 'Generate room occupancy visualization')
    .argument('<file>', 'Path to the CRU file')
    .action(({ args }) => {
        const filePath = args.file;

        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const parser = new CruParser();
            parser.parse(fileContent);

            // Extraire les créneaux pour chaque salle
            const salleUsage = {};
            parser.courses.forEach(course => {
                course.creneaux.forEach(creneau => {
                    const salle = creneau.salle;
                    const horaire = creneau.horaire;

                    // durée du creneau
                    const [startTime, endTime] = horaire.split('-');
                    const [startHour, startMinute] = startTime.split(':').map(Number);
                    const [endHour, endMinute] = endTime.split(':').map(Number);

                    const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute); // Durée en minutes

                    // somme des durées
                    if (!salleUsage[salle]) {
                        salleUsage[salle] = 0;
                    }
                    salleUsage[salle] += duration;
                });
            });

            // Calcul du taux d'occupation
            const totalWeekMinutes = 5 * 8 * 60; // Supposons 5 jours de 8 heures par jour
            const salleOccupancy = Object.entries(salleUsage).map(([salle, usedMinutes]) => ({
                salle,
                occupancyRate: (usedMinutes / totalWeekMinutes) * 100,
                usedMinutes,
            }));

            
            salleOccupancy.sort((a, b) => b.occupancyRate - a.occupancyRate);

            // Visualisation (console + histogramme)
            console.log('Room Occupancy Rates:');
            salleOccupancy.forEach(({ salle, occupancyRate, usedMinutes }) => {
                console.log(`${salle}: ${occupancyRate.toFixed(2)}% (${usedMinutes} minutes)`);
            });

            //Générer un histogramme avec node-plotlib : Problème dans la génération, demander au prof
            // const plot = require('nodeplotlib');
            const { plot, serve } = require('nodeplotlib');

            
            const labels = salleOccupancy.map(item => item.salle);
            const data = salleOccupancy.map(item => item.occupancyRate);

            // Préparation du graphique

            const trace = {
                x: labels,
                y: data,
                type: 'bar',
                name: 'Room Occupancy'
            };

            const layout = {
                title: 'Room Occupancy Rates',
                xaxis: { title: 'Rooms' },
                yaxis: { title: 'Occupancy Rate (%)', range: [0, 100] }
            };


            // Affichage du graphique
            plot([trace], layout); // Prépare le graphique
            serve(); // Démarre le serveur Nodeplotlib

            

        } catch (err) {
            console.error(`Error reading file ${filePath}:`, err.message);
        }
    })




    //EF6 : Rank classrooms by their capacity
    .command('rank-classrooms', 'Generate a ranking of classrooms by capacity')
    .argument('<file>', 'Path to the CRU file')
    .action(async ({ args }) => {
        const filePath = args.file;

        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const parser = new CruParser();
            parser.parse(fileContent);

            // Extraire les salles et leurs capacités
            const salleCapacities = {};

            parser.courses.forEach(course => {
                course.creneaux.forEach(creneau => {
                    if (!salleCapacities[creneau.salle]) {
                        salleCapacities[creneau.salle] = creneau.nbPlaces;
                    }
                });
            });

            // Trier les salles par capacité
            const sortedRooms = Object.entries(salleCapacities).sort((a, b) => b[1] - a[1]);
            const { plot, serve } = require('nodeplotlib');

            // Afficher le classement dans un tableau
            console.log('\nRanking of Classrooms by Capacity:');
            console.log('---------------------------------');
            console.log('| Capacity | Rooms              |');
            console.log('---------------------------------');
            sortedRooms.forEach(([room, capacity]) => {
                console.log(`| ${capacity.toString().padStart(8)} | ${room.padEnd(18)} |`);
            });
            console.log('---------------------------------');

            // Générer un graphique : Problème! demander au prof

            async function generateCapacityChart(sortedRooms) {
                // Extraire les labels (salles) et les données (capacités)
                const labels = sortedRooms.map(([room]) => room);
                const data = sortedRooms.map(([_, capacity]) => capacity);
            
                // Configuration du graphique avec nodeplotlib
                const chart = {
                    x: labels,
                    y: data,
                    type: 'bar', // Type de graphique
                    name: 'Capacité des salles', // Légende
                    marker: {
                        color: 'rgba(75, 192, 192, 0.6)', // Couleur des barres
                        line: {
                            color: 'rgba(75, 192, 192, 1)', // Bordure des barres
                            width: 1, // Largeur des bordures
                        },
                    },
                };
            
                // Mise en page (layout) du graphique
                const layout = {
                    title: 'Capacité des salles',
                    xaxis: {
                        title: 'Salles',
                    },
                    yaxis: {
                        title: 'Capacité',
                        range: [0, Math.max(...data) + 10], // Ajuster la plage Y
                    },
                };
            
                // Afficher le graphique dans le navigateur
                plot([chart], layout); // Prépare le graphique
                serve(); // Démarre le serveur Nodeplotlib
    
                console.log('Graphique affiché dans le navigateur.');
            }

            generateCapacityChart(sortedRooms);

        } catch (err) {
            console.error(`Error reading file ${filePath}:`, err.message);
        }
    })
    


program.run();
