// ===================================================================
// SERVICIOS DE TAREAS
// ===================================================================
import { db } from '../../config/firebase.js';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { showNotification } from '../utils/helpers.js';

// Variables globales para el estado de las tareas
let tasks = [];
let isLoading = false;

// Función para cargar tareas
export async function loadTasks() {
    try {
        isLoading = true;
        const q = query(collection(db, "tasks"), orderBy("created_at", "desc"));
        const querySnapshot = await getDocs(q);
        tasks = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            assigneeId: doc.data().assignee_id,
            assigneeName: doc.data().assignee_name,
            dueDate: doc.data().due_date,
            column: doc.data().status,
            createdAt: doc.data().created_at,
            updatedAt: doc.data().updated_at
        }));
        
        // Disparar evento de actualización
        window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: tasks }));
        
        console.log('✅ Tareas cargadas y renderizadas:', tasks.length);
        return tasks;
    } catch (error) {
        console.error('❌ Error cargando tareas:', error);
        showNotification('Error cargando tareas', 'error');
        throw error;
    } finally {
        isLoading = false;
    }
}

// Función para guardar tarea
export async function saveTask(task) {
    console.log('🟢 [DEBUG] saveTask() llamada con:', task);
    
    // Verificar que el usuario esté autenticado
    if (!window.currentUser) {
        console.error('❌ [DEBUG] No hay usuario autenticado');
        showNotification('Error: Usuario no autenticado. Redirigiendo al login...', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    console.log('✅ [DEBUG] Usuario autenticado:', window.currentUser);
    
    try {
        const taskData = {
            title: task.title,
            description: task.description,
            assignee_id: task.assigneeId || null,
            assignee_name: task.assigneeName || null,
            priority: task.priority,
            status: task.column,
            due_date: task.dueDate || null,
            comments: task.comments || null,
            created_by: window.currentUser.id,
            created_by_name: window.currentUser.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        console.log('🟢 [DEBUG] taskData a guardar en Firestore:', taskData);
        
        const docRef = await addDoc(collection(db, "tasks"), taskData);
        console.log('🟢 [DEBUG] Tarea guardada en Firestore con ID:', docRef.id);
        
        showNotification('Tarea creada exitosamente', 'success');
        
        // Recargar tareas en lugar de recargar la página
        await loadTasks();
        
    } catch (error) {
        console.error('🔴 [DEBUG] Error al guardar tarea:', error);
        console.error('🔴 [DEBUG] Error completo:', error);
        console.error('🔴 [DEBUG] Error stack:', error.stack);
        
        // Verificar si es un error de permisos/autenticación
        if (error.code === 'permission-denied' || error.message.includes('permission') || error.message.includes('auth')) {
            console.error('❌ [DEBUG] Error de permisos detectado');
            showNotification('Error de permisos. Redirigiendo al login...', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            showNotification('Error al crear la tarea: ' + error.message, 'error');
        }
        throw error;
    }
}

// Función para actualizar tarea
export async function updateTask(taskId, updates) {
    // Verificar que el usuario esté autenticado
    if (!window.currentUser) {
        console.error('❌ [DEBUG] No hay usuario autenticado para actualizar tarea');
        showNotification('Error: Usuario no autenticado. Redirigiendo al login...', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    try {
        const updateData = {
            title: updates.title,
            description: updates.description || '',
            status: updates.column,
            assignee_id: updates.assigneeId || null,
            assignee_name: updates.assigneeName || null,
            priority: updates.priority,
            due_date: updates.dueDate || null,
            comments: updates.comments || null,
            updated_by: window.currentUser.id,
            updated_by_name: window.currentUser.name,
            updated_at: new Date().toISOString()
        };
        const taskDoc = doc(db, "tasks", taskId);
        await updateDoc(taskDoc, updateData);
        
        // Actualizar tarea local
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = { ...tasks[taskIndex], ...updateData };
        }
        
        // Disparar evento de actualización
        window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: tasks }));
        
    } catch (error) {
        console.error('❌ Error actualizando tarea:', error);
        console.error('❌ Error completo:', error);
        
        // Verificar si es un error de permisos/autenticación
        if (error.code === 'permission-denied' || error.message.includes('permission') || error.message.includes('auth')) {
            console.error('❌ [DEBUG] Error de permisos detectado al actualizar');
            showNotification('Error de permisos. Redirigiendo al login...', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            showNotification(`Error actualizando tarea: ${error.message}`, 'error');
        }
        throw error;
    }
}

// Función para eliminar tarea
export async function deleteTask(taskId) {
    try {
        await deleteDoc(doc(db, "tasks", taskId));
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks.splice(taskIndex, 1);
        }
        
        // Disparar evento de actualización
        window.dispatchEvent(new CustomEvent('tasksUpdated', { detail: tasks }));
        
    } catch (error) {
        console.error('❌ Error eliminando tarea:', error);
        showNotification('Error eliminando tarea', 'error');
        throw error;
    }
}

// Función para obtener tareas
export function getTasks() {
    return tasks;
}

// Función para verificar si está cargando
export function getLoadingState() {
    return isLoading;
} 