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


    //Get-salles (type de cours + salle)
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

    //Get-salles (type de cours + salle)
    .command('get-slots', 'Get the time when a room is free')
    .argument('<file>', 'Path to the CRU file')
    .argument('<roomName>', 'Name of the room')
    .action(({ args }) => {
        const filePath = args.file;
        const roomName = args.roomName;
  
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const parser = new CruParser();
            parser.parse(fileContent);
  
            const coursesInThisRoom = parser.courses.filter(c => 
                c.creneaux.some(creneau => creneau.salle === roomName)
            );
            if (!coursesInThisRoom) {
                console.error(`No course found for the room "${roomName}"`);
                return;
            }
            
            const freeSlots = {
                L: [{ start: 8, end: 18 }],
                MA: [{ start: 8, end: 18 }],
                ME: [{ start: 8, end: 18 }],
                J: [{ start: 8, end: 18 }],
                V: [{ start: 8, end: 18 }]
            }; 

            function retirerPlage(horaires, jour, retirerStart, retirerEnd){   
                horaires[jour] = horaires[jour]
                    .flatMap(({ start, end }) => {
                        if (retirerEnd <= start || retirerStart >= end) {
                            
                            return [{ start, end }];
                        }
                        const result = [];
                    
                        if (retirerStart > start) {
                            result.push({ start, end: retirerStart });
                        }
                    
                        if (retirerEnd < end) {
                            result.push({ start: retirerEnd, end });
                        }
                        return result;
                    });
            }

            for(const cours of coursesInThisRoom){
                for(const creneau of cours.creneaux){
                    const jour = creneau.jour;
                    const match = creneau.horaire.match(/(\d+):\d{2}-(\d+):\d{2}/);
                    const retirerStart = parseInt(match[1], 10); 
                    const retirerEnd = parseInt(match[2], 10);
                    retirerPlage(freeSlots, jour, retirerStart, retirerEnd);
                }
            }

            const codeEnJour = {L: "Lundi", MA: "Mardi", ME: "Mercredi", J: "Jeudi", V: "Vendredi"};
            const listeCodes = ["L","MA","ME","J","V"];

            if (coursesInThisRoom.length > 0) {
                //console.log(JSON.stringify(freeSlots, null, 2));
                for (let i = 0; i < 5; i++){
                    const creneaux = freeSlots[listeCodes[i]];
                    for(const creneau of creneaux){
                        console.log(`Le ${codeEnJour[listeCodes[i]]}, il y a un créneau de ${creneau.start} à ${creneau.end}`);
                    }
                }
            } else {
                console.log(`No slot found for room "${roomName}".`);
            }
        } catch (err) {
            console.error(`Error reading file ${filePath}:`, err.message);
        }
    });
    


program.run();
