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
});


    


program.run();
