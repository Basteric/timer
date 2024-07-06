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
        new Notification('Time Tracker', {
            body: `La tâche ${taskName} a dépassé la limite de temps !`,
            icon: 'icon.png' // Add an appropriate icon if available
        });
    }
}

function addTask() {
    const taskName = document.getElementById('taskName').value;
    const taskLimit = parseInt(document.getElementById('taskLimit').value, 10) * 60000; // Convert minutes to milliseconds
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
        state: 'stopped', // Added to track state
        finished: false  // Added to track finished state
    };

    tasks.push(task);
    document.getElementById('taskName').value = '';
    document.getElementById('taskLimit').value = '';
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
    tasks[index].interval = setInterval(() => {
        tasks[index].duration = Date.now() - tasks[index].startTime;
        if (tasks[index].duration > tasks[index].limit && !tasks[index].alerted) {
            console.log(`Task "${tasks[index].name}" has exceeded its time limit!`);
            tasks[index].alerted = true;  // Set alerted to true immediately to avoid multiple triggers
            playSoundAndNotify(tasks[index]); // Play sound and show notification for the exceeded task
        }
        saveTasks();
        renderTasks();
    }, 1000);

    tasks[index].state = 'running'; // Update state
    updateButtonStyles(index);
}

function pauseTimer(index) {
    if (!tasks[index].running) return;

    clearInterval(tasks[index].interval);
    tasks[index].running = false;
    tasks[index].duration = Date.now() - tasks[index].startTime;
    saveTasks();
    renderTasks();

    tasks[index].state = 'paused'; // Update state
    updateButtonStyles(index);
}

function finishTask(index) {
    clearInterval(tasks[index].interval);
    tasks[index].running = false;
    tasks[index].finished = true;
    tasks[index].state = 'finished'; // Update state
    saveTasks();
    renderTasks();
}

function stopSound() {
    alertSound.pause();
    alertSound.currentTime = 0; // Reset the sound to the beginning
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

        const buttonLabel = task.running ? 'Pause' : 'Commencer';

        taskElement.innerHTML = `
            <button class="delete-button" onclick="deleteTask(${index})">Supprimer</button>
            <h3>${task.name}</h3>
            <p class="${durationClass}"> <b>Durée :</b> ${hours}h ${minutes}m ${seconds}s</p>
            <p><b>Limite</b> : ${limitMinutes} minutes</p>
            <p>${exceededTime}</p>
            <button id="toggle-${index}" onclick="toggleTimer(${index})">${buttonLabel}</button>
            <button onclick="finishTask(${index})">Terminer</button>
        `;

        tasksContainer.appendChild(taskElement);

        // Update button styles based on state
        updateButtonStyles(index);

        // Check if task already exceeded its limit and alert
        if (task.duration > task.limit && !task.alerted) {
            console.log(`Task "${task.name}" has already exceeded its time limit!`);
            playSoundAndNotify(task); // Play sound and show notification for the already exceeded task
            task.alerted = true;  // Set alerted to true after sound starts playing
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
            toggleButton.disabled = true;
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
            alert(`La tâche à dépassé le temps de ${exceededHours}h ${exceededMinutes}m ${exceededSeconds}s !`);
            stopSound();
        }
    }, 1000);  // Delay alert slightly to ensure notification and sound happen first
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
                alert(`La tâche "${task.name}" a dépassé le temps de ${exceededHours}h ${exceededMinutes}m ${exceededSeconds}s !`);
            }
        });
    }
});

requestNotificationPermission();
renderTasks();
