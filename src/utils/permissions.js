// ===================================================================
// FUNCIONES DE PERMISOS
// ===================================================================
import { ADMINISTRATORS } from './constants.js';

// Verificar si es administrador
export function isAdmin() {
    return window.currentUser && ADMINISTRATORS.includes(window.currentUser.id);
}

// Verificar si puede editar una tarea
export function canEditTask(task) {
    if (!window.currentUser) return false;
    if (isAdmin()) return true;
    return task.assigneeId === window.currentUser.id;
}

// Verificar si puede mover una tarea
export function canMoveTask(task, targetColumn = null) {
    if (!window.currentUser) return false;
    if (task.column === 'revision' && targetColumn === 'realizadas') {
        return isAdmin();
    }
    if (isAdmin()) return true;
    if (task.column === 'realizadas') return false;
    return task.assigneeId === window.currentUser.id;
}

// Verificar si puede ver una tarea
export function canViewTask(task) { 
    return true; 
} 