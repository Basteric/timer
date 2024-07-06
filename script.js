let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
const alertSound = document.getElementById('alertSound');

function testSound() {
    alertSound.play().then(() => {
        console.log("Sound is playing");
    }).catch((error) => {
        console.log("Error playing sound: ", error);
    });
}

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
            body: `Task "${taskName}" has exceeded its time limit!`,
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
        alerted: false
    };

    tasks.push(task);
    document.getElementById('taskName').value = '';
    document.getElementById('taskLimit').value = '';
    saveTasks();
    renderTasks();
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
            playSoundAndNotify(index); // Play sound and show notification for the exceeded task
        }
        saveTasks();
        renderTasks();
    }, 1000);
}

function pauseTimer(index) {
    if (!tasks[index].running) return;

    clearInterval(tasks[index].interval);
    tasks[index].running = false;
    tasks[index].duration = Date.now() - tasks[index].startTime;
    saveTasks();
    renderTasks();
}

function stopTimer(index) {
    if (!tasks[index].running) return;

    clearInterval(tasks[index].interval);
    tasks[index].endTime = Date.now();
    tasks[index].running = false;
    tasks[index].duration = tasks[index].endTime - tasks[index].startTime;
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

        const hours = Math.floor(task.duration / 3600000);
        const minutes = Math.floor((task.duration % 3600000) / 60000);
        const seconds = Math.floor((task.duration % 60000) / 1000);

        const limitMinutes = Math.floor(task.limit / 60000);

        const durationClass = task.duration > task.limit ? 'overdue' : '';

        taskElement.innerHTML = `
            <h3>${task.name}</h3>
            <p class="${durationClass}">Duration: ${hours}h ${minutes}m ${seconds}s</p>
            <p>Limit: ${limitMinutes} minutes</p>
            <button onclick="startTimer(${index})">Start</button>
            <button onclick="pauseTimer(${index})">Pause</button>
            <button onclick="stopTimer(${index})">Stop</button>
            <button onclick="deleteTask(${index})">Delete</button>
        `;

        tasksContainer.appendChild(taskElement);

        // Check if task already exceeded its limit and alert
        if (task.duration > task.limit && !task.alerted) {
            console.log(`Task "${task.name}" has already exceeded its time limit!`);
            playSoundAndNotify(index); // Play sound and show notification for the already exceeded task
            task.alerted = true;  // Set alerted to true after sound starts playing
        }
    });
}

function playSoundAndNotify(index) {
    alertSound.play().then(() => {
        console.log("Sound is playing for task index: " + index);
        showNotification(tasks[index].name);
        alert("Task has exceeded its time limit! Click OK to stop the alert sound.");
        stopSound();
    }).catch((error) => {
        console.log("Error playing sound: ", error);
    });
}

requestNotificationPermission();
renderTasks();
