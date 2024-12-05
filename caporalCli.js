const { program } = require('@caporal/core');
const fs = require('fs');
const path = require("path");
const os = require("os");
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

    //Get-slots
    .command('get-slots', 'Get the time when a room is free')
    .argument('<roomName>', 'Name of the room')
    .action(({ args }) => {
        const folders = ["AB", "CD", "EF", "GH", "IJ", "KL", "MN", "OP", "QR", "ST"];
        let concatenatedContent = '';
        
        const roomName = args.roomName;
  
        try {
            folders.forEach(folder => {
            
                const filePath = path.join("SujetA_data", path.join(folder, 'edt.cru'));
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                concatenatedContent += fileContent + '\n';
            });
            const parser = new CruParser();
            parser.parse(concatenatedContent);
  
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

            const codeEnJour = {L: "lundi", MA: "mardi", ME: "mercredi", J: "jeudi", V: "vendredi"};
            const listeCodes = ["L","MA","ME","J","V"];

            if (coursesInThisRoom.length > 0) {
                for (let i = 0; i < 5; i++){
                    const creneaux = freeSlots[listeCodes[i]];
                    if(creneaux.length > 0){
                        console.log(`Les créneaux disponibles le ${codeEnJour[listeCodes[i]]} sont:`);
                        for(const creneau of creneaux){
                            console.log(`       -> de ${creneau.start}h à ${creneau.end}h.`);
                        }
                    }else{
                        console.log(`Il n'y a pas de créneau le ${codeEnJour[listeCodes[i]]}.`);
                    }
                    
                }
            } else {
                console.log(`No slot found for room "${roomName}". Please verify the room name and try again.`);
            }
        } catch (err) {
            console.error(`Error reading filepath:`, err.message);
        }
    })

    //Get-calendar
    .command('get-calendar', 'Get the calendar associated to a student and his courses between two dates.')
    .argument('<startDateEntered>', 'Date that is at the beginning of the calendar')
    .argument('<endDateEntered>', 'Date that is at the end of the calendar')
    .argument("[userCoursesName...]", 'Courses of the student.')
    .action(({ args }) => {
        const startDateEntered = args.startDateEntered;
        const endDateEntered = args.endDateEntered;
        const userCoursesName = args.userCoursesName;

        const folders = ["AB", "CD", "EF", "GH", "IJ", "KL", "MN", "OP", "QR", "ST"];

        let concatenatedContent = '';
  
        try {
            folders.forEach(folder => {
            
                const filePath = path.join("SujetA_data", path.join(folder, 'edt.cru'));
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                concatenatedContent += fileContent + '\n';
            });
            const parser = new CruParser();
            parser.parse(concatenatedContent);
  
            if (!userCoursesName || userCoursesName.length === 0){
                console.log("Aucun cours fourni. Veuillez entrer au moins un cours.");
            }

            const userCourses = parser.courses.filter(course => userCoursesName.includes(course.name));

            if(userCourses.length !== userCoursesName.length){
                console.error("One of the courses you've entered or more does not exist in the database. Please verify the name entered and try again.");
                return;
            }

            for(let course of userCourses){
                course.creneaux = course.creneaux.filter(creneau => creneau.type==="C1" || creneau.type==="D1" || creneau.type==="T1");
            }

            let icsContent = [];

            icsContent.push("BEGIN:VCALENDAR");
            icsContent.push("VERSION:2.0");
            icsContent.push("PRODID:-//MonApplication//MonCalendrier 1.0//FR");

            const startDate = new Date(startDateEntered);
            const endDate = new Date(endDateEntered);
            let currentDate = startDate;

            const codeEnNumJour = {L: 1, MA: 2, ME: 3, J: 4, V: 5};
            const codeEnType = {C1: "CM", D1: "TD", T1: "TP"};

            while (currentDate <= endDate) {

                //console.log(currentDate.toISOString().split("T")[0]);
                
                userCourses.forEach((course, index) => {
                    course.creneaux.forEach((creneau, index2) => {

                        if(codeEnNumJour[creneau.jour] === currentDate.getDay()){

                            icsContent.push("BEGIN:VEVENT");
                            icsContent.push(`UID:${index}-${Date.now()}`);
                            icsContent.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);

                            const debutDeDate = currentDate.toISOString().replace(/[-:]/g, "").split("T")[0] + "T";
                            const horaireMatch = creneau.horaire.match(/(\d+):(\d{2})-(\d+):(\d{2})/);

                            let dateDebut, dateFin;
                            if(horaireMatch[1]<10){
                                dateDebut = debutDeDate + "0" + horaireMatch[1] + horaireMatch[2];
                            }else{
                                dateDebut = debutDeDate + horaireMatch[1] + horaireMatch[2];
                            }
                            
                            if(horaireMatch[3]<10){
                                dateFin = debutDeDate + "0" + horaireMatch[1] + horaireMatch[2];
                            }else{
                                dateFin = debutDeDate + horaireMatch[3] + horaireMatch[4];
                            }
                            
                            icsContent.push(`DTSTART;TZID=Europe/Paris:${dateDebut}00`);
                            icsContent.push(`DTEND;TZID=Europe/Paris:${dateFin}00`);

                            icsContent.push(`SUMMARY:${codeEnType[creneau.type]} de ${course.name.replace(/^\+/, "")}`);
                            icsContent.push(`DESCRIPTION:${codeEnType[creneau.type]} de ${course.name.replace(/^\+/, "")} en ${creneau.salle}.`);
                            icsContent.push(`LOCATION:${creneau.salle}`);
                            icsContent.push("END:VEVENT");
                        }
                        
                    });
                });

                currentDate.setDate(currentDate.getDate() + 1);  
            }

            icsContent.push("END:VCALENDAR");

            const icsFilePath = path.join(path.join(os.homedir(), "Downloads"), "emploi_du_temps.ics");
            fs.writeFileSync(icsFilePath, icsContent.join("\r\n"), "utf-8");

        } catch (err) {
            console.error(`Error reading filepath:`, err.message);
        }
    });
    


program.run();
