let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let alertSound = new Audio('alert.mp3');

function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Notification permission granted.');
            }
        });
    }
}

function showNotification(taskName) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Suivi du Temps', {
            body: `La tâche "${taskName}" a dépassé sa limite de temps!`,
            icon: 'icon.png' // Ajoutez une icône appropriée si disponible
        });
    }
}

function addTask() {
    const taskName = document.getElementById('taskName').value;
    const taskLimit = parseInt(document.getElementById('taskLimit').value, 10) * 60000; // Convertir les minutes en millisecondes
    if (taskName.trim() === '' || isNaN(taskLimit)) return;

    const task = {
        name: taskName,
        limit: taskLimit,
        startTime: null,
        endTime: null,
        duration: 0,
        running: false,
        interval: null,
        alerted: false,
        state: 'stopped', // Ajouté pour suivre l'état
        finished: false  // Ajouté pour suivre l'état de fin
    };

    tasks.push(task);
    document.getElementById('taskName').value = '';
    document.getElementById('taskLimit').value = '15'; // Réinitialiser à la valeur par défaut
    saveTasks();
    renderTasks();
}

function toggleTimer(index) {
    if (tasks[index].running) {
        pauseTimer(index);
    } else {
        startTimer(index);
    }
}

function startTimer(index) {
    if (tasks[index].running) return;

    tasks[index].startTime = Date.now() - tasks[index].duration;
    tasks[index].running = true;
    tasks[index].finished = false; // Réinitialiser finished lors de la reprise
    tasks[index].interval = setInterval(() => {
        tasks[index].duration = Date.now() - tasks[index].startTime;
        if (tasks[index].duration > tasks[index].limit && !tasks[index].alerted) {
            console.log(`La tâche "${tasks[index].name}" a dépassé sa limite de temps!`);
            tasks[index].alerted = true;  // Définir alerté à vrai immédiatement pour éviter les déclenchements multiples
            playSoundAndNotify(tasks[index]); // Jouer le son et afficher la notification pour la tâche dépassée
        }
        saveTasks();
        renderTasks();
    }, 1000);

    tasks[index].state = 'running'; // Mettre à jour l'état
    updateButtonStyles(index);
}

function pauseTimer(index) {
    if (!tasks[index].running) return;

    clearInterval(tasks[index].interval);
    tasks[index].running = false;
    tasks[index].duration = Date.now() - tasks[index].startTime;
    saveTasks();
    renderTasks();

    tasks[index].state = 'paused'; // Mettre à jour l'état
    updateButtonStyles(index);
}

function finishTask(index) {
    clearInterval(tasks[index].interval);
    tasks[index].running = false;
    tasks[index].finished = true;
    tasks[index].state = 'finished'; // Mettre à jour l'état
    saveTasks();
    renderTasks();
}

function stopSound() {
    alertSound.pause();
    alertSound.currentTime = 0; // Réinitialiser le son au début
}

function deleteTask(index) {
    clearInterval(tasks[index].interval);
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function renderTasks() {
    const tasksContainer = document.getElementById('tasks');
    tasksContainer.innerHTML = '';

    tasks.forEach((task, index) => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task';

        if (task.finished) {
            taskElement.classList.add('finished');
        }

        const hours = Math.floor(task.duration / 3600000);
        const minutes = Math.floor((task.duration % 3600000) / 60000);
        const seconds = Math.floor((task.duration % 60000) / 1000);

        const limitMinutes = Math.floor(task.limit / 60000);

        const durationClass = task.duration > task.limit ? 'overdue' : '';

        let exceededTime = '';
        if (task.duration > task.limit) {
            const exceededDuration = task.duration - task.limit;
            const exceededHours = Math.floor(exceededDuration / 3600000);
            const exceededMinutes = Math.floor((exceededDuration % 3600000) / 60000);
            const exceededSeconds = Math.floor((exceededDuration % 60000) / 1000);
            exceededTime = `Dépassé de : ${exceededHours}h ${exceededMinutes}m ${exceededSeconds}s`;
        }

        const buttonLabel = task.finished ? 'Reprendre' : (task.running ? 'Pause' : 'Démarrer');

        taskElement.innerHTML = `
            <button class="delete-button" onclick="deleteTask(${index})">Supprimer</button>
            <h3>${task.name}</h3>
            <p class="${durationClass}">Durée : ${hours}h ${minutes}m ${seconds}s</p>
            <p>Limite : ${limitMinutes} minutes</p>
            <p>${exceededTime}</p>
            <button id="toggle-${index}" onclick="toggleTimer(${index})">${buttonLabel}</button>
            ${!task.finished ? `<button onclick="finishTask(${index})">Terminer</button>` : ''}
        `;

        tasksContainer.appendChild(taskElement);

        // Mettre à jour les styles des boutons en fonction de l'état
        updateButtonStyles(index);

        // Vérifier si la tâche a déjà dépassé sa limite et alerter
        if (task.duration > task.limit && !task.alerted) {
            console.log(`La tâche "${task.name}" a déjà dépassé sa limite de temps!`);
            playSoundAndNotify(task); // Jouer le son et afficher la notification pour la tâche déjà dépassée
            task.alerted = true;  // Définir alerté à vrai après que le son commence à jouer
        }
    });
}

function updateButtonStyles(index) {
    const toggleButton = document.getElementById(`toggle-${index}`);
    
    if (toggleButton) {
        toggleButton.classList.remove('button-active', 'button-paused', 'button-stopped');

        if (tasks[index].state === 'running') {
            toggleButton.classList.add('button-active');
        } else if (tasks[index].state === 'paused') {
            toggleButton.classList.add('button-paused');
        } else if (tasks[index].state === 'finished') {
            toggleButton.classList.add('button-stopped');
        }
    }
}

function playSoundAndNotify(task) {
    alertSound.play();
    showNotification(task.name);
    const exceededTime = task.duration - task.limit;
    const exceededHours = Math.floor(exceededTime / 3600000);
    const exceededMinutes = Math.floor((exceededTime % 3600000) / 60000);
    const exceededSeconds = Math.floor((exceededTime % 60000) / 1000);
    setTimeout(() => {
        if (!document.hidden) {
            alert(`La tâche a dépassé sa limite de temps de ${exceededHours}h ${exceededMinutes}m ${exceededSeconds}s ! Cliquez sur OK pour arrêter le son d'alerte.`);
            stopSound();
        }
    }, 1000);  // Retarder légèrement l'alerte pour s'assurer que la notification et le son se produisent d'abord
}

// Event listener to handle visibility change
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        tasks.forEach((task, index) => {
            if (task.alerted) {
                stopSound();
                const exceededTime = task.duration - task.limit;
                const exceededHours = Math.floor(exceededTime / 3600000);
                const exceededMinutes = Math.floor((exceededTime % 3600000) / 60000);
                const exceededSeconds = Math.floor((exceededTime % 60000) / 1000);
                alert(`La tâche "${task.name}" a dépassé sa limite de temps de ${exceededHours}h ${exceededMinutes}m ${exceededSeconds}s ! Cliquez sur OK pour arrêter le son d'alerte.`);
            }
        });
    }
});

requestNotificationPermission();
renderTasks();
