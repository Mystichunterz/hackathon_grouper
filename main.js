const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function formHackathonGroups(filePath) {
    fs.promises.readFile(filePath, 'utf8')
        .then(data => {
            const participants = JSON.parse(data);
            const groups = [];
            const ungrouped = [...participants];

            const findParticipantByEmail = (email) => {
                const trimmedEmail = email.replace(/,/g, '').toLowerCase();
                return ungrouped.find(p => p.Email.toLowerCase() === trimmedEmail);
            };

            // Group based on specified groupmates
            participants.forEach(participant => {
                if (Array.isArray(participant.Groupmates)) {
                    const group = [participant];
                    participant.Groupmates.forEach(email => {
                        const mate = findParticipantByEmail(email);
                        if (mate && group.length < 4) {
                            group.push(mate);
                            ungrouped.splice(ungrouped.indexOf(mate), 1);
                        }
                    });
                    if (group.length === 4) {
                        groups.push(group);
                        ungrouped.splice(ungrouped.indexOf(participant), 1);
                    }
                }
            });

            // Group ungrouped participants into duo groups by school
            const schoolDuos = {};
            ungrouped.forEach(participant => {
                if (!schoolDuos[participant.School]) {
                    schoolDuos[participant.School] = [];
                }
                schoolDuos[participant.School].push(participant);
            });

            const duoGroups = [];
            const schools = Object.keys(schoolDuos);
            while (schools.length > 1) {
                const school1 = schools.shift();
                const school2 = schools.find(s => schoolDuos[s].length >= 2);
                if (school2) {
                    const duo1 = schoolDuos[school1].splice(0, 2);
                    const duo2 = schoolDuos[school2].splice(0, 2);
                    duoGroups.push([...duo1, ...duo2]);
                    if (schoolDuos[school2].length < 2) {
                        schools.splice(schools.indexOf(school2), 1);
                    }
                }
                if (schoolDuos[school1].length < 2) {
                    schools.splice(schools.indexOf(school1), 1);
                }
            }

            groups.push(...duoGroups);

            const remainingParticipants = [].concat(...Object.values(schoolDuos));

            // Maximize groups of 4 with remaining participants
            while (remainingParticipants.length >= 4) {
                const group = remainingParticipants.splice(0, 4);
                groups.push(group);
            }

            // Distribute remaining participants to existing groups if possible
            if (remainingParticipants.length > 0) {
                for (let i = 0; i < groups.length && remainingParticipants.length > 0; i++) {
                    if (groups[i].length < 4) {
                        groups[i].push(remainingParticipants.shift());
                    }
                }
            }

            // If there are still leftovers, create a new group
            if (remainingParticipants.length > 0) {
                groups.push(remainingParticipants);
            }

            // Generate the final output
            const balancedGroups = groups.map((group, index) => {
                console.log(`Group ${index + 1} has ${group.length} members.`);
                return group.map(participant => ({
                    TeamNumber: index + 1,
                    Name: participant.Name,
                    Email: participant.Email,
                    School: participant.School,
                    LevelOfStudy: participant['Level of Study'],
                    Groupmates: participant.Groupmates,
                    Hackathon: participant['Hackathon?'],
                    Remarks: participant.Remarks
                }));
            });

            const flattenedGroups = balancedGroups.flat();
            const worksheetData = flattenedGroups.map(participant => ({
                'Team Number': participant.TeamNumber,
                'Name': participant.Name,
                'Email': participant.Email,
                'School': participant.School,
                'Level Of Study': participant.LevelOfStudy,
                'Groupmates': participant.Groupmates ? participant.Groupmates.join(', ') : '',
                'Hackathon': participant.Hackathon,
                'Remarks': participant.Remarks
            }));

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Groups');

            const outputFilePath = path.join(__dirname, 'output', 'Grouped_Participants.xlsx');
            XLSX.writeFile(workbook, outputFilePath);

            console.log('File has been written successfully to', outputFilePath);
        })
        .catch(err => {
            console.error('Error:', err);
        });
}

formHackathonGroups('./data/Formatted_Participants.json');
