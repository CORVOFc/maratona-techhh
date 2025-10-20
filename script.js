/**
 * STUDIFY - Hub Pessoal de Organização Acadêmica
 * Aplicação completa em HTML, CSS e JavaScript puro
 * 
 * Pilares do Pensamento Computacional:
 * 1. DECOMPOSIÇÃO: Dividir o problema em partes menores (Subjects, Tasks, Deadlines, etc.)
 * 2. RECONHECIMENTO DE PADRÕES: Reutilizar componentes (cards, modals, forms)
 * 3. ABSTRAÇÃO: Focar nos aspectos essenciais, ignorar detalhes irrelevantes
 * 4. ALGORITMOS: Implementar lógicas de timer, cálculos de datas, validações
 */

// ============================================
// ESTADO GLOBAL (Armazenamento em LocalStorage)
// ============================================

class StudifyApp {
    constructor() {
        this.subjects = this.loadFromStorage('subjects') || [];
        this.tasks = this.loadFromStorage('tasks') || [];
        this.deadlines = this.loadFromStorage('deadlines') || [];
        this.dailyFocus = this.loadFromStorage('dailyFocus') || null;
        this.stats = this.loadFromStorage('stats') || {
            tasksCompletedThisWeek: 0,
            pomodoroStreakDays: 0,
            totalPomodoroMinutes: 0,
        };
        this.pomodoroTimer = null;
        this.pomodoroRunning = false;
        this.pomodoroTimeLeft = 25 * 60;
        this.pomodoroSessionDuration = 25;

        this.initializeApp();
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================

    initializeApp() {
        this.setupEventListeners();
        this.updateGreeting();
        this.renderDashboard();
        this.setupSectionNavigation();
        this.addSampleData();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Task Modal
        document.getElementById('newTaskBtn').addEventListener('click', () => this.openModal('taskModal'));
        document.getElementById('addSubjectBtn').addEventListener('click', () => this.openModal('subjectModal'));
        document.getElementById('setFocusBtn').addEventListener('click', () => this.openModal('focusModal'));
        document.getElementById('closeTaskModal').addEventListener('click', () => this.closeModal('taskModal'));
        document.getElementById('closeSubjectModal').addEventListener('click', () => this.closeModal('subjectModal'));
        document.getElementById('closeFocusModal').addEventListener('click', () => this.closeModal('focusModal'));
        document.getElementById('cancelTaskBtn').addEventListener('click', () => this.closeModal('taskModal'));
        document.getElementById('cancelSubjectBtn').addEventListener('click', () => this.closeModal('subjectModal'));
        document.getElementById('cancelFocusBtn').addEventListener('click', () => this.closeModal('focusModal'));

        // Forms
        document.getElementById('taskForm').addEventListener('submit', (e) => this.handleAddTask(e));
        document.getElementById('subjectForm').addEventListener('submit', (e) => this.handleAddSubject(e));
        document.getElementById('focusForm').addEventListener('submit', (e) => this.handleSetFocus(e));

        // Pomodoro
        document.getElementById('btn25').addEventListener('click', () => this.setPomodoroTime(25));
        document.getElementById('btn5').addEventListener('click', () => this.setPomodoroTime(5));
        document.getElementById('btn15').addEventListener('click', () => this.setPomodoroTime(15));
        document.getElementById('startPomodoroBtn').addEventListener('click', () => this.togglePomodoro());
        document.getElementById('resetPomodoroBtn').addEventListener('click', () => this.resetPomodoro());

        // Overlay
        document.getElementById('overlay').addEventListener('click', () => this.closeAllModals());

        // Profile Menu
        document.getElementById('profileBtn').addEventListener('click', () => {
            document.getElementById('profileDropdown').style.display = 
                document.getElementById('profileDropdown').style.display === 'block' ? 'none' : 'block';
        });

        // Close profile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.profile-menu')) {
                document.getElementById('profileDropdown').style.display = 'none';
            }
        });
    }

    setupSectionNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.switchSection(section);
            });
        });
    }

    // ============================================
    // NAVEGAÇÃO
    // ============================================

    handleNavigation(e) {
        e.preventDefault();
        const section = e.target.dataset.section;
        this.switchSection(section);
    }

    switchSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        document.getElementById(sectionId).classList.add('active');

        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionId) {
                link.classList.add('active');
            }
        });

        // Render section content
        if (sectionId === 'subjects') {
            this.renderSubjectsPage();
        } else if (sectionId === 'calendar') {
            this.renderCalendar();
        } else if (sectionId === 'tasks') {
            this.renderTasksPage();
        }
    }

    // ============================================
    // DASHBOARD
    // ============================================

    updateGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Bom dia';
        if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
        if (hour >= 18) greeting = 'Boa noite';

        document.getElementById('greeting').textContent = `${greeting}, Estudante! 👋`;
        
        // Update date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const date = new Date().toLocaleDateString('pt-BR', options);
        document.getElementById('currentDate').textContent = date.charAt(0).toUpperCase() + date.slice(1);
    }

    renderDashboard() {
        this.renderDeadlines();
        this.renderSubjects();
        this.updateStatistics();
        this.renderDailyFocus();
        this.updateTaskSubjectSelect();
    }

    renderDeadlines() {
        const deadlinesList = document.getElementById('deadlinesList');
        const upcoming = this.getUpcomingDeadlines(5);

        if (upcoming.length === 0) {
            deadlinesList.innerHTML = '<p class="empty-state">Nenhum prazo próximo 🎉</p>';
            return;
        }

        deadlinesList.innerHTML = upcoming.map(deadline => `
            <div class="deadline-item ${this.getDeadlineClass(deadline)}">
                <h3>${this.getDeadlineIcon(deadline.type)} ${deadline.title}</h3>
                <p>${this.formatDate(new Date(deadline.dueDate))}</p>
                <span class="deadline-type">${this.translateDeadlineType(deadline.type)}</span>
                ${this.getDaysUntilText(deadline.dueDate)}
            </div>
        `).join('');
    }

    renderSubjects() {
        const subjectsList = document.getElementById('subjectsList');
        
        if (this.subjects.length === 0) {
            subjectsList.innerHTML = '<p class="empty-state">Nenhuma matéria adicionada</p>';
            return;
        }

        subjectsList.innerHTML = this.subjects.map(subject => `
            <div class="subject-card" style="border-top-color: ${subject.color}">
                <div class="subject-icon">${subject.icon}</div>
                <div class="subject-name">${subject.name}</div>
            </div>
        `).join('');
    }

    updateStatistics() {
        const tasksThisWeek = this.getTasksCompletedThisWeek();
        document.getElementById('tasksCompletedStat').textContent = tasksThisWeek;
        document.getElementById('streakStat').textContent = this.stats.pomodoroStreakDays;
        document.getElementById('pomodorosStat').textContent = this.stats.totalPomodoroMinutes;
    }

    renderDailyFocus() {
        const container = document.getElementById('dailyFocusContainer');
        
        if (this.dailyFocus) {
            container.innerHTML = `
                <div class="focus-icon">🎯</div>
                <div class="focus-content">
                    <h2>Seu Foco Hoje</h2>
                    <p class="focus-title">${this.dailyFocus.title}</p>
                    ${this.dailyFocus.description ? `<p>${this.dailyFocus.description}</p>` : ''}
                    <button class="btn btn-primary" onclick="app.completeDailyFocus()">
                        <i class="fas fa-check"></i> Marcar como Concluído
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="focus-icon">🎯</div>
                <div class="focus-content">
                    <h2>Seu Foco Hoje</h2>
                    <p class="focus-title">Nenhum foco definido para hoje</p>
                    <button class="btn btn-primary" id="setFocusBtn">Definir Foco</button>
                </div>
            `;
        }
    }

    // ============================================
    // TAREFAS
    // ============================================

    handleAddTask(e) {
        e.preventDefault();

        const task = {
            id: this.generateId(),
            title: document.getElementById('taskTitle').value,
            subjectId: document.getElementById('taskSubject').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value || null,
            description: document.getElementById('taskDescription').value,
            completed: false,
            createdAt: new Date().toISOString(),
        };

        this.tasks.push(task);
        this.saveToStorage('tasks', this.tasks);
        this.closeModal('taskModal');
        this.resetForm('taskForm');
        this.renderDashboard();
        this.showNotification('Tarefa criada com sucesso!');
    }

    renderTasksPage() {
        const tasksList = document.getElementById('tasksPageList');
        
        if (this.tasks.length === 0) {
            tasksList.innerHTML = '<p class="empty-state">Nenhuma tarefa criada</p>';
            return;
        }

        const grouped = this.groupTasksBySubject();
        tasksList.innerHTML = Object.entries(grouped).map(([subjectId, tasks]) => {
            const subject = this.subjects.find(s => s.id === subjectId);
            return `
                <div class="card">
                    <div class="card-header" style="background: ${subject?.color || '#667eea'}">
                        <span>${subject?.icon || '📚'}</span>
                        <h3>${subject?.name || 'Sem matéria'}</h3>
                    </div>
                    <div class="card-content">
                        ${tasks.map(task => `
                            <div class="deadline-item">
                                <h3>
                                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                                        onchange="app.toggleTask('${task.id}')">
                                    <span style="text-decoration: ${task.completed ? 'line-through' : 'none'}">${task.title}</span>
                                </h3>
                                <p>${task.description || ''}</p>
                                ${task.dueDate ? `<p>Entrega: ${this.formatDate(new Date(task.dueDate))}</p>` : ''}
                                <span class="deadline-type">${this.translatePriority(task.priority)}</span>
                                <button class="btn btn-secondary" style="margin-top: 0.5rem;" onclick="app.deleteTask('${task.id}')">
                                    <i class="fas fa-trash"></i> Deletar
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveToStorage('tasks', this.tasks);
            this.renderDashboard();
            this.renderTasksPage();
        }
    }

    deleteTask(taskId) {
        if (confirm('Tem certeza que deseja deletar esta tarefa?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveToStorage('tasks', this.tasks);
            this.renderDashboard();
            this.renderTasksPage();
        }
    }

    // ============================================
    // MATÉRIAS
    // ============================================

    handleAddSubject(e) {
        e.preventDefault();

        const subject = {
            id: this.generateId(),
            name: document.getElementById('subjectName').value,
            color: document.getElementById('subjectColor').value,
            icon: document.getElementById('subjectIcon').value || '📚',
            createdAt: new Date().toISOString(),
        };

        this.subjects.push(subject);
        this.saveToStorage('subjects', this.subjects);
        this.closeModal('subjectModal');
        this.resetForm('subjectForm');
        this.renderDashboard();
        this.updateTaskSubjectSelect();
        this.showNotification('Matéria criada com sucesso!');
    }

    renderSubjectsPage() {
        const subjectsPageList = document.getElementById('subjectsPageList');
        
        if (this.subjects.length === 0) {
            subjectsPageList.innerHTML = '<p class="empty-state">Nenhuma matéria criada</p>';
            return;
        }

        subjectsPageList.innerHTML = `
            <div class="subjects-grid">
                ${this.subjects.map(subject => `
                    <div class="subject-card" style="border-top-color: ${subject.color}">
                        <div class="subject-icon">${subject.icon}</div>
                        <div class="subject-name">${subject.name}</div>
                        <button class="btn btn-secondary" style="margin-top: 1rem; width: 100%;" 
                            onclick="app.deleteSubject('${subject.id}')">
                            <i class="fas fa-trash"></i> Deletar
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    deleteSubject(subjectId) {
        if (confirm('Tem certeza que deseja deletar esta matéria?')) {
            this.subjects = this.subjects.filter(s => s.id !== subjectId);
            this.tasks = this.tasks.filter(t => t.subjectId !== subjectId);
            this.deadlines = this.deadlines.filter(d => d.subjectId !== subjectId);
            this.saveToStorage('subjects', this.subjects);
            this.saveToStorage('tasks', this.tasks);
            this.saveToStorage('deadlines', this.deadlines);
            this.renderDashboard();
            this.renderSubjectsPage();
            this.updateTaskSubjectSelect();
        }
    }

    updateTaskSubjectSelect() {
        const select = document.getElementById('taskSubject');
        select.innerHTML = '<option value="">Selecione uma matéria</option>' +
            this.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }

    // ============================================
    // PRAZOS
    // ============================================

    getUpcomingDeadlines(limit = 5) {
        const now = new Date();
        return this.deadlines
            .filter(d => new Date(d.dueDate) > now)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, limit);
    }

    getDeadlineClass(deadline) {
        const now = new Date();
        const dueDate = new Date(deadline.dueDate);
        const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) return 'overdue';
        if (daysUntil <= 3) return 'urgent';
        return '';
    }

    getDaysUntilText(dueDate) {
        const now = new Date();
        const due = new Date(dueDate);
        const daysUntil = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) {
            return `<p style="color: #EF4444; font-weight: 600;"><i class="fas fa-exclamation-circle"></i> Atrasado</p>`;
        }
        if (daysUntil <= 3) {
            return `<p style="color: #F59E0B; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> ${daysUntil} dia${daysUntil !== 1 ? 's' : ''} restante${daysUntil !== 1 ? 's' : ''}</p>`;
        }
        return '';
    }

    renderCalendar() {
        const container = document.getElementById('calendarContainer');
        
        if (this.deadlines.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum prazo cadastrado</p>';
            return;
        }

        const grouped = this.groupDeadlinesByMonth();
        container.innerHTML = Object.entries(grouped).map(([month, deadlines]) => `
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-calendar"></i>
                    <h3>${month}</h3>
                </div>
                <div class="card-content">
                    ${deadlines.map(d => `
                        <div class="deadline-item">
                            <h3>${this.getDeadlineIcon(d.type)} ${d.title}</h3>
                            <p>${this.formatDate(new Date(d.dueDate))}</p>
                            <span class="deadline-type">${this.translateDeadlineType(d.type)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // ============================================
    // FOCO DO DIA
    // ============================================

    handleSetFocus(e) {
        e.preventDefault();

        this.dailyFocus = {
            id: this.generateId(),
            title: document.getElementById('focusTitle').value,
            description: document.getElementById('focusDescription').value,
            date: new Date().toISOString(),
            completed: false,
        };

        this.saveToStorage('dailyFocus', this.dailyFocus);
        this.closeModal('focusModal');
        this.resetForm('focusForm');
        this.renderDashboard();
        this.showNotification('Foco do dia definido com sucesso!');
    }

    completeDailyFocus() {
        if (this.dailyFocus) {
            this.dailyFocus.completed = true;
            this.saveToStorage('dailyFocus', this.dailyFocus);
            this.renderDashboard();
            this.showNotification('Parabéns! Você completou seu foco do dia! 🎉');
        }
    }

    // ============================================
    // POMODORO
    // ============================================

    setPomodoroTime(minutes) {
        this.pomodoroSessionDuration = minutes;
        this.pomodoroTimeLeft = minutes * 60;
        this.updateTimerDisplay();
        this.pomodoroRunning = false;
        this.updatePomodoroButton();
    }

    togglePomodoro() {
        if (this.pomodoroRunning) {
            this.pausePomodoro();
        } else {
            this.startPomodoro();
        }
    }

    startPomodoro() {
        this.pomodoroRunning = true;
        this.updatePomodoroButton();

        this.pomodoroTimer = setInterval(() => {
            this.pomodoroTimeLeft--;
            this.updateTimerDisplay();

            if (this.pomodoroTimeLeft <= 0) {
                this.completePomodoro();
            }
        }, 1000);
    }

    pausePomodoro() {
        this.pomodoroRunning = false;
        clearInterval(this.pomodoroTimer);
        this.updatePomodoroButton();
    }

    resetPomodoro() {
        this.pomodoroRunning = false;
        clearInterval(this.pomodoroTimer);
        this.pomodoroTimeLeft = this.pomodoroSessionDuration * 60;
        this.updateTimerDisplay();
        this.updatePomodoroButton();
    }

    completePomodoro() {
        this.pomodoroRunning = false;
        clearInterval(this.pomodoroTimer);
        this.stats.totalPomodoroMinutes += this.pomodoroSessionDuration;
        this.saveToStorage('stats', this.stats);
        this.showNotification(`Parabéns! Você completou um Pomodoro de ${this.pomodoroSessionDuration} minutos! 🎉`);
        this.resetPomodoro();
        this.updateStatistics();
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.pomodoroTimeLeft / 60);
        const seconds = this.pomodoroTimeLeft % 60;
        document.getElementById('timerDisplay').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    updatePomodoroButton() {
        const btn = document.getElementById('startPomodoroBtn');
        if (this.pomodoroRunning) {
            btn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
            btn.classList.add('btn-primary');
        } else {
            btn.innerHTML = '<i class="fas fa-play"></i> Iniciar Pomodoro';
            btn.classList.remove('btn-primary');
        }
    }

    // ============================================
    // MODAIS
    // ============================================

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
        document.getElementById('overlay').classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.getElementById('overlay').classList.remove('active');
    }

    // ============================================
    // UTILITÁRIOS
    // ============================================

    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    formatDate(date) {
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('pt-BR', options);
    }

    getDeadlineIcon(type) {
        const icons = {
            exam: '📝',
            project: '📊',
            assignment: '📋',
            presentation: '🎤',
            other: '📌',
        };
        return icons[type] || '📌';
    }

    translateDeadlineType(type) {
        const translations = {
            exam: 'Prova',
            project: 'Projeto',
            assignment: 'Tarefa',
            presentation: 'Apresentação',
            other: 'Outro',
        };
        return translations[type] || type;
    }

    translatePriority(priority) {
        const translations = {
            low: 'Baixa',
            medium: 'Média',
            high: 'Alta',
        };
        return translations[priority] || priority;
    }

    resetForm(formId) {
        document.getElementById(formId).reset();
    }

    showNotification(message) {
        // Simple notification using alert (pode ser melhorado com toast)
        console.log('✅', message);
    }

    groupTasksBySubject() {
        return this.tasks.reduce((acc, task) => {
            if (!acc[task.subjectId]) acc[task.subjectId] = [];
            acc[task.subjectId].push(task);
            return acc;
        }, {});
    }

    groupDeadlinesByMonth() {
        return this.deadlines.reduce((acc, deadline) => {
            const date = new Date(deadline.dueDate);
            const month = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            if (!acc[month]) acc[month] = [];
            acc[month].push(deadline);
            return acc;
        }, {});
    }

    getTasksCompletedThisWeek() {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return this.tasks.filter(t => t.completed && new Date(t.createdAt) > oneWeekAgo).length;
    }

    // ============================================
    // STORAGE
    // ============================================

    saveToStorage(key, data) {
        localStorage.setItem(`studify_${key}`, JSON.stringify(data));
    }

    loadFromStorage(key) {
        const data = localStorage.getItem(`studify_${key}`);
        return data ? JSON.parse(data) : null;
    }

    // ============================================
    // DADOS DE EXEMPLO
    // ============================================

    addSampleData() {
        // Adicionar dados de exemplo apenas na primeira vez
        if (this.subjects.length === 0) {
            const sampleSubjects = [
                { id: this.generateId(), name: 'Cálculo I', color: '#3B82F6', icon: '📐', createdAt: new Date().toISOString() },
                { id: this.generateId(), name: 'Química Orgânica', color: '#8B5CF6', icon: '⚗️', createdAt: new Date().toISOString() },
                { id: this.generateId(), name: 'História', color: '#F59E0B', icon: '📚', createdAt: new Date().toISOString() },
                { id: this.generateId(), name: 'Programação', color: '#10B981', icon: '💻', createdAt: new Date().toISOString() },
            ];
            this.subjects = sampleSubjects;
            this.saveToStorage('subjects', this.subjects);

            // Sample deadlines
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);

            const sampleDeadlines = [
                {
                    id: this.generateId(),
                    title: 'Prova de Cálculo I',
                    type: 'exam',
                    subjectId: sampleSubjects[0].id,
                    dueDate: tomorrow.toISOString(),
                    description: 'Prova sobre derivadas e integrais',
                    completed: false,
                },
                {
                    id: this.generateId(),
                    title: 'Projeto de Síntese Orgânica',
                    type: 'project',
                    subjectId: sampleSubjects[1].id,
                    dueDate: nextWeek.toISOString(),
                    description: 'Síntese de um composto orgânico',
                    completed: false,
                },
            ];
            this.deadlines = sampleDeadlines;
            this.saveToStorage('deadlines', this.deadlines);

            this.renderDashboard();
        }
    }
}

// ============================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new StudifyApp();
    
    // Atualizar nome do usuário
    document.getElementById('userName').textContent = 'João Silva';
});

