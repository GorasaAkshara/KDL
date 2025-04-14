// Health Metrics Data
let healthMetrics = {
    'blood-pressure': [],
    'temperature': [],
    'heart-rate': [],
    'weight': [],
    'blood-sugar': []
};

// Appointments Data
let appointments = [];

// Medication Data
let medications = [];

// User Authentication
let currentUser = null;
const users = JSON.parse(localStorage.getItem('users')) || [];

// DOM Elements
const metricForm = document.getElementById('metric-form');
const appointmentForm = document.getElementById('appointment-form');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendMessageBtn = document.getElementById('send-message');
const signInModal = document.getElementById('signInModal');
const signUpModal = document.getElementById('signUpModal');
const profileModal = document.getElementById('profileModal');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const profileIcon = document.getElementById('profileIcon');
const logoutBtn = document.getElementById('logoutBtn');
const showSignUp = document.getElementById('showSignUp');
const medicationForm = document.getElementById('medication-form');
const medicationItems = document.querySelector('.medication-items');

// Initialize Chart.js
let healthChart;
const ctx = document.createElement('canvas');
document.querySelector('.chart-container').appendChild(ctx);

// Event Listeners
metricForm.addEventListener('submit', handleMetricSubmit);
appointmentForm.addEventListener('submit', handleAppointmentSubmit);
sendMessageBtn.addEventListener('click', handleChatMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatMessage();
});
medicationForm.addEventListener('submit', handleMedicationSubmit);

// Authentication Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedInUser();
    } else {
        showSignInModal();
    }

    // Modal Event Listeners
    profileIcon.addEventListener('click', showProfileModal);
    logoutBtn.addEventListener('click', handleLogout);
    showSignUp.addEventListener('click', (e) => {
        e.preventDefault();
        hideSignInModal();
        showSignUpModal();
    });

    // Close button event listeners
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            modal.style.display = 'none';
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === signInModal) hideSignInModal();
        if (e.target === signUpModal) hideSignUpModal();
        if (e.target === profileModal) hideProfileModal();
    });

    // Form Submissions
    signInForm.addEventListener('submit', handleSignIn);
    signUpForm.addEventListener('submit', handleSignUp);

    // Update initialization to load saved metrics
    // Add welcome message to chat
    addMessageToChat('ai', aiResponses.hello);
    
    // Load saved metrics
    const savedMetrics = localStorage.getItem('healthMetrics');
    if (savedMetrics) {
        healthMetrics = JSON.parse(savedMetrics);
        updateMetricHistory();
        updateDashboardMetrics();
    }
    
    // Initialize chart with current data
    updateHealthChart();
    
    // Set minimum date for appointment booking to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointment-date').min = today;
    
    // Load saved appointments
    const savedAppointments = localStorage.getItem('appointments');
    if (savedAppointments) {
        appointments = JSON.parse(savedAppointments);
        updateAppointmentList();
        updateCalendar();
    }
    
    // Load saved medications
    const savedMedications = localStorage.getItem('medications');
    if (savedMedications) {
        medications = JSON.parse(savedMedications);
        updateMedicationList();
    }
});

// Functions
function handleMetricSubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('metric-type').value;
    const value = document.getElementById('metric-value').value;
    
    if (!value) {
        showNotification('Please enter a value', 'error');
        return;
    }
    
    const timestamp = new Date().toISOString();
    
    // Create new metric object
    const newMetric = {
        type,
        value: parseFloat(value),
        timestamp
    };
    
    // Add to metrics array
    healthMetrics[type].push(newMetric);
    
    // Save to localStorage
    localStorage.setItem('healthMetrics', JSON.stringify(healthMetrics));
    
    // Update displays
    updateMetricHistory();
    updateHealthChart();
    updateDashboardMetrics();
    
    // Show success notification
    showNotification('Metric added successfully!');
    
    // Reset form
    e.target.reset();
}

function handleAppointmentSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('appointment-date').value;
    const time = document.getElementById('appointment-time').value;
    const doctorType = document.getElementById('doctor-type').value;
    const notes = document.getElementById('appointment-notes').value;
    
    const appointment = {
        date,
        time,
        doctorType,
        notes,
        id: Date.now()
    };
    
    appointments.push(appointment);
    localStorage.setItem('appointments', JSON.stringify(appointments));
    updateAppointmentList();
    updateCalendar();
    showNotification('Appointment scheduled successfully!');
    e.target.reset();
}

function handleChatMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    addMessageToChat('user', message);
    const response = getAIResponse(message);
    setTimeout(() => addMessageToChat('ai', response), 500);
    userInput.value = '';
}

function addMessageToChat(sender, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getAIResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Check for exact matches first
    for (const [key, response] of Object.entries(aiResponses)) {
        if (lowerMessage === key) {
            return response;
        }
    }
    
    // Check for partial matches
    for (const [key, response] of Object.entries(aiResponses)) {
        if (lowerMessage.includes(key)) {
            return response;
        }
    }
    
    // If no match found, provide a more helpful default response
    return 'I understand you\'re asking about health. Could you please be more specific? I can help with topics like blood pressure, exercise, diet, sleep, stress, headaches, fever, cough, allergies, anxiety, depression, weight loss, diabetes, and heart health.';
}

function updateHealthChart() {
    // Destroy existing chart if it exists
    if (healthChart) {
        healthChart.destroy();
    }

    const selectedType = document.getElementById('metric-type').value;
    const data = healthMetrics[selectedType];
    const chartContainer = document.querySelector('.chart-container');
    
    // Clear the container
    chartContainer.innerHTML = '';
    
    if (!data || data.length === 0) {
        chartContainer.innerHTML = '<p>No data available. Add some metrics to see the chart.</p>';
        return;
    }

    // Create canvas element
    const ctx = document.createElement('canvas');
    chartContainer.appendChild(ctx);

    // Prepare data for chart
    const labels = data.map(item => {
        const date = new Date(item.timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    
    const values = data.map(item => item.value);
    
    // Create new chart
    healthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: selectedType.replace('-', ' ').toUpperCase(),
                data: values,
                borderColor: '#4a90e2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${selectedType.replace('-', ' ').toUpperCase()}: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}

function updateAppointmentList() {
    const appointmentList = document.querySelector('.appointment-list');
    appointmentList.innerHTML = '';
    
    appointments.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
    
    appointments.forEach(appointment => {
        const appointmentDiv = document.createElement('div');
        appointmentDiv.className = 'appointment-item';
        appointmentDiv.innerHTML = `
            <div class="appointment-date">${new Date(appointment.date).toLocaleDateString()}</div>
            <div class="appointment-time">${appointment.time}</div>
            <div class="appointment-doctor">${appointment.doctorType}</div>
            <button onclick="cancelAppointment(${appointment.id})">Cancel</button>
        `;
        appointmentList.appendChild(appointmentDiv);
    });
}

function updateCalendar() {
    const calendarContainer = document.querySelector('.calendar');
    calendarContainer.innerHTML = '';
    
    if (appointments.length === 0) {
        calendarContainer.innerHTML = '<p>No appointments scheduled</p>';
        return;
    }

    // Sort appointments by date and time
    const sortedAppointments = [...appointments].sort((a, b) => {
        return new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time);
    });

    // Group appointments by date
    const appointmentsByDate = {};
    sortedAppointments.forEach(appointment => {
        const date = new Date(appointment.date).toLocaleDateString();
        if (!appointmentsByDate[date]) {
            appointmentsByDate[date] = [];
        }
        appointmentsByDate[date].push(appointment);
    });

    // Create calendar view
    Object.entries(appointmentsByDate).forEach(([date, dayAppointments]) => {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'calendar-date';
        dateDiv.innerHTML = `
            <h4>${date}</h4>
            <div class="appointments-list">
                ${dayAppointments.map(appointment => `
                    <div class="calendar-appointment">
                        <div class="appointment-time">${appointment.time}</div>
                        <div class="appointment-details">
                            <strong>${appointment.doctorType}</strong>
                            ${appointment.notes ? `<p>${appointment.notes}</p>` : ''}
                        </div>
                        <button onclick="cancelAppointment(${appointment.id})" class="cancel-btn">Cancel</button>
                    </div>
                `).join('')}
            </div>
        `;
        calendarContainer.appendChild(dateDiv);
    });
}

function cancelAppointment(id) {
    appointments = appointments.filter(appointment => appointment.id !== id);
    localStorage.setItem('appointments', JSON.stringify(appointments));
    updateAppointmentList();
    updateCalendar();
    showNotification('Appointment cancelled successfully!');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Authentication Functions
function handleSignIn(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        currentUser = { name: user.name, email: user.email };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        hideSignInModal();
        updateUIForLoggedInUser();
        showNotification('Welcome back!');
    } else {
        showNotification('Invalid email or password', 'error');
    }
}

function handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('fullName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    if (users.some(u => u.email === email)) {
        showNotification('Email already registered', 'error');
        return;
    }

    users.push({ name, email, password });
    localStorage.setItem('users', JSON.stringify(users));
    currentUser = { name, email };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    hideSignUpModal();
    updateUIForLoggedInUser();
    showNotification('Account created successfully!');
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    hideProfileModal();
    showSignInModal();
    updateUIForLoggedOutUser();
}

// Modal Functions
function showSignInModal() {
    signInModal.style.display = 'block';
}

function hideSignInModal() {
    signInModal.style.display = 'none';
}

function showSignUpModal() {
    signUpModal.style.display = 'block';
}

function hideSignUpModal() {
    signUpModal.style.display = 'none';
}

function showProfileModal() {
    if (!currentUser) {
        showSignInModal();
        return;
    }
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('totalAppointments').textContent = appointments.length;
    document.getElementById('totalMetrics').textContent = Object.values(healthMetrics).flat().length;
    profileModal.style.display = 'block';
}

function hideProfileModal() {
    profileModal.style.display = 'none';
}

// UI Update Functions
function updateUIForLoggedInUser() {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.style.pointerEvents = 'auto';
        link.style.opacity = '1';
    });
    profileIcon.style.cursor = 'pointer';
}

function updateUIForLoggedOutUser() {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.style.pointerEvents = 'none';
        link.style.opacity = '0.5';
    });
    profileIcon.style.cursor = 'default';
}

// Medication Functions
function handleMedicationSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('medication-name').value;
    const dosage = document.getElementById('medication-dosage').value;
    const frequency = document.getElementById('medication-frequency').value;
    const time = document.getElementById('medication-time').value;
    const notes = document.getElementById('medication-notes').value;
    
    const medication = {
        id: Date.now(),
        name,
        dosage,
        frequency,
        time,
        notes
    };
    
    medications.push(medication);
    updateMedicationList();
    saveMedications();
    showNotification('Medication added successfully!');
    e.target.reset();
}

function updateMedicationList() {
    medicationItems.innerHTML = '';
    
    medications.forEach(medication => {
        const medicationDiv = document.createElement('div');
        medicationDiv.className = 'medication-item';
        medicationDiv.innerHTML = `
            <div class="medication-name">${medication.name}</div>
            <div class="medication-dosage">${medication.dosage}mg</div>
            <div class="medication-frequency">${medication.frequency}</div>
            <div class="medication-time">${medication.time}</div>
            <button onclick="removeMedication(${medication.id})">Remove</button>
        `;
        medicationItems.appendChild(medicationDiv);
    });

    updateDashboardMedications();
}

function updateDashboardMedications() {
    const dashboardMedicationList = document.querySelector('.dashboard .medication-list');
    dashboardMedicationList.innerHTML = '';

    if (medications.length === 0) {
        dashboardMedicationList.innerHTML = '<p>No medications scheduled</p>';
        return;
    }

    // Sort medications by time
    const sortedMedications = [...medications].sort((a, b) => {
        return a.time.localeCompare(b.time);
    });

    sortedMedications.forEach(medication => {
        const medicationDiv = document.createElement('div');
        medicationDiv.className = 'dashboard-medication-item';
        medicationDiv.innerHTML = `
            <div class="medication-time">${medication.time}</div>
            <div class="medication-details">
                <strong>${medication.name}</strong>
                <span>${medication.dosage}mg - ${medication.frequency}</span>
            </div>
        `;
        dashboardMedicationList.appendChild(medicationDiv);
    });
}

function removeMedication(id) {
    medications = medications.filter(medication => medication.id !== id);
    updateMedicationList();
    saveMedications();
    showNotification('Medication removed successfully!');
}

// Save medications to localStorage
function saveMedications() {
    localStorage.setItem('medications', JSON.stringify(medications));
}

// Fix chat bot responses
const aiResponses = {
    'hello': 'Hello! I\'m your AI health companion. How can I help you today?',
    'hi': 'Hi there! I\'m here to help with your health questions. What would you like to know?',
    'hey': 'Hey! How can I assist you with your health today?',
    'how are you': 'I\'m doing well, thank you for asking! How can I assist you with your health today?',
    // ... rest of the existing responses ...
};

function updateMetricHistory() {
    const metricHistory = document.getElementById('metric-history');
    if (!metricHistory) return;
    
    metricHistory.innerHTML = '';
    
    // Get all metrics from all types
    const allMetrics = Object.entries(healthMetrics).flatMap(([type, metrics]) => 
        metrics.map(metric => ({ ...metric, type }))
    );
    
    if (allMetrics.length === 0) {
        metricHistory.innerHTML = '<p>No metrics recorded yet</p>';
        return;
    }
    
    // Sort metrics by timestamp (newest first)
    const sortedMetrics = allMetrics.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Create metric history items
    sortedMetrics.forEach((metric, index) => {
        const metricItem = document.createElement('div');
        metricItem.className = 'metric-history-item';
        
        const date = new Date(metric.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        metricItem.innerHTML = `
            <div class="metric-type">${metric.type.replace('-', ' ').toUpperCase()}</div>
            <div class="metric-value">${metric.value}</div>
            <div class="metric-timestamp">${formattedDate}</div>
            <button class="delete-metric" onclick="deleteMetric('${metric.type}', ${index})">Delete</button>
        `;
        
        metricHistory.appendChild(metricItem);
    });
}

function deleteMetric(type, index) {
    // Remove the metric from the array
    healthMetrics[type].splice(index, 1);
    
    // Save to localStorage
    localStorage.setItem('healthMetrics', JSON.stringify(healthMetrics));
    
    // Update displays
    updateMetricHistory();
    updateHealthChart();
    updateDashboardMetrics();
    
    // Show notification
    showNotification('Metric deleted successfully!');
}

function updateDashboardMetrics() {
    // Get the latest values for each metric type
    const latestMetrics = {};
    Object.keys(healthMetrics).forEach(type => {
        if (healthMetrics[type].length > 0) {
            // Sort by timestamp and get the latest
            const sorted = [...healthMetrics[type]].sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            latestMetrics[type] = sorted[0].value;
        }
    });

    // Update dashboard values
    const dashboardValues = {
        'blood-pressure': document.querySelector('.dashboard .blood-pressure .stat-value'),
        'temperature': document.querySelector('.dashboard .temperature .stat-value'),
        'heart-rate': document.querySelector('.dashboard .heart-rate .stat-value'),
        'weight': document.querySelector('.dashboard .weight .stat-value'),
        'blood-sugar': document.querySelector('.dashboard .blood-sugar .stat-value')
    };

    Object.entries(dashboardValues).forEach(([type, element]) => {
        if (element && latestMetrics[type]) {
            element.textContent = latestMetrics[type];
        } else if (element) {
            element.textContent = '--';
        }
    });
} 