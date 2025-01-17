const { program } = require("@caporal/core");
const fs = require("fs");
const path = require("path");
const os = require("os");
const CruParser = require("./CruParser");
const { time } = require("console");

const DATA_DIR_BASE_PATH = path.resolve(__dirname, "SujetA_data");

// Gets all cru files in the given directory
const getCruFiles = (dir) => {
  const files = fs.readdirSync(dir);
  let cruFiles = [];

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      cruFiles = cruFiles.concat(getCruFiles(filePath));
    } else if (file.endsWith(".cru")) {
      cruFiles.push(filePath);
    }
  });

  return cruFiles;
};

program
  //Check Cru
  .command("check", "Check the syntax of a CRU file and display parsed data")
  .argument("<file>", "Path to the CRU file")
  .option("--show-errors", "Show parsing errors", { default: true })
  .action(({ args, options }) => {
    const filePath = args.file;
    const showErrors = options["show-errors"];

    if (!isValidCruFile(filePath)) {
      console.error(`Error: The file "${filePath}" is not a valid .cru file.`);
      return;
    }

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const parser = new CruParser(showErrors);

      const courses = parser.parse(fileContent);
      parser.printSummary();

      console.log("Parsed Courses:", JSON.stringify(courses, null, 2));
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err.message);
    }
  })

  //EF0 : get-classroom (type de cours + salle)
  .command("get-classroom", "Get classroom and types of sessions for a course")
  .argument("<file>", "Path to the CRU file")
  .argument("<courseName>", "Name of the course")
  .action(({ args }) => {
    const filePath = args.file;
    const courseName = args.courseName;

    if (!isValidCruFile(filePath)) {
      console.error(`Error: The file "${filePath}" is not a valid .cru file.`);
      return;
    }

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const parser = new CruParser();
      parser.parse(fileContent);

      const course = parser.courses.find((c) => c.name === courseName);
      if (!course) {
        console.error(`Course "${courseName}" not found.`);
        return;
      }

      const creneauxInfo = course.creneaux.map((creneau) => {
        const type = creneau.type;
        const salle = creneau.salle;
        return { type, salle };
      });

      if (creneauxInfo.length > 0) {
        console.log(`Slots for course "${courseName}":`);
        creneauxInfo.forEach((info, index) => {
          console.log(
            `Slot ${index + 1}: Type - ${info.type}, Classroom - ${info.salle}`,
          );
        });
      } else {
        console.log(`No slot found for course "${courseName}".`);
      }
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err.message);
    }
  })

  //Get-slots
  .command("get-slots", "Get the time when a room is free")
  .argument("<roomName>", "Name of the room")
  .action(({ args }) => {
    const folders = [
      "AB",
      "CD",
      "EF",
      "GH",
      "IJ",
      "KL",
      "MN",
      "OP",
      "QR",
      "ST",
    ];
    let concatenatedContent = "";

    const roomName = args.roomName;

    try {
      folders.forEach((folder) => {
        const filePath = path.join("SujetA_data", path.join(folder, "edt.cru"));
        const fileContent = fs.readFileSync(filePath, "utf-8");
        concatenatedContent += fileContent + "\n";
      });
      const parser = new CruParser();
      parser.parse(concatenatedContent);

      const coursesInThisRoom = parser.courses.filter((c) =>
        c.creneaux.some((creneau) => creneau.salle === roomName),
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
        V: [{ start: 8, end: 18 }],
      };

      function retirerPlage(horaires, jour, retirerStart, retirerEnd) {
        if (horaires[jour]) {
          horaires[jour] = horaires[jour].flatMap(({ start, end }) => {
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
      }

      for (const cours of coursesInThisRoom) {
        for (const creneau of cours.creneaux) {
          const jour = creneau.jour;
          const match = creneau.horaire.match(/(\d+):\d{2}-(\d+):\d{2}/);
          const retirerStart = parseInt(match[1], 10);
          const retirerEnd = parseInt(match[2], 10);
          retirerPlage(freeSlots, jour, retirerStart, retirerEnd);
        }
      }

      const codeEnJour = {
        L: "lundi",
        MA: "mardi",
        ME: "mercredi",
        J: "jeudi",
        V: "vendredi",
      };
      const listeCodes = ["L", "MA", "ME", "J", "V"];

      if (coursesInThisRoom.length > 0) {
        for (let i = 0; i < 5; i++) {
          const creneaux = freeSlots[listeCodes[i]];
          if (creneaux.length > 0) {
            console.log(
              `Les créneaux disponibles le ${codeEnJour[listeCodes[i]]} sont:`,
            );
            for (const creneau of creneaux) {
              console.log(`       -> de ${creneau.start}h à ${creneau.end}h.`);
            }
          } else {
            console.log(
              `Il n'y a pas de créneau le ${codeEnJour[listeCodes[i]]}.`,
            );
          }
        }
      } else {
        console.log(
          `No slot found for room "${roomName}". Please verify the room name and try again.`,
        );
      }
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err.message);
    }
  })
  //EF1 : get-capacity (ex pour salle B103)

  .command("get-capacity")
  .argument("<file>", "Path to the CRU file")
  .argument("<room>", "classroom name")
  .action(({ args }) => {
    const filePath = args.file;
    const roomName = args.room;

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const parser = new CruParser(false);
      parser.parse(fileContent);

      const capacities = parser.courses.flatMap((course) =>
        course.creneaux
          .filter((creneau) => creneau.salle === roomName)
          .map((creneau) => creneau.nbPlaces),
      );

      if (capacities.length > 0) {
        const maxCapacity = Math.max(...capacities);
        console.log(
          `Capacity for classroom ${roomName}: ${maxCapacity} places.`,
        );
      } else {
        console.log(`No data found for room ${roomName}.`);
      }
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err.message);
    }
  })

  // EF3: get-free-classrooms
  .command(
    "get-free-classrooms",
    "Get free classrooms for a specific slot in the week",
  )
  .argument("<day>", "Day of the week ( L, MA, ME)")
  .argument("<hour>", "Hour of the slot ( 10:00)")
  .option("--file <file>", "Specify the file, or let by default")
  .action(({ args, options }) => {

    const targetDay = args.day.toUpperCase();
    const targetHour = args.hour;

   //petit changement, ajout d'une option pour pouvoir choisir un fichier spécific lors de l'execution de la commande 
    const filePath = options.file || DATA_DIR_BASE_PATH;

    const validDays = new Set(["L","M","ME","J","V"]);
    if(!validDays.has(targetDay)){
      console.error('Day is invalid "${targetDay}"');
      return; 
    }

    const validHour = /^(\d{1,2}):(\d{2})$/;
    const verifyMatch = targetHour.match(validHour); 
    if(!verifyMatch) {
      console.error('Hour is invalid "{targetHour}"');
      return;
    }

    const h = parseInt(verifyMatch[1], 10);
    const m =parseInt (verifyMatch[2], 10);
    if(h<0 || h>23 || m<0 || m>59) {
      console.error('Invalid, "{targetHour}" must be in range of 00:00 to 23:59');
      return;
    }
    const cruFiles = fs.statSync(filePath).isDirectory()  ? getCruFiles(DATA_DIR_BASE_PATH) : [filePath];

    if (cruFiles.length === 0) {
      console.error("No .cru files found in the directory.");
      return;
    }

    const allCreneaux = [];
    const allRoomsSet = new Set();

    cruFiles.forEach((filePath) => {
      try {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const parser = new CruParser();
        parser.parse(fileContent);

        // Collecter les créneaux et extraire une liste de salles
        parser.courses.forEach((course) => {
          course.creneaux.forEach((creneau) => {
            allCreneaux.push({
              jour: creneau.jour.toUpperCase(),
              horaire: creneau.horaire,
              salle: creneau.salle,
            });
            allRoomsSet.add(creneau.salle);
          });
        });
      } catch (err) {
        console.error(`Error parsing file ${filePath}:`, err.message);
      }
    });
    // Ajout d'une fonction pour rendre plus flexible la detection des créneaux libres, [premier essai de résolution de l'issue EF3] 
    function isTimeInInterval(targetTime, range) {

      const [start, end] = range.split("-").map((time) => time.trim());

      const toMinutes = (hhmm) => {
        const [h, m] = hhmm.split(":").map(Number);
        return h * 60 + m;
      };
    
      const startM = toMinutes(start);
      const endM = toMinutes(end);
      const targetM = toMinutes(targetTime);

      return targetM >= startM && targetM < endM;
    }

    // Convertir en tableau
    const allRooms = Array.from(allRoomsSet);

    // Les salles occupées
    const occupiedRooms = allCreneaux
      .filter(
        (creneau) =>
          creneau.jour === targetDay && isTimeInInterval(targetHour, creneau.horaire),
      )
      .map((creneau) => creneau.salle);

    const freeRooms = allRooms.filter(
      (room) => !occupiedRooms.includes(room),
    );

    //Affichage des salles vides
    if (freeRooms.length > 0) {
      console.log(`Free classrooms on ${targetDay} at ${targetHour}:`);
      freeRooms.forEach((room) => console.log(`- ${room}`));
    } else {
      console.log(`No free classrooms on ${targetDay} at ${targetHour}.`);
    }
  })

  // EF5: Generate-occupancy
  .command("generate-occupancy", "Generate room occupancy visualization")
  .argument("<file>", "Path to the CRU file")
  .action(({ args }) => {
    const filePath = args.file;

    if (!isValidCruFile(filePath)) {
      console.error(`Error: The file "${filePath}" is not a valid .cru file.`);
      return;
    }

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const parser = new CruParser();
      parser.parse(fileContent);

      // Extraire les créneaux pour chaque salle
      const salleUsage = {};
      parser.courses.forEach((course) => {
        course.creneaux.forEach((creneau) => {
          const salle = creneau.salle;
          const horaire = creneau.horaire;

          // durée du creneau
          const [startTime, endTime] = horaire.split("-");
          const [startHour, startMinute] = startTime.split(":").map(Number);
          const [endHour, endMinute] = endTime.split(":").map(Number);

          const duration =
            endHour * 60 + endMinute - (startHour * 60 + startMinute); // Durée en minutes

          // somme des durées
          if (!salleUsage[salle]) {
            salleUsage[salle] = 0;
          }
          salleUsage[salle] += duration;
        });
      });

      // Calcul du taux d'occupation
      const totalWeekMinutes = 5 * 8 * 60; // Supposons 5 jours de 8 heures par jour
      const salleOccupancy = Object.entries(salleUsage).map(
        ([salle, usedMinutes]) => ({
          salle,
          occupancyRate: (usedMinutes / totalWeekMinutes) * 100,
          usedMinutes,
        }),
      );

      salleOccupancy.sort((a, b) => b.occupancyRate - a.occupancyRate);

      // Visualisation (console + histogramme)
      console.log("Room Occupancy Rates:");
      salleOccupancy.forEach(({ salle, occupancyRate, usedMinutes }) => {
        console.log(
          `${salle}: ${occupancyRate.toFixed(2)}% (${usedMinutes} minutes)`,
        );
      });

      //Générer un histogramme avec node-plotlib : Problème dans la génération, demander au prof
      // const plot = require('nodeplotlib');
      const { plot, serve } = require("nodeplotlib");

      const labels = salleOccupancy.map((item) => item.salle);
      const data = salleOccupancy.map((item) => item.occupancyRate);

      // Préparation du graphique

      const trace = {
        x: labels,
        y: data,
        type: "bar",
        name: "Room Occupancy",
      };

      const layout = {
        title: "Room Occupancy Rates",
        xaxis: { title: "Rooms" },
        yaxis: { title: "Occupancy Rate (%)", range: [0, 100] },
      };

      // Affichage du graphique
      plot([trace], layout); // Prépare le graphique
      serve(); // Démarre le serveur Nodeplotlib
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err.message);
    }
  })

  // EF4: Get-calendar
  .command(
    "get-calendar",
    "Get the calendar associated to a student and his courses between two dates.",
  )
  .argument(
    "<startDateEntered>",
    "Date that is at the beginning of the calendar",
  )
  .argument("<endDateEntered>", "Date that is at the end of the calendar")
  .argument("[userCoursesName...]", "Courses of the student.")
  .option(
    "--output-path <output-path>",
    "The path to use when generating the ICS file",
  )
  .action(({ args, options }) => {
    const startDateEntered = args.startDateEntered;
    const endDateEntered = args.endDateEntered;
    const userCoursesName = args.userCoursesName;

    // Verifications on given dates
    const start = new Date(startDateEntered);
    const end = new Date(endDateEntered);

    // Valid date syntax
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDateEntered) || !dateRegex.test(endDateEntered)) {
     console.log("Error: Start date AND end date must be given as: YYYY-MM-DD.");
     return;
    }

    // Valid date semantics
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.log("Error: One of the given dates is invalid.");
      return;
    }

    // Start date prior to end date
    if (start > end) {
      console.log("Error: The start date must be prior to the end date.");
      return;
    }

    // Dates given between fixed limits
    const minDate = new Date("2024-01-01");
    const maxDate = new Date("2025-12-31");

    if (start < minDate || end > maxDate) {
      console.log("Error: Dates must be given between 2024-01-01 and 2025-12-31.");
      return;
    }

    const folders = [
      "AB",
      "CD",
      "EF",
      "GH",
      "IJ",
      "KL",
      "MN",
      "OP",
      "QR",
      "ST",
    ];

    let concatenatedContent = "";

    try {
      folders.forEach((folder) => {
        const filePath = path.join("SujetA_data", path.join(folder, "edt.cru"));
        const fileContent = fs.readFileSync(filePath, "utf-8");
        concatenatedContent += fileContent + "\n";
      });
      const parser = new CruParser();
      parser.parse(concatenatedContent);

      if (!userCoursesName || userCoursesName.length === 0) {
        console.log("Aucun cours fourni. Veuillez entrer au moins un cours.");
        return;
      }

      const userCourses = parser.courses.filter((course) =>
        userCoursesName.includes(course.name),
      );

      if (userCourses.length !== userCoursesName.length) {
        console.error(
          "One of the courses you've entered or more does not exist in the database. Please verify the name entered and try again.",
        );
        return;
      }

      for (let course of userCourses) {
        course.creneaux = course.creneaux.filter(
          (creneau) =>
            creneau.type === "C1" ||
            creneau.type === "D1" ||
            creneau.type === "T1",
        );
      }

      let icsContent = [];

      icsContent.push("BEGIN:VCALENDAR");
      icsContent.push("VERSION:2.0");
      icsContent.push("PRODID:-//MonApplication//MonCalendrier 1.0//FR");

      const startDate = new Date(startDateEntered);
      const endDate = new Date(endDateEntered);
      let currentDate = startDate;

      const codeEnNumJour = { L: 1, MA: 2, ME: 3, J: 4, V: 5 };
      const codeEnType = { C1: "CM", D1: "TD", T1: "TP" };

      while (currentDate <= endDate) {
        userCourses.forEach((course, index) => {
          course.creneaux.forEach((creneau, index2) => {
            if (codeEnNumJour[creneau.jour] === currentDate.getDay()) {
              icsContent.push("BEGIN:VEVENT");
              icsContent.push(`UID:${index}-${Date.now()}`);
              icsContent.push(
                `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
              );

              const debutDeDate =
                currentDate.toISOString().replace(/[-:]/g, "").split("T")[0] +
                "T";
              const horaireMatch = creneau.horaire.match(
                /(\d+):(\d{2})-(\d+):(\d{2})/,
              );

              let dateDebut, dateFin;
              if (horaireMatch[1] < 10) {
                dateDebut =
                  debutDeDate + "0" + horaireMatch[1] + horaireMatch[2];
              } else {
                dateDebut = debutDeDate + horaireMatch[1] + horaireMatch[2];
              }

              if (horaireMatch[3] < 10) {
                dateFin = debutDeDate + "0" + horaireMatch[1] + horaireMatch[2];
              } else {
                dateFin = debutDeDate + horaireMatch[3] + horaireMatch[4];
              }

              icsContent.push(`DTSTART;TZID=Europe/Paris:${dateDebut}00`);
              icsContent.push(`DTEND;TZID=Europe/Paris:${dateFin}00`);

              icsContent.push(
                `SUMMARY:${codeEnType[creneau.type]} de ${course.name.replace(/^\+/, "")}`,
              );
              icsContent.push(
                `DESCRIPTION:${codeEnType[creneau.type]} de ${course.name.replace(/^\+/, "")} en ${creneau.salle}.`,
              );
              icsContent.push(`LOCATION:${creneau.salle}`);
              icsContent.push("END:VEVENT");
            }
          });
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      icsContent.push("END:VCALENDAR");

      const icsFilePath = options.outputPath
        ? options.outputPath
        : path.join(__dirname, "emploi_du_temps.ics");
      fs.writeFileSync(icsFilePath, icsContent.join("\r\n"), "utf-8");
    } catch (err) {
      console.error(`Error reading filepath:`, err.message);
    }
  })

  //EF6 : Rank classrooms by their capacity
  .command("rank-classrooms", "Generate a ranking of classrooms by capacity")
  .argument("<file>", "Path to the CRU file")
  .action(async ({ args }) => {
    const filePath = args.file;

    if (!isValidCruFile(filePath)) {
      console.error(`Error: The file "${filePath}" is not a valid .cru file.`);
      return;
    }

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const parser = new CruParser();
      parser.parse(fileContent);

      // Extraire les salles et leurs capacités
      const salleCapacities = {};

      parser.courses.forEach((course) => {
        course.creneaux.forEach((creneau) => {
          if (!salleCapacities[creneau.salle]) {
            salleCapacities[creneau.salle] = creneau.nbPlaces;
          }
        });
      });

      // Trier les salles par capacité
      const sortedRooms = Object.entries(salleCapacities).sort(
        (a, b) => b[1] - a[1],
      );
      const { plot, serve } = require("nodeplotlib");

      // Afficher le classement dans un tableau
      console.log("\nRanking of Classrooms by Capacity:");
      console.log("---------------------------------");
      console.log("| Capacity | Rooms              |");
      console.log("---------------------------------");
      sortedRooms.forEach(([room, capacity]) => {
        console.log(
          `| ${capacity.toString().padStart(8)} | ${room.padEnd(18)} |`,
        );
      });
      console.log("---------------------------------");

      // Générer un graphique : Problème! demander au prof

      async function generateCapacityChart(sortedRooms) {
        // Extraire les labels (salles) et les données (capacités)
        const labels = sortedRooms.map(([room]) => room);
        const data = sortedRooms.map(([_, capacity]) => capacity);

        // Configuration du graphique avec nodeplotlib
        const chart = {
          x: labels,
          y: data,
          type: "bar", // Type de graphique
          name: "Capacité des salles", // Légende
          marker: {
            color: "rgba(75, 192, 192, 0.6)", // Couleur des barres
            line: {
              color: "rgba(75, 192, 192, 1)", // Bordure des barres
              width: 1, // Largeur des bordures
            },
          },
        };

        // Mise en page (layout) du graphique
        const layout = {
          title: "Capacité des salles",
          xaxis: {
            title: "Salles",
          },
          yaxis: {
            title: "Capacité",
            range: [0, Math.max(...data) + 10], // Ajuster la plage Y
          },
        };

        // Afficher le graphique dans le navigateur
        plot([chart], layout); // Prépare le graphique
        serve(); // Démarre le serveur Nodeplotlib

        console.log("Graphique affiché dans le navigateur.");
      }

      generateCapacityChart(sortedRooms);
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err.message);
    }
  });

function isValidCruFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return extension === ".cru";
}

program.run();
