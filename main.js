const fs = require('fs');
const path = require('path');

function formHackathonGroups(filePath) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return;
        }

        try {
            const participants = JSON.parse(data);
            const groups = [];
            const ungrouped = [...participants];

            const findParticipantByEmail = (email) => {
                return ungrouped.find(p => p.Email.toLowerCase() === email.toLowerCase());
            };

            participants.forEach(participant => {
                if (participant.Groupmates) {
                    const group = [participant];
                    participant.Groupmates.forEach(email => {
                        const mate = findParticipantByEmail(email);
                        if (mate && group.length < 4) {
                            group.push(mate);
                            ungrouped.splice(ungrouped.indexOf(mate), 1);
                        }
                    });
                    if (group.length > 1) {
                        groups.push(group);
                        ungrouped.splice(ungrouped.indexOf(participant), 1);
                    }
                }
            });

            const schoolDuos = {};
            ungrouped.forEach(participant => {
                if (!schoolDuos[participant.School]) {
                    schoolDuos[participant.School] = [];
                }
                schoolDuos[participant.School].push(participant);
            });

            Object.values(schoolDuos).forEach(schoolGroup => {
                while (schoolGroup.length > 1) {
                    const duo = schoolGroup.splice(0, 2);
                    groups.push(duo);
                }
            });

            const remainingParticipants = [].concat(...Object.values(schoolDuos));
            while (remainingParticipants.length > 0) {
                const group = [];
                for (let i = 0; i < 4 && remainingParticipants.length > 0; i++) {
                    group.push(remainingParticipants.shift());
                }
                groups.push(group);
            }

            const balancedGroups = groups.map(group => {
                return group.map(participant => ({
                    Name: participant.Name,
                    Email: participant.Email,
                    School: participant.School,
                    LevelOfStudy: participant['Level of Study'],
                    Groupmates: participant.Groupmates,
                    Hackathon: participant['Hackathon?'],
                    Remarks: participant.Remarks
                }));
            });

            const outputFilePath = path.join(__dirname, 'output', 'Grouped_Participants.json');
            fs.writeFile(outputFilePath, JSON.stringify(balancedGroups, null, 2), 'utf8', (writeErr) => {
                if (writeErr) {
                    console.error('Error writing file:', writeErr);
                } else {
                    console.log('File has been written successfully to', outputFilePath);
                }
            });
        } catch (parseErr) {
            console.error('Error parsing JSON:', parseErr);
        }
    });
}

formHackathonGroups('./To_Be_Grouped.json');