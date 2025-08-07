// ===================================================================
// TASKBOARD MODULAR - VERSIÓN MEJORADA
// ===================================================================

// Importar configuración de Firebase
import { db, storage } from '../config/firebase.js';

// Importar servicios
import { initAuth, checkAuthStatus, logout } from './services/auth.js';
import { loadTasks, saveTask, updateTask, deleteTask, getTasks, getLoadingState } from './services/tasks.js';
import { loadEmployees, getEmployees, loadEmployeesIntoSelect } from './services/employees.js';
import { uploadFiles, downloadFile, deleteFileFromComment, getFileFromStorage } from './services/files.js';

// Importar utilidades
import { showNotification, hideProgressIndicator, addCommentToHistory, escapeHtml, formatFileSize, getFileIcon } from './utils/helpers.js';
import { isAdmin, canEditTask, canMoveTask, canViewTask } from './utils/permissions.js';
import { COLUMN_DISPLAY_NAMES, PRIORITY_DISPLAY_NAMES, EMPTY_STATES } from './utils/constants.js';

// ===================================================================
// VARIABLES GLOBALES
// ===================================================================
let currentEditingTaskId = null;
let draggedTask = null;
let isDragging = false;
let dragStartTime = null;
let selectedFiles = [];
let corsInstructionsShown = false;

// ===================================================================
// FUNCIONES DE UI Y RENDERIZADO
// ===================================================================

// Función para mostrar estado vacío
function getEmptyStateHTML(column) {
    const state = EMPTY_STATES[column];
    return `
        <div class="empty-state">
            <div class="empty-state-icon">${state.icon}</div>
            <div>${state.text}</div>
            <div style="font-size: 0.8rem; margin-top: 5px;">${state.subtext}</div>
        </div>
    `;
}

// Función para crear elemento de tarea
function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task-card';
    taskElement.dataset.taskId = task.id;
    
    const canEdit = canEditTask(task);
    const canMove = canMoveTask(task);
    
    // Configurar drag and drop según permisos
    if (canMove) {
        taskElement.draggable = true;
        taskElement.style.cursor = 'grab';
    } else if (task.column === 'realizadas') {
        // Tareas realizadas: no touch, completamente bloqueadas
        taskElement.draggable = false;
        taskElement.style.cursor = 'default';
        taskElement.style.opacity = '0.6';
        taskElement.style.pointerEvents = 'auto'; // Mantener click para ver detalles
        taskElement.style.filter = 'grayscale(20%)';
    } else {
        taskElement.draggable = false;
        taskElement.style.cursor = 'pointer';
        taskElement.style.opacity = '0.8';
    }
    
    const priorityClass = `priority-${task.priority}`;
    const priorityText = PRIORITY_DISPLAY_NAMES[task.priority];
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-ES') : '';
    const assigneeName = task.assigneeName || 'Sin asignar';
    
    // Indicadores de permisos
    let permissionIcon = '';
    let permissionTitle = '';
    
    if (task.column === 'realizadas') {
        permissionIcon = '✅';
        permissionTitle = 'Tarea completada - Bloqueada';
    } else if (isAdmin()) {
        permissionIcon = '👑';
        permissionTitle = 'Administrador: Todos los permisos';
    } else if (canEdit) {
        permissionIcon = '✏️';
        permissionTitle = 'Puedes editar esta tarea';
    } else {
        permissionIcon = '👁️';
        permissionTitle = 'Solo lectura';
    }
    
    taskElement.innerHTML = `
        <div class="task-header">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-permission-icon" title="${permissionTitle}">${permissionIcon}</div>
        </div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <div class="task-assignee">${escapeHtml(assigneeName)}</div>
                <div class="task-priority ${priorityClass}">${priorityText}</div>
            </div>
            ${dueDate ? `<div class="task-date">📅 ${dueDate}</div>` : ''}
        </div>
    `;

    // Event listeners para drag and drop solo si puede mover (y no está realizada)
    if (canMove && task.column !== 'realizadas') {
        taskElement.addEventListener('dragstart', handleDragStart);
        taskElement.addEventListener('dragend', handleDragEnd);
    }
    
    // Event listener para click (abrir modal de detalles)
    taskElement.addEventListener('click', function(e) {
        // Evitar que se abra el modal si se está arrastrando
        if (!isDragging && !this.classList.contains('dragging')) {
            openTaskDetailModal(task.id);
        }
    });
    
    return taskElement;
}

// Función para renderizar tareas
function renderTasks() {
    const tasks = getTasks();
    const columns = ['tareas', 'asignadas', 'proceso', 'revision', 'realizadas'];
    
    columns.forEach(column => {
        const container = document.getElementById(`tasks-${column}`);
        const countDiv = document.getElementById(`count-${column}`);
        if (!container) return;
        
        // Filtrar tareas por columna
        const columnTasks = tasks.filter(task => task.column === column);
        
        // Limpiar el contenedor
        container.innerHTML = '';
        
        if (columnTasks.length === 0) {
            container.innerHTML = getEmptyStateHTML(column);
        } else {
            columnTasks.forEach(task => {
                const taskElement = createTaskElement(task);
                container.appendChild(taskElement);
            });
        }
        
        // Actualizar contador
        if (countDiv) countDiv.textContent = columnTasks.length;
    });
}

// Función para actualizar estadísticas
function updateStats() {
    const tasks = getTasks();
    const total = tasks.length;
    const assigned = tasks.filter(t => t.column === 'asignadas').length;
    const inProgress = tasks.filter(t => t.column === 'proceso').length;
    const completed = tasks.filter(t => t.column === 'realizadas').length;
    
    const totalDiv = document.getElementById('totalTasks');
    const assignedDiv = document.getElementById('assignedTasks');
    const inProgressDiv = document.getElementById('inProgressTasks');
    const completedDiv = document.getElementById('completedTasks');
    
    if (totalDiv) totalDiv.textContent = total;
    if (assignedDiv) assignedDiv.textContent = assigned;
    if (inProgressDiv) inProgressDiv.textContent = inProgress;
    if (completedDiv) completedDiv.textContent = completed;
}

// ===================================================================
// DRAG AND DROP MEJORADO
// ===================================================================

function handleDragStart(e) {
    draggedTask = this;
    isDragging = true;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    // Añadir un pequeño delay antes de permitir clicks para evitar clicks accidentales
    setTimeout(() => {
        isDragging = false;
        draggedTask = null;
    }, 100);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

async function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    this.classList.remove('drag-over');

    if (draggedTask && !getLoadingState()) {
        const taskId = draggedTask.dataset.taskId;
        const newColumn = this.id.replace('tasks-', '');
        
        // Encontrar la tarea
        const tasks = getTasks();
        const task = tasks.find(t => t.id === taskId);
        
        if (task && task.column !== newColumn) {
            // Verificar permisos antes de mover
            if (!canMoveTask(task, newColumn)) {
                if (task.column === 'realizadas') {
                    showNotification('❌ Las tareas realizadas no se pueden mover', 'error');
                } else if (task.column === 'revision' && newColumn === 'realizadas') {
                    showNotification('❌ Solo los administradores pueden mover tareas de "Revisión" a "Realizadas"', 'error');
                } else {
                    showNotification('❌ Solo puedes mover tareas asignadas a ti', 'error');
                }
                return false;
            }
            
            try {
                showNotification('Moviendo tarea...', 'info');
                
                console.log('🔄 Moviendo tarea por drag & drop:', taskId, 'de', task.column, 'a', newColumn);
                
                // Preservar todos los datos existentes, solo cambiar la columna
                const preservedUpdates = {
                    title: task.title,
                    description: task.description,
                    assigneeId: task.assigneeId,
                    assigneeName: task.assigneeName,
                    priority: task.priority,
                    dueDate: task.dueDate,
                    comments: task.comments,
                    column: newColumn
                };
                
                // Actualizar en la base de datos
                await updateTask(taskId, preservedUpdates);
                
                showNotification(`Tarea movida a "${COLUMN_DISPLAY_NAMES[newColumn]}"`, 'success');
                
            } catch (error) {
                console.error('Error moviendo tarea:', error);
                showNotification('Error moviendo la tarea', 'error');
                // Revertir cambio visual si falló
                renderTasks();
            }
        }
    }
    
    return false;
}

function setupDragAndDrop() {
    const containers = document.querySelectorAll('.tasks-container');
    
    containers.forEach(container => {
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('drop', handleDrop);
        container.addEventListener('dragenter', handleDragEnter);
        container.addEventListener('dragleave', handleDragLeave);
    });
}

// ===================================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ===================================================================

async function initApp() {
    showNotification('Cargando TaskBoard ITLA...', 'info');
    console.log('🚀 Iniciando aplicación...');
    
    try {
        // Verificar conectividad con Firebase
        console.log('🔗 [DEBUG] Verificando conectividad con Firebase...');
        
        // Verificar URL parameters o sesión almacenada
        const urlParams = new URLSearchParams(window.location.search);
        let employeeId = urlParams.get('user');
        console.log('🔗 [DEBUG] Employee ID desde URL:', employeeId);

        if (!employeeId) {
            const storedUser = sessionStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    employeeId = user.id;
                    console.log('🔗 [DEBUG] Employee ID desde sessionStorage:', employeeId);
                } catch (e) {
                    console.error('Error leyendo sesión almacenada:', e);
                }
            }
        }

        if (!employeeId) {
            console.error('❌ [DEBUG] No se encontró employee ID');
            showNotification('Error: No se encontró ID de empleado. Redirigiendo al login...', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        // Autenticación con Firebase
        try {
            await initAuth();
            console.log('✅ Usuario autenticado desde Firebase:', window.currentUser);
            
            // Verificación adicional de que currentUser esté correctamente configurado
            if (!window.currentUser || !window.currentUser.id || !window.currentUser.name) {
                throw new Error('Usuario autenticado pero datos incompletos');
            }
            
        } catch (authError) {
            console.error('❌ Error de autenticación:', authError);
            showNotification('Error de autenticación. Redirigiendo al login...', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        updateUserInfo();
        
        // Probar conectividad con Firestore
        console.log('🔗 [DEBUG] Probando conexión con Firestore...');
        const testQuery = query(collection(db, "employees"), where("active", "==", true));
        const testSnapshot = await getDocs(testQuery);
        console.log('✅ [DEBUG] Firestore conectado correctamente. Documentos de prueba:', testSnapshot.size);
        
        await loadEmployees();
        await loadTasks();
        
        // IMPORTANTE: Configurar event listeners DESPUÉS de cargar todo
        setupDragAndDrop();
        
        // Configurar botón Dashboard solo para administradores
        configureDashboardButton();
        
        showNotification(`TaskBoard listo - Bienvenido ${window.currentUser.name}`, 'success');
        console.log('✅ Aplicación inicializada correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando aplicación:', error);
        console.error('❌ [DEBUG] Error detallado:', error.message, error.code);
        showNotification('Error inicializando aplicación: ' + error.message, 'error');
    }
}

// ===================================================================
// EVENT LISTENERS PARA ACTUALIZACIONES REACTIVAS
// ===================================================================

// Escuchar actualizaciones de tareas
window.addEventListener('tasksUpdated', (event) => {
    renderTasks();
    updateStats();
});

// Escuchar actualizaciones de empleados
window.addEventListener('employeesUpdated', (event) => {
    // Actualizar selects de empleados si es necesario
    loadEmployeesIntoSelect('addTaskAssignee');
    loadEmployeesIntoSelect('editTaskAssignee');
});

// ===================================================================
// FUNCIONES GLOBALES (para compatibilidad)
// ===================================================================

// Hacer funciones disponibles globalmente
window.logout = logout;
window.downloadFile = downloadFile;
window.deleteFileFromComment = deleteFileFromComment;
window.getFileFromStorage = getFileFromStorage;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 [DEBUG] DOM cargado, iniciando aplicación...');
    try {
        await initApp();
        console.log('✅ [DEBUG] Aplicación inicializada correctamente');
    } catch (error) {
        console.error('❌ [DEBUG] Error inicializando aplicación:', error);
        showNotification('Error iniciando la aplicación. Redirigiendo al login...', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    }
}); 