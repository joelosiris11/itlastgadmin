// ===================================================================
// INICIALIZACIÓN DE FIREBASE
// ===================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBCSghpdjS6UyqIjZrh8Lx3b0BdunMlDZs",
  authDomain: "itlastg25.firebaseapp.com",
  projectId: "itlastg25",
  storageBucket: "itlastg25.firebasestorage.app",
  messagingSenderId: "166443905167",
  appId: "1:166443905167:web:472ec92225a62ef45c80fa"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ===================================================================
// VARIABLES GLOBALES
// ===================================================================
let employees = [];
let tasks = [];
let isLoading = false;
let currentUser = null;
const ADMINISTRATORS = ['0062', '1771'];
let currentEditingTaskId = null;
let draggedTask = null;
let isDragging = false;
let dragStartTime = null;
let selectedFiles = [];
let corsInstructionsShown = false;

// ===================================================================
// FUNCIONES DE AUTENTICACIÓN - SOLO FIREBASE
// ===================================================================
async function initAuth() {
    try {
        // Obtener datos del usuario desde URL params o sessionStorage
        const urlParams = new URLSearchParams(window.location.search);
        let employeeId = urlParams.get('user');

        if (!employeeId) {
            const storedUser = sessionStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    employeeId = user.id;
                } catch (e) {
                    console.error('Error leyendo sesión almacenada:', e);
                }
            }
        }

        if (!employeeId) {
            throw new Error('No se proporcionó ID de empleado');
        }
        
        // Buscar empleado en Firebase
        const employeeQuery = query(
            collection(db, "employees"), 
            where("employee_id", "==", employeeId),
            where("active", "==", true)
        );
        
        const employeeSnapshot = await getDocs(employeeQuery);
        
        if (employeeSnapshot.empty) {
            throw new Error('Empleado no encontrado o inactivo');
        }
        
        const employeeData = employeeSnapshot.docs[0].data();
        
        currentUser = {
            id: employeeData.employee_id,
            name: employeeData.name,
            department: employeeData.department,
            loginTime: new Date().toISOString()
        };

        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        console.log('✅ Usuario autenticado desde Firebase:', currentUser);
        return currentUser;
        
    } catch (error) {
        console.error('❌ Error de autenticación:', error);
        throw error;
    }
}

// Función para verificar que el usuario siga autenticado
async function checkAuthStatus() {
    if (!currentUser) {
        // Intentar restaurar la sesión desde sessionStorage
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            try {
                currentUser = JSON.parse(storedUser);
                console.log('🔄 Sesión restaurada desde sessionStorage');
            } catch (e) {
                console.error('Error leyendo sesión almacenada:', e);
            }
        }

        if (!currentUser) {
            console.error('❌ [AUTH] Usuario no autenticado detectado');
            showNotification('Sesión perdida. Redirigiendo al login...', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return false;
        }
    }
    return true;
}

// Verificar autenticación cada 30 segundos
setInterval(checkAuthStatus, 30000);

function logout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        sessionStorage.removeItem('currentUser');
        currentUser = null;
        window.location.href = 'index.html';
    }
}

// ===================================================================
// FUNCIONES DE ARCHIVOS - SOLO FIREBASE STORAGE
// ===================================================================
async function uploadFiles(files, taskId) {
    if (!files || files.length === 0) return [];
    
    console.log('📤 Subiendo archivos a Firebase Storage:', files.length);
    
    try {
        const uploadedFiles = [];
        
        for (const file of files) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileExtension = file.name.split('.').pop();
            const fileName = `task-${taskId}-${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
            const filePath = `tasks/${taskId}/${fileName}`;
            const fileId = `file_${taskId}_${timestamp}_${Math.random().toString(36).substring(2)}`;
            
            try {
                console.log('🔄 Subiendo archivo:', fileName);
                const fileRef = storageRef(storage, filePath);
                
                const metadata = {
                    customMetadata: {
                        'originalName': file.name,
                        'fileId': fileId,
                        'taskId': taskId,
                        'uploadedBy': currentUser.id,
                        'uploadedAt': new Date().toISOString()
                    }
                };
                
                await uploadBytes(fileRef, file, metadata);
                const downloadURL = await getDownloadURL(fileRef);
                
                const processedFile = {
                    id: fileId,
                    originalName: file.name,
                    fileName: fileName,
                    filePath: filePath,
                    downloadURL: downloadURL,
                    size: file.size,
                    type: file.type,
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: currentUser.id
                };
                
                // Guardar metadatos en Firestore
                await addDoc(collection(db, "file_metadata"), {
                    ...processedFile,
                    taskId: taskId
                });
                
                uploadedFiles.push(processedFile);
                console.log(`✅ Archivo subido: ${file.name}`);
                
            } catch (fileError) {
                console.error(`❌ Error subiendo ${file.name}:`, fileError);
                showNotification(`❌ Error subiendo ${file.name}`, 'error');
                
                // Si hay CORS, fallar completamente - no usar localStorage
                if (fileError.message.includes('CORS')) {
                    if (!corsInstructionsShown) {
                        corsInstructionsShown = true;
                        setTimeout(() => {
                            showCORSInstructions();
                        }, 1000);
                    }
                    throw new Error('Error de CORS - Configure Firebase Hosting');
                }
                
                throw fileError;
            }
        }
        
        console.log('✅ Todos los archivos subidos exitosamente');
        return uploadedFiles;
        
    } catch (error) {
        console.error('❌ Error general en uploadFiles:', error);
        showNotification(`❌ Error subiendo archivos: ${error.message}`, 'error');
        throw error;
    }
}

async function getFileFromFirestore(fileId) {
    try {
        const fileQuery = query(
            collection(db, "file_metadata"),
            where("id", "==", fileId)
        );
        
        const fileSnapshot = await getDocs(fileQuery);
        
        if (!fileSnapshot.empty) {
            return fileSnapshot.docs[0].data();
        }
        
        console.warn(`Archivo ${fileId} no encontrado en Firestore`);
        return null;
        
    } catch (error) {
        console.error('Error obteniendo archivo desde Firestore:', error);
        return null;
    }
}

async function downloadFile(fileId) {
    try {
        const fileData = await getFileFromFirestore(fileId);
        
        if (!fileData) {
            showNotification('⚠️ Archivo no encontrado', 'warning');
            return;
        }
        
        if (fileData.downloadURL) {
            const link = document.createElement('a');
            link.href = fileData.downloadURL;
            link.download = fileData.originalName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showNotification(`📥 Descargando ${fileData.originalName}`, 'success');
        } else {
            showNotification('⚠️ URL de descarga no disponible', 'warning');
        }
        
    } catch (error) {
        console.error('Error descargando archivo:', error);
        showNotification('❌ Error al descargar el archivo', 'error');
    }
}

async function deleteFileFromComment(fileId, taskId) {
    if (!confirm('¿Estás seguro de que quieres borrar este archivo y su comentario?')) {
        return;
    }
    
    try {
        showProgressIndicator('Borrando archivo...');
        
        const task = tasks.find(t => t.id === taskId);
        if (!task || !task.comments) {
            throw new Error('No se encontró la tarea o comentarios');
        }
        
        const commentsArray = task.comments.split('\n').filter(line => line.trim());
        let commentToDeleteIndex = -1;
        
        for (let i = 0; i < commentsArray.length; i++) {
            const comment = commentsArray[i];
            if (comment.includes(fileId)) {
                commentToDeleteIndex = i;
                break;
            }
        }
        
        if (commentToDeleteIndex === -1) {
            throw new Error('No se encontró el comentario que contiene este archivo');
        }
        
        // Obtener datos del archivo
        const fileData = await getFileFromFirestore(fileId);
        
        if (fileData && fileData.filePath) {
            // Eliminar archivo de Firebase Storage
            const fileRef = storageRef(storage, fileData.filePath);
            await deleteObject(fileRef);
            console.log('✅ Archivo eliminado de Firebase Storage');
        }
        
        // Eliminar metadatos de Firestore
        const metadataQuery = query(
            collection(db, "file_metadata"),
            where("id", "==", fileId)
        );
        const metadataSnapshot = await getDocs(metadataQuery);
        
        for (const docSnapshot of metadataSnapshot.docs) {
            await deleteDoc(docSnapshot.ref);
        }
        console.log('✅ Metadatos eliminados de Firestore');
        
        // Actualizar comentarios
        commentsArray.splice(commentToDeleteIndex, 1);
        const updatedComments = commentsArray.join('\n');
        
        await updateTask(taskId, { ...task, comments: updatedComments });
        
        if (currentEditingTaskId === taskId) {
            displayCommentsHistory(updatedComments);
        }
        
        hideProgressIndicator();
        showNotification('Archivo y comentario borrados correctamente', 'success');
        
    } catch (error) {
        console.error('Error al borrar archivo:', error);
        hideProgressIndicator();
        showNotification('Error al borrar el archivo: ' + error.message, 'error');
    }
}

// Función para obtener archivo (reemplaza getFileFromStorage)
async function getFileFromStorage(fileId) {
    return await getFileFromFirestore(fileId);
}

// ===================================================================
// FUNCIONES DE PERMISOS
// ===================================================================
function isAdmin() {
    return currentUser && ADMINISTRATORS.includes(currentUser.id);
}
function canEditTask(task) {
    if (!currentUser) return false;
    if (isAdmin()) return true;
    return task.assigneeId === currentUser.id;
}
function canMoveTask(task, targetColumn = null) {
    if (!currentUser) return false;
    if (task.column === 'revision' && targetColumn === 'realizadas') {
        return isAdmin();
    }
    if (isAdmin()) return true;
    if (task.column === 'realizadas') return false;
    return task.assigneeId === currentUser.id;
}
function canViewTask(task) { return true; }

// ===================================================================
// FUNCIONES FIREBASE: EMPLEADOS Y TAREAS
// ===================================================================
async function loadEmployees() {
    try {
        const q = query(collection(db, "employees"), where("active", "==", true), orderBy("name"));
        const querySnapshot = await getDocs(q);
        employees = querySnapshot.docs.map(doc => ({
            id: doc.data().employee_id,
            name: doc.data().name,
            department: doc.data().department
        }));
        loadEmployeesIntoSelect();
        console.log('✅ Empleados cargados:', employees.length);
    } catch (error) {
        console.error('❌ Error cargando empleados:', error);
        showNotification('Error cargando empleados', 'error');
    }
}
async function loadTasks() {
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
        renderTasks();
        updateStats();
        console.log('✅ Tareas cargadas y renderizadas:', tasks.length);
    } catch (error) {
        console.error('❌ Error cargando tareas:', error);
        showNotification('Error cargando tareas', 'error');
    } finally {
        isLoading = false;
    }
}
async function saveTask(task) {
    console.log('🟢 [DEBUG] saveTask() llamada con:', task);
    
    // Verificar que el usuario esté autenticado
    if (!currentUser) {
        console.error('❌ [DEBUG] No hay usuario autenticado');
        showNotification('Error: Usuario no autenticado. Redirigiendo al login...', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    console.log('✅ [DEBUG] Usuario autenticado:', currentUser);
    
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
            created_by: currentUser.id,
            created_by_name: currentUser.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        console.log('🟢 [DEBUG] taskData a guardar en Firestore:', taskData);
        
        const docRef = await addDoc(collection(db, "tasks"), taskData);
        console.log('🟢 [DEBUG] Tarea guardada en Firestore con ID:', docRef.id);
        
        showNotification('Tarea creada exitosamente', 'success');
        
        // Recargar la página para mostrar la nueva tarea
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
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
    }
}
async function updateTask(taskId, updates) {
    // Verificar que el usuario esté autenticado
    if (!currentUser) {
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
            updated_by: currentUser.id,
            updated_by_name: currentUser.name,
            updated_at: new Date().toISOString()
        };
        const taskDoc = doc(db, "tasks", taskId);
        await updateDoc(taskDoc, updateData);
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = { ...tasks[taskIndex], ...updateData };
            renderTasks();
            updateStats();
        }
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
async function deleteTask(taskId) {
    try {
        await deleteDoc(doc(db, "tasks", taskId));
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks.splice(taskIndex, 1);
            renderTasks();
            updateStats();
        }
    } catch (error) {
        console.error('❌ Error eliminando tarea:', error);
        showNotification('Error eliminando tarea', 'error');
        throw error;
    }
}

// ===================================================================
// FUNCIONES FIREBASE: ARCHIVOS (STORAGE) - ELIMINADAS, SOLO USAR LAS DE ARRIBA
// ===================================================================
// downloadFile() ya está implementada arriba con Firebase
// deleteFileFromComment() ya está implementada arriba con Firebase

// ===================================================================
// RESTO DE FUNCIONES DE UI Y UTILIDAD (sin cambios, solo Firebase)
// ===================================================================
// ... existing code ...

// getFileFromStorage() ya está implementada arriba con Firebase

// Función para abrir preview de archivo
async function openFilePreview(fileId) {
    const fileData = await getFileFromStorage(fileId);
    if (!fileData) {
        showNotification('⚠️ Archivo no encontrado', 'warning');
        return;
    }
    
    // Crear modal de preview
    const modal = document.createElement('div');
    modal.id = 'filePreviewModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;
    
    const isImage = fileData.type && fileData.type.startsWith('image/');
    
    let modalContent = `
        <div style="
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 90vw;
            max-height: 90vh;
            overflow: auto;
            position: relative;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        ">
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 2px solid #e2e8f0;
            ">
                <h3 style="
                    margin: 0;
                    color: #1e293b;
                    font-size: 1.2em;
                    font-weight: 600;
                ">${fileData.originalName}</h3>
                <button onclick="closeFilePreview()" style="
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 12px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: background 0.2s ease;
                " onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                    ✕ Cerrar
                </button>
            </div>
            
            <div style="margin-bottom: 16px; display: flex; gap: 16px; align-items: center;">
                <div><strong>Tipo:</strong> ${fileData.type || 'Desconocido'}</div>
                <div><strong>Tamaño:</strong> ${formatFileSize(fileData.size)}</div>
                <div><strong>Subido:</strong> ${new Date(fileData.uploadedAt).toLocaleString('es-ES')}</div>
            </div>
    `;
    
    if (isImage && fileData.downloadURL) {
        modalContent += `
            <div style="text-align: center; margin-bottom: 16px;">
                <img src="${fileData.downloadURL}" style="
                    max-width: 100%;
                    max-height: 60vh;
                    border-radius: 8px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                ">
            </div>
        `;
    } else {
        const icon = getFileIcon(fileData.type);
        modalContent += `
            <div style="
                text-align: center;
                padding: 40px;
                background: #f8fafc;
                border-radius: 8px;
                margin-bottom: 16px;
            ">
                <div style="font-size: 4em; margin-bottom: 16px;">${icon}</div>
                <div style="color: #64748b; font-size: 1.1em;">
                    Preview no disponible para este tipo de archivo
                </div>
            </div>
        `;
    }
    
    modalContent += `
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button onclick="downloadFile('${fileId}')" style="
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 10px 20px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: background 0.2s ease;
                " onmouseover="this.style.background='#5b5bd6'" onmouseout="this.style.background='#667eea'">
                    📥 Descargar
                </button>
            </div>
        </div>
    `;
    
    modal.innerHTML = modalContent;
    
    // Cerrar modal al hacer click fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFilePreview();
        }
    });
    
    document.body.appendChild(modal);
}

// Función para cerrar preview
function closeFilePreview() {
    const modal = document.getElementById('filePreviewModal');
    if (modal) {
        modal.remove();
    }
}

// Función para mostrar notificación
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = {
        'success': '#48bb78',
        'error': '#f56565',
        'info': '#667eea',
        'warning': '#ed8936'
    }[type] || '#667eea';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1001;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    const duration = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// Función para actualizar información del usuario
function updateUserInfo() {
    const headerControls = document.querySelector('.controls');
    if (headerControls && currentUser) {
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info-header';
        userInfo.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 8px;
            padding: 8px 12px;
            color: #2d3748;
            font-size: 14px;
            font-weight: 600;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        `;
        
        const roleText = isAdmin() ? '👑 ADMIN' : '👤 USER';
        userInfo.innerHTML = `
            <span>${roleText}</span>
            <span>${currentUser.name}</span>
            <span style="opacity: 0.7;">(${currentUser.id})</span>
            <button onclick="logout()" style="background: #ef4444; border: none; border-radius: 4px; color: white; padding: 4px 8px; font-size: 12px; cursor: pointer; font-weight: 600; transition: all 0.2s ease;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">Salir</button>
        `;
        
        headerControls.appendChild(userInfo);
        updateButtonVisibility();
    }
}

// Función para actualizar visibilidad de botones
function updateButtonVisibility() {
    console.log('🔍 DEBUG - updateButtonVisibility() ejecutándose');
    
    if (!currentUser) {
        console.warn('⚠️ No hay usuario actual, no se pueden configurar botones');
        return;
    }
    
    let newTaskButton = document.querySelector('[onclick="openAddTaskModal()"]');
    
    if (newTaskButton) {
        console.log('✅ DEBUG - Botón Nueva Tarea encontrado:', newTaskButton);
        
        newTaskButton.removeAttribute('onclick');
        const clonedButton = newTaskButton.cloneNode(true);
        newTaskButton.parentNode.replaceChild(clonedButton, newTaskButton);
        newTaskButton = clonedButton;
        
        newTaskButton.addEventListener('click', function(e) {
            console.log('🔍 DEBUG - Click detectado en botón Nueva Tarea');
            e.preventDefault();
            e.stopPropagation();
            
            try {
                console.log('🔍 DEBUG - Llamando openAddTaskModal()...');
                openAddTaskModal();
                console.log('✅ DEBUG - openAddTaskModal() ejecutado');
            } catch (error) {
                console.error('❌ DEBUG - Error ejecutando openAddTaskModal():', error);
            }
        });
        
        // Todos los usuarios pueden crear tareas
        newTaskButton.style.display = 'flex';
        newTaskButton.title = 'Crear nueva tarea';
        console.log('✅ DEBUG - Botón Nueva Tarea mostrado para todos los usuarios');
    } else {
        console.error('❌ No se encontró el botón Nueva Tarea');
    }
    
    const clearAllButton = document.querySelector('[onclick="clearAllTasks()"]');
    if (clearAllButton) {
        if (isAdmin()) {
            clearAllButton.style.display = 'flex';
        } else {
            clearAllButton.style.display = 'none';
        }
    }
}

// logout() ya está implementada arriba y ahora limpia sessionStorage

// Función para inicializar la aplicación
async function initApp() {
    showNotification('Cargando TaskBoard ITLA...', 'info');
    console.log('🚀 Iniciando aplicación...');
    
    try {
        // Verificar conectividad con Firebase
        console.log('🔗 [DEBUG] Verificando conectividad con Firebase...');
        console.log('🔗 [DEBUG] Firebase Config:', {
            projectId: firebaseConfig.projectId,
            authDomain: firebaseConfig.authDomain,
            storageBucket: firebaseConfig.storageBucket
        });
        
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
        
        // Autenticación con Firebase (usa sessionStorage)
        try {
            currentUser = await initAuth();
            console.log('✅ Usuario autenticado desde Firebase:', currentUser);
            
            // Verificación adicional de que currentUser esté correctamente configurado
            if (!currentUser || !currentUser.id || !currentUser.name) {
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
        
        showNotification(`TaskBoard listo - Bienvenido ${currentUser.name}`, 'success');
        console.log('✅ Aplicación inicializada correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando aplicación:', error);
        console.error('❌ [DEBUG] Error detallado:', error.message, error.code);
        showNotification('Error inicializando aplicación: ' + error.message, 'error');
    }
}

// Función para mostrar estado vacío
function getEmptyStateHTML(column) {
    const emptyStates = {
        'tareas': { icon: '📝', text: 'No hay tareas nuevas', subtext: 'Haz clic en "Nueva Tarea" para empezar' },
        'asignadas': { icon: '👥', text: 'No hay tareas asignadas', subtext: 'Las tareas se moverán aquí automáticamente' },
        'proceso': { icon: '⚙️', text: 'No hay tareas en proceso', subtext: 'Arrastra tareas aquí cuando empiecen' },
        'revision': { icon: '🔎', text: 'No hay tareas en revisión', subtext: 'Tareas listas para revisar aparecerán aquí' },
        'realizadas': { icon: '🎉', text: 'No hay tareas completadas', subtext: 'Las tareas finalizadas aparecerán aquí' }
    };

    const state = emptyStates[column];
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
    const priorityText = { 'low': 'Baja', 'medium': 'Media', 'high': 'Alta' }[task.priority];
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
        <div class="task-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div style="color: #a0aec0; font-size: 0.8rem; opacity: 0.7;" title="${permissionTitle}">${permissionIcon}</div>
        </div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
            <div>
                <div class="task-assignee">${escapeHtml(assigneeName)}</div>
                <div class="task-priority ${priorityClass}">${priorityText}</div>
            </div>
            ${dueDate ? `<div style="font-size: 0.8rem; color: #a0aec0;">📅 ${dueDate}</div>` : ''}
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

// Función para escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Función para agregar comentario a la historia
function addCommentToHistory(existingComments, newComment, userInfo = null) {
    if (!newComment || newComment.trim() === '') {
        return existingComments;
    }
    
    const now = new Date();
    const timestamp = now.toLocaleString('es-ES', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
    
    // Usar información del usuario actual o la proporcionada
    const user = userInfo || currentUser;
    const userName = user ? user.name : 'Usuario';
    const userId = user ? user.id : '';
    
    const formattedComment = `[${timestamp} - ${userName} (${userId})] ${newComment.trim()}`;
    
    if (!existingComments || existingComments.trim() === '') {
        return formattedComment;
    }
    
    return existingComments + '\n' + formattedComment;
}

// ===================================================================
// DRAG AND DROP
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

    if (draggedTask && !isLoading) {
        const taskId = draggedTask.dataset.taskId;
        const newColumn = this.id.replace('tasks-', '');
        
        // Encontrar la tarea
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
                isLoading = true;
                
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
                
                showNotification(`Tarea movida a "${getColumnDisplayName(newColumn)}"`, 'success');
                
                // Recargar la página para mostrar el cambio
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } catch (error) {
                console.error('Error moviendo tarea:', error);
                showNotification('Error moviendo la tarea', 'error');
                // Revertir cambio visual si falló
                renderTasks();
            } finally {
                isLoading = false;
            }
        }
    }
    
    return false;
}

function getColumnDisplayName(column) {
    const names = {
        'tareas': 'Tareas',
        'asignadas': 'Asignadas',
        'proceso': 'En Proceso',
        'revision': 'Revisión',
        'realizadas': 'Realizadas'
    };
    return names[column] || column;
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
// FUNCIONES DEL MODAL DE DETALLES
// ===================================================================
function openTaskDetailModal(taskId) {
    console.log('🔍 Abriendo modal para tarea:', taskId);
    console.log('👤 Usuario actual:', currentUser);
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        console.error('❌ Tarea no encontrada:', taskId);
        showNotification('Tarea no encontrada', 'error');
        return;
    }

    console.log('📋 Tarea encontrada:', task);
    
    currentEditingTaskId = taskId;
    window.currentEditingTaskId = taskId;
    const canEdit = canEditTask(task);
    const canMove = canMoveTask(task);
    
    console.log('🔐 Permisos:', { canEdit, canMove, isAdmin: isAdmin() });
    
    // Llenar los campos del formulario
    const titleInput = document.getElementById('editTaskTitle');
    const descriptionInput = document.getElementById('editTaskDescription');
    const assigneeSelect = document.getElementById('editTaskAssignee');
    const prioritySelect = document.getElementById('editTaskPriority');
    const statusSelect = document.getElementById('editTaskStatus');
    const dueDateInput = document.getElementById('editTaskDueDate');
    const commentsInput = document.getElementById('editTaskComments');
    const submitButton = document.getElementById('editTaskSubmitBtn');
    const deleteButton = document.querySelector('[onclick="deleteCurrentTask()"]');
    
    // Llenar valores
    if (titleInput) titleInput.value = task.title;
    if (descriptionInput) descriptionInput.value = task.description || '';
    if (assigneeSelect) {
        loadEmployeesIntoEditSelect();
        assigneeSelect.value = task.assigneeId || '';
    }
    if (prioritySelect) prioritySelect.value = task.priority;
    if (statusSelect) statusSelect.value = task.column;
    if (dueDateInput) dueDateInput.value = task.dueDate || '';
    
    // Configurar permisos
    if (titleInput) titleInput.disabled = !canEdit;
    if (descriptionInput) descriptionInput.disabled = !canEdit;
    if (prioritySelect) prioritySelect.disabled = !canEdit;
    if (dueDateInput) {
        dueDateInput.disabled = !isAdmin(); // Solo administradores pueden cambiar fecha límite
        if (!isAdmin()) {
            dueDateInput.style.backgroundColor = '#f8f9fa';
            dueDateInput.style.cursor = 'not-allowed';
        } else {
            dueDateInput.style.backgroundColor = '';
            dueDateInput.style.cursor = '';
        }
    }
    if (statusSelect) statusSelect.disabled = !canMove;
    if (commentsInput) commentsInput.disabled = !canEdit;
    if (submitButton) submitButton.disabled = !canEdit;
    
    // Botón de eliminar solo para administradores
    if (deleteButton) {
        deleteButton.style.display = isAdmin() ? 'inline-flex' : 'none';
    }
    
    // Configurar asignación - Los administradores pueden reasignar en cualquier estado excepto realizadas
    if (isAdmin() && task.column !== 'realizadas') {
        if (assigneeSelect) {
            assigneeSelect.disabled = false;
        }
    } else {
        if (assigneeSelect) {
            assigneeSelect.disabled = true;
        }
    }
    
    // Remover warning anterior si existe
    const existingWarning = document.getElementById('permissionWarning');
    if (existingWarning) {
        existingWarning.remove();
    }
    
    // Limpiar y mostrar comentarios
    if (commentsInput) commentsInput.value = '';
    displayCommentsHistory(task.comments || '');
    
    // Llenar información de solo lectura
    const taskDetailId = document.getElementById('taskDetailId');
    const taskDetailCreated = document.getElementById('taskDetailCreated');
    const taskDetailUpdated = document.getElementById('taskDetailUpdated');
    
    if (taskDetailId) taskDetailId.textContent = task.id;
    if (taskDetailCreated) taskDetailCreated.textContent = new Date(task.createdAt).toLocaleDateString('es-ES');
    if (taskDetailUpdated) taskDetailUpdated.textContent = task.updatedAt ? new Date(task.updatedAt).toLocaleDateString('es-ES') : 'No actualizada';
    
    // Mostrar el modal
    console.log('🪟 Mostrando modal...');
    const modal = document.getElementById('taskDetailModal');
    if (modal) {
        modal.style.display = 'block';
        console.log('✅ Modal mostrado correctamente');
        if (canEdit && titleInput) {
            titleInput.focus();
        }
    } else {
        console.error('❌ No se encontró el modal taskDetailModal');
    }
}

function closeTaskDetailModal() {
    const modal = document.getElementById('taskDetailModal');
    if (modal) {
        modal.style.display = 'none';
    }
    const form = document.getElementById('editTaskForm');
    if (form) {
        form.reset();
    }
    
    // Limpiar textarea de comentarios específicamente
    const commentsTextarea = document.getElementById('editTaskComments');
    if (commentsTextarea) {
        commentsTextarea.value = '';
    }
    
    // Limpiar preview de archivos
    const filesPreview = document.getElementById('uploadedFilesPreview');
    if (filesPreview) {
        filesPreview.style.display = 'none';
    }
    const fileInput = document.getElementById('commentFileUpload');
    if (fileInput) {
        fileInput.value = '';
    }
    selectedFiles = [];
    
    currentEditingTaskId = null;
    window.currentEditingTaskId = null;
}

function loadEmployeesIntoEditSelect() {
    const select = document.getElementById('editTaskAssignee');
    if (!select) return;
    
    // Limpiar opciones existentes excepto la primera
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    employees.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.id;
        option.textContent = `${employee.name} (${employee.id})`;
        select.appendChild(option);
    });
}

function displayCommentsHistory(commentsString) {
    const historyDiv = document.getElementById('commentsHistory');
    const contentDiv = document.getElementById('commentsHistoryContent');
    const countDiv = document.getElementById('commentsCount');
    
    console.log('🔍 Mostrando historial de comentarios:', commentsString);
    
    if (!commentsString || commentsString.trim() === '') {
        // Mostrar estado vacío
        if (contentDiv) {
            contentDiv.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 40px 20px; font-style: italic;">
                    <div style="font-size: 2rem; margin-bottom: 8px;">📝</div>
                    <div>No hay comentarios aún</div>
                    <div style="font-size: 0.8rem; margin-top: 4px;">Los comentarios aparecerán aquí cuando se agreguen</div>
                </div>
            `;
        }
        if (countDiv) countDiv.textContent = 'Sin comentarios';
        if (historyDiv) historyDiv.style.display = 'block'; // Siempre mostrar el área
        return;
    }
    
    const lines = commentsString.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
        // Mostrar estado vacío
        if (contentDiv) {
            contentDiv.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 40px 20px; font-style: italic;">
                    <div style="font-size: 2rem; margin-bottom: 8px;">📝</div>
                    <div>No hay comentarios aún</div>
                    <div style="font-size: 0.8rem; margin-top: 4px;">Los comentarios aparecerán aquí cuando se agreguen</div>
                </div>
            `;
        }
        if (countDiv) countDiv.textContent = 'Sin comentarios';
        if (historyDiv) historyDiv.style.display = 'block';
        return;
    }
    
    // Actualizar contador
    if (countDiv) {
        const count = lines.length;
        countDiv.textContent = count === 1 ? '1 comentario' : `${count} comentarios`;
    }
    
    let historyHTML = '';
    
    // SOLUCIÓN SIMPLE: Detectar archivos en todo el string de comentarios
    const hasAnyFiles = commentsString.includes('📎') && commentsString.includes('FILE_ID:');
    console.log('🔍 String completo de comentarios tiene archivos:', hasAnyFiles);
    
    lines.reverse().forEach((line, index) => { // Mostrar comentarios más recientes primero
        if (line.includes('[') && line.includes(']')) {
            // Nuevo formato: [timestamp - Usuario (ID)] mensaje
            // Formato anterior: [timestamp] mensaje
            const fullMatch = line.match(/\[(.*?)\]/);
            const fullTimestamp = fullMatch ? fullMatch[1] : '';
            
            let timestamp = fullTimestamp;
            let userName = '';
            let userId = '';
            
            // Detectar si tiene el nuevo formato con usuario
            if (fullTimestamp.includes(' - ') && fullTimestamp.includes('(') && fullTimestamp.includes(')')) {
                const parts = fullTimestamp.split(' - ');
                timestamp = parts[0];
                const userPart = parts[1];
                const userMatch = userPart.match(/^(.*?)\s*\(([^)]*)\)$/);
                if (userMatch) {
                    userName = userMatch[1].trim();
                    userId = userMatch[2].trim();
                }
            }
            
            const comment = line.replace(/\[.*?\]\s*/, '');
            
            // DETECCIÓN MEJORADA: Usar detección global + línea específica
            const hasFiles = comment.includes('📎') && comment.includes('FILE_ID:');
            const forceFiles = hasAnyFiles; // Siempre mostrar si hay archivos en cualquier parte
            
            console.log('🔍 Comentario:', comment);
            console.log('📎 Tiene archivos locales:', hasFiles);
            console.log('📎 Forzar archivos (global):', forceFiles);
            
            // Generar ID único para el comentario
            const commentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2)}`;
            
            historyHTML += `
                <div class="comment-item" style="
                    margin-bottom: 12px; 
                    padding: 16px; 
                    background: rgba(255, 255, 255, 0.9); 
                    border-radius: 12px; 
                    border-left: 4px solid #667eea;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s ease;
                    cursor: default;
                    position: relative;
                " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0, 0, 0, 0.15)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0, 0, 0, 0.1)';">
                    
                    <!-- Botones de acción en la esquina superior derecha -->
                    <div style="
                        position: absolute;
                        top: 8px;
                        right: 8px;
                        display: flex;
                        gap: 4px;
                        opacity: 0.7;
                        transition: opacity 0.2s ease;
                    " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                                                ${forceFiles ? `
                            <button class="view-files-btn" data-comment-id="${commentId}" style="
                                background: #3b82f6;
                                color: white;
                                border: none;
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-size: 0.75rem;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                display: flex;
                                align-items: center;
                                gap: 2px;
                            " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'" title="Ver archivos adjuntos">
                                📎 Ver
                            </button>
                        ` : ''}
 
                        <button class="delete-comment-btn" data-comment-index="${index}" style="
                            background: #ef4444;
                            color: white;
                            border: none;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-size: 0.75rem;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            display: flex;
                            align-items: center;
                            gap: 2px;
                        " onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'" title="Borrar comentario">
                            🗑️ Borrar
                        </button>
                    </div>
                    
                    <div style="
                        display: flex; 
                        align-items: center; 
                        gap: 8px; 
                        font-size: 0.8rem; 
                        color: #64748b; 
                        margin-bottom: 8px; 
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-right: 80px;
                    ">
                        <span>📅</span>
                        <span>${timestamp}</span>
                        ${userName ? `<span style="color: #6366f1; font-weight: 700;">👤 ${userName}</span>` : ''}
                        ${index === 0 ? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; font-weight: 500;">MÁS RECIENTE</span>' : ''}
                    </div>
                    <div id="${commentId}" style="
                        color: #374151; 
                        line-height: 1.6; 
                        font-size: 0.95rem;
                        word-wrap: break-word;
                        white-space: pre-wrap;
                        margin-right: 10px;
                    ">${processCommentContent(comment)}</div>
                </div>
            `;
        } else {
            // Comentario sin formato específico
            const commentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2)}`;
            
            historyHTML += `
                <div class="comment-item" style="
                    margin-bottom: 12px; 
                    padding: 16px; 
                    background: rgba(255, 255, 255, 0.9); 
                    border-radius: 12px; 
                    border-left: 4px solid #94a3b8;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s ease;
                    cursor: default;
                    position: relative;
                " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0, 0, 0, 0.15)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0, 0, 0, 0.1)';">
                    
                    <!-- Botones de acción en la esquina superior derecha -->
                    <div style="
                        position: absolute;
                        top: 8px;
                        right: 8px;
                        display: flex;
                        gap: 4px;
                        opacity: 0.7;
                        transition: opacity 0.2s ease;
                    " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                        <button class="delete-comment-btn" data-comment-index="${index}" style="
                            background: #ef4444;
                            color: white;
                            border: none;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-size: 0.75rem;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            display: flex;
                            align-items: center;
                            gap: 2px;
                        " onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'" title="Borrar comentario">
                            🗑️ Borrar
                        </button>
                    </div>
                    
                    <div style="
                        display: flex; 
                        align-items: center; 
                        gap: 8px; 
                        font-size: 0.8rem; 
                        color: #64748b; 
                        margin-bottom: 8px; 
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-right: 80px;
                    ">
                        <span>📝</span>
                        <span>Comentario anterior</span>
                        ${index === 0 ? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; font-weight: 500;">MÁS RECIENTE</span>' : ''}
                    </div>
                    <div id="${commentId}" style="
                        color: #374151; 
                        line-height: 1.6; 
                        font-size: 0.95rem;
                        word-wrap: break-word;
                        white-space: pre-wrap;
                        margin-right: 10px;
                    ">${escapeHtml(line)}</div>
                </div>
            `;
        }
    });
    
    if (contentDiv) contentDiv.innerHTML = historyHTML;
    if (historyDiv) historyDiv.style.display = 'block';
    
    // Agregar event listeners para los botones
    setTimeout(() => {
        // Event listeners para botones de borrar comentario
        document.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const commentIndex = parseInt(this.getAttribute('data-comment-index'));
                deleteComment(commentIndex);
            });
        });
        
        // Event listeners para botones de ver archivos
        document.querySelectorAll('.view-files-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                const commentId = this.getAttribute('data-comment-id');
                await viewCommentFiles(commentId);
            });
        });
        
        // Scroll al comentario más reciente
        if (contentDiv) {
            contentDiv.scrollTop = 0; // Como invertimos el orden, el más reciente está arriba
        }
    }, 100);
}

// Función para procesar contenido de comentarios con archivos
function processCommentContent(comment) {
    console.log('🔍 Procesando comentario:', comment);
    
    if (!comment.includes('📎') || !comment.includes('FILE_ID:')) {
        return escapeHtml(comment);
    }
    
    // NUEVA LÓGICA: Separar texto de archivos en la misma línea
    let textPart = comment;
    const fileMatches = comment.match(/📎[^|]*\|FILE_ID:[^\s]+/g);
    
    if (fileMatches) {
        // Remover todos los archivos del texto para obtener solo el texto limpio
        fileMatches.forEach(fileMatch => {
            textPart = textPart.replace(fileMatch, '').trim();
        });
    }
    
    let processedContent = '';
    
    // Agregar texto del comentario si existe
    if (textPart) {
        processedContent += escapeHtml(textPart);
    }
    
    // Agregar archivos si existen - VERSIÓN SIMPLIFICADA
    if (fileMatches && fileMatches.length > 0) {
        if (processedContent) {
            processedContent += '<br><br>';
        }
        
        processedContent += '<div style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); padding: 16px; border-radius: 12px; border: 1px solid #cbd5e1; margin-top: 12px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">';
        processedContent += '<div style="font-size: 0.9rem; color: #475569; margin-bottom: 12px; font-weight: 700; display: flex; align-items: center; gap: 8px;"><span style="font-size: 1.1rem;">📎</span>Archivos adjuntos</div>';
        
        fileMatches.forEach(fileMatch => {
            console.log('📎 Procesando archivo:', fileMatch);
            
            // Extraer información del archivo desde el match
            const match = fileMatch.match(/📎\s*(.+?)\s*\(([^)]+)\)\s*\|FILE_ID:([^\s]+)/);
            if (match) {
                const fileName = match[1];
                const fileSize = match[2];
                const fileId = match[3];
                
                console.log('📎 Archivo encontrado:', { fileName, fileSize, fileId });
                
                // Mostrar información mejorada del archivo
                processedContent += `
                    <div style="
                        display: flex; 
                        align-items: center; 
                        gap: 12px; 
                        padding: 12px; 
                        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); 
                        border: 1px solid #e2e8f0; 
                        border-radius: 8px; 
                        margin-bottom: 8px;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        transition: all 0.2s ease;
                        cursor: pointer;
                    " data-file-id="${fileId}" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0, 0, 0, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(0, 0, 0, 0.1)'">
                        <div style="
                            width: 40px; 
                            height: 40px; 
                            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                            border-radius: 8px; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            color: white; 
                            font-size: 1.2rem;
                            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
                        ">
                            📄
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; color: #1e293b; font-size: 0.9rem; word-break: break-word; margin-bottom: 2px;">
                                ${escapeHtml(fileName)}
                            </div>
                            <div style="font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 4px;">
                                <span style="color: #10b981;">●</span>
                                ${escapeHtml(fileSize)}
                            </div>
                        </div>
                        <div style="
                            padding: 6px 12px; 
                            background: rgba(59, 130, 246, 0.1); 
                            border: 1px solid rgba(59, 130, 246, 0.2); 
                            border-radius: 6px; 
                            font-size: 0.8rem; 
                            color: #1e40af; 
                            font-weight: 600;
                        ">
                            Adjunto
                        </div>
                        <span style="display: none;">FILE_ID:${fileId}</span>
                    </div>
                `;
            } else {
                console.log('⚠️ No se pudo parsear archivo:', fileMatch);
                // Fallback: mostrar información básica mejorada
                processedContent += `
                    <div style="
                        display: flex; 
                        align-items: center; 
                        gap: 12px; 
                        padding: 12px; 
                        background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); 
                        border: 1px solid #d1d5db; 
                        border-radius: 8px; 
                        margin-bottom: 8px;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        opacity: 0.8;
                    ">
                        <div style="
                            width: 40px; 
                            height: 40px; 
                            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); 
                            border-radius: 8px; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            color: white; 
                            font-size: 1.2rem;
                        ">
                            📄
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; color: #374151; font-size: 0.9rem; margin-bottom: 2px;">
                                Archivo adjunto
                            </div>
                            <div style="font-size: 0.8rem; color: #6b7280; display: flex; align-items: center; gap: 4px;">
                                <span style="color: #f59e0b;">●</span>
                                Información no disponible
                            </div>
                        </div>
                        <div style="
                            padding: 6px 12px; 
                            background: rgba(156, 163, 175, 0.1); 
                            border: 1px solid rgba(156, 163, 175, 0.2); 
                            border-radius: 6px; 
                            font-size: 0.8rem; 
                            color: #6b7280; 
                            font-weight: 600;
                        ">
                            Error
                        </div>
                    </div>
                `;
            }
        });
        
        processedContent += '</div>';
    }
    
    return processedContent;
}

// Función para crear elemento de archivo con botones de acción
function createFileElement(fileInfo) {
    const fileData = getFileFromStorage(fileInfo.fileId);
    const icon = getFileIcon(fileData ? fileData.type : 'application/octet-stream');
    
    return `
        <div style="
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            background: white;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            width: 100%;
            box-sizing: border-box;
        ">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                <div style="font-size: 2em; flex-shrink: 0;">${icon}</div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 1em; color: #1e293b; font-weight: 600; margin-bottom: 4px; word-wrap: break-word;">${fileInfo.originalName}</div>
                    <div style="font-size: 0.85em; color: #64748b;">${fileInfo.size} • ${fileInfo.location}</div>
                </div>
            </div>
            <div style="display: flex; gap: 8px; flex-shrink: 0;">
                <button onclick="window.openFilePreview('${fileInfo.fileId}')" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 14px;
                    cursor: pointer;
                    font-size: 0.85em;
                    font-weight: 600;
                    transition: background 0.2s ease;
                    white-space: nowrap;
                " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                    👁️ Ver
                </button>
                <button onclick="window.deleteFileFromComment('${fileInfo.fileId}', window.currentEditingTaskId)" style="
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 14px;
                    cursor: pointer;
                    font-size: 0.85em;
                    font-weight: 600;
                    transition: background 0.2s ease;
                    white-space: nowrap;
                " onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                    🗑️ Borrar
                </button>
            </div>
        </div>
    `;
}

// Función para limpiar todas las tareas
async function clearAllTasks() {
    if (!isAdmin()) {
        showNotification('❌ Solo los administradores pueden eliminar todas las tareas', 'error');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres eliminar todas las tareas? Esta acción no se puede deshacer.')) {
        try {
            isLoading = true;
            const { error } = await supabase
                .from('tasks')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');

            if (error) throw error;
            
            tasks = [];
            renderTasks();
            updateStats();
            showNotification('Todas las tareas han sido eliminadas', 'success');
        } catch (error) {
            console.error('Error eliminando tareas:', error);
            showNotification('Error eliminando las tareas', 'error');
        } finally {
            isLoading = false;
        }
    }
}

// Función para exportar tareas
function exportTasks() {
    if (tasks.length === 0) {
        showNotification('No hay tareas para exportar', 'warning');
        return;
    }
    
    const headers = ['ID', 'Título', 'Descripción', 'Asignado a', 'ID Empleado', 'Prioridad', 'Estado', 'Fecha Límite', 'Creado'];
    const rows = tasks.map(task => [
        task.id,
        `"${String(task.title).replace(/"/g, '""')}"`,
        `"${String(task.description || '').replace(/"/g, '""')}"`,
        `"${String(task.assigneeName || 'Sin asignar').replace(/"/g, '""')}"`,
        task.assigneeId || '',
        getPriorityDisplayName(task.priority),
        getColumnDisplayName(task.column),
        task.dueDate || '',
        new Date(task.createdAt).toLocaleDateString('es-ES')
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `taskboard_itla_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showNotification('Tareas exportadas exitosamente', 'success');
}

function getPriorityDisplayName(priority) {
    const priorities = { 'low': 'Baja', 'medium': 'Media', 'high': 'Alta' };
    return priorities[priority] || priority;
}

// Función para mostrar indicador de progreso
function showProgressIndicator(message = 'Procesando...') {
    const indicator = document.getElementById('progressIndicator') || createProgressIndicator();
    const messageEl = indicator.querySelector('.progress-message');
    if (messageEl) {
        messageEl.textContent = message;
    }
    indicator.style.display = 'flex';
}

function hideProgressIndicator() {
    const indicator = document.getElementById('progressIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

function createProgressIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'progressIndicator';
    indicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    indicator.innerHTML = `
        <div style="
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        ">
            <div style="
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
            "></div>
            <div class="progress-message">Procesando...</div>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(indicator);
    return indicator;
}

// Función para enviar comentario individual con archivos
async function sendComment() {
    const commentText = document.getElementById('editTaskComments').value.trim();
    const hasFiles = selectedFiles && selectedFiles.length > 0;
    if (!commentText && !hasFiles) {
        showNotification('Por favor escribe un comentario o selecciona archivos antes de enviar', 'warning');
        return;
    }
    if (!currentEditingTaskId) {
        showNotification('Error: No hay tarea seleccionada', 'error');
        return;
    }
    const sendBtn = document.getElementById('sendCommentBtn');
    const originalBtnText = sendBtn.innerHTML;
    try {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '⏳ Enviando...';
        const currentTask = tasks.find(t => t.id === currentEditingTaskId);
        if (!currentTask) {
            showNotification('Error: No se pudo encontrar la tarea', 'error');
            return;
        }
        let commentToAdd = commentText;
        if (hasFiles) {
            sendBtn.innerHTML = '📤 Procesando archivos...';
            const uploadedFiles = await uploadFiles(selectedFiles, currentEditingTaskId);
            if (uploadedFiles.length > 0) {
                const filesInfo = uploadedFiles.map(f => {
                    return `📎 ${f.originalName} (${formatFileSize(f.size)}) |FILE_ID:${f.id}`;
                }).join(' ');
                if (commentText) {
                    commentToAdd = `${commentText} ${filesInfo}`;
                } else {
                    commentToAdd = `Archivos adjuntos: ${filesInfo}`;
                }
            }
        }
        sendBtn.innerHTML = '💾 Guardando...';
        // Agregar el comentario al historial con información del usuario
        const updatedComments = addCommentToHistory(currentTask.comments || '', commentToAdd, currentUser);
        // ACTUALIZAR EN FIRESTORE (NO SUPABASE)
        const taskDoc = doc(db, "tasks", currentEditingTaskId);
        await updateDoc(taskDoc, { comments: updatedComments, updated_at: new Date().toISOString() });
        // Actualizar la tarea local
        currentTask.comments = updatedComments;
        // Limpiar formulario
        document.getElementById('editTaskComments').value = '';
        const filesPreview = document.getElementById('uploadedFilesPreview');
        if (filesPreview) filesPreview.style.display = 'none';
        const fileInput = document.getElementById('commentFileUpload');
        if (fileInput) fileInput.value = '';
        selectedFiles = [];
        // Actualizar la visualización de comentarios
        displayCommentsHistory(updatedComments);
        // Actualizar la vista de tareas
        renderTasks();
        const successMsg = hasFiles ? 
            `💬 Comentario${commentText ? ' y archivos' : ' con archivos'} agregado${commentText ? 's' : ''} exitosamente (archivos procesados localmente)` :
            '💬 Comentario agregado exitosamente';
        showNotification(successMsg, 'success');
    } catch (error) {
        console.error('Error enviando comentario:', error);
        showNotification('Error enviando el comentario: ' + (error.message || 'Error desconocido'), 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalBtnText;
    }
}

// Función para manejar la selección de archivos
function handleFileSelection() {
    const fileInput = document.getElementById('commentFileUpload');
    const filesPreview = document.getElementById('uploadedFilesPreview');
    const filesList = document.getElementById('filesList');
    
    selectedFiles = Array.from(fileInput.files);
    
    if (selectedFiles.length > 0) {
        filesPreview.style.display = 'block';
        filesList.innerHTML = '';
        
        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.style.cssText = `
                display: flex;
                align-items: center;
                gap: 6px;
                background: rgba(99, 102, 241, 0.1);
                border: 1px solid rgba(99, 102, 241, 0.2);
                border-radius: 6px;
                padding: 4px 8px;
                font-size: 0.75rem;
                max-width: 200px;
            `;
            
            const fileIcon = getFileIcon(file.type);
            const fileName = file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name;
            
            fileItem.innerHTML = `
                <span>${fileIcon}</span>
                <span style="color: #4338ca; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fileName}</span>
                <button onclick="removeFile(${index})" style="
                    background: none;
                    border: none;
                    color: #dc2626;
                    cursor: pointer;
                    font-size: 0.7rem;
                    padding: 0;
                    margin-left: auto;
                ">✕</button>
            `;
            
            filesList.appendChild(fileItem);
        });
    } else {
        filesPreview.style.display = 'none';
    }
}

// Función para obtener el icono del archivo según su tipo
function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('text')) return '📄';
    return '📎';
}

// Función para remover un archivo seleccionado
function removeFile(index) {
    selectedFiles.splice(index, 1);
    
    // Actualizar el input de archivos
    const fileInput = document.getElementById('commentFileUpload');
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;
    
    handleFileSelection();
}

// Función para formatear el tamaño del archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Event listeners para archivos
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('commentFileUpload');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelection);
    }
    
    // Permitir también enviar comentario con Enter (Ctrl+Enter)
    const commentTextarea = document.getElementById('editTaskComments');
    if (commentTextarea) {
        commentTextarea.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                sendComment();
            }
        });
    }
});

// Hacer funciones disponibles globalmente
window.sendComment = sendComment;
window.handleFileSelection = handleFileSelection;
window.removeFile = removeFile;
window.openFilePreview = openFilePreview;
window.closeFilePreview = closeFilePreview;
window.downloadFile = downloadFile;
window.openAddTaskModal = openAddTaskModal;
window.closeAddTaskModal = closeAddTaskModal;
window.logout = logout;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initApp); 

// =============================
// FUNCIONES DE UI: MODAL NUEVA TAREA
// =============================
function openAddTaskModal() {
    console.log('🟣 [DEBUG] openAddTaskModal() ejecutado');
    let modal = document.getElementById('addTaskModal');
    if (!modal) {
        console.log('🟣 [DEBUG] Modal no existe, creando nuevo modal');
        // Crear modal si no existe
        modal = document.createElement('div');
        modal.id = 'addTaskModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">📝 Crear Nueva Tarea</h2>
                    <button class="close" onclick="closeAddTaskModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="addTaskForm">
                        <div class="modal-content-grid">
                            <!-- Columna Izquierda: Información Principal -->
                            <div class="modal-card">
                                <h3>📝 Información Principal</h3>
                                
                                <div class="form-group" style="margin-bottom: 16px;">
                                    <label for="addTaskTitle">Título de la Tarea *</label>
                                    <input type="text" id="addTaskTitle" name="addTaskTitle" required placeholder="Ingresa el título de la tarea" style="background: #fff; border: 2px solid #e2e8f0;">
                                </div>
                                
                                <div class="form-group" style="margin-bottom: 16px;">
                                    <label for="addTaskDescription">Descripción</label>
                                    <textarea id="addTaskDescription" name="addTaskDescription" placeholder="Describe los detalles de la tarea..." style="min-height: 120px; background: #fff; border: 2px solid #e2e8f0;"></textarea>
                                </div>

                                <div style="padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.2);">
                                    <div style="font-size: 0.85rem; color: #1e40af; margin-bottom: 4px; font-weight: 600;">💡 Consejo</div>
                                    <div style="font-size: 0.8rem; color: #3730a3;">
                                        Sé específico en el título y detallado en la descripción para facilitar el trabajo del equipo.
                                    </div>
                                </div>
                            </div>

                            <!-- Columna Derecha: Configuración y Comentarios -->
                            <div style="display: flex; flex-direction: column; gap: 20px;">
                                <!-- Card de Configuración -->
                                <div class="modal-card">
                                    <h3>⚙️ Configuración</h3>
                                    
                                    <div class="config-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                                        <div class="form-group" style="margin-bottom: 0;">
                                            <label for="addTaskAssignee">Asignar a</label>
                                            <select id="addTaskAssignee" name="addTaskAssignee">
                                                <option value="">Sin asignar</option>
                                            </select>
                                        </div>
                                        <div class="form-group" style="margin-bottom: 0;">
                                            <label for="addTaskPriority">Prioridad</label>
                                            <select id="addTaskPriority" name="addTaskPriority">
                                                <option value="low">🟢 Baja</option>
                                                <option value="medium" selected>🟡 Media</option>
                                                <option value="high">🔴 Alta</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div class="form-group" style="margin-bottom: 0;">
                                        <label for="addTaskDueDate">📅 Fecha Límite</label>
                                        <input type="date" id="addTaskDueDate" name="addTaskDueDate">
                                    </div>
                                </div>

                                <!-- Card de Comentarios -->
                                <div class="modal-card">
                                    <h3>💬 Comentarios Iniciales</h3>
                                    
                                    <div class="form-group" style="margin-bottom: 0;">
                                        <textarea id="addTaskComments" name="addTaskComments" class="comments" placeholder="Comentarios o notas iniciales (opcional)..." style="min-height: 80px;"></textarea>
                                    </div>
                                </div>
                                
                                <!-- Info de Estado -->
                                <div style="padding: 12px; background: rgba(34, 197, 94, 0.1); border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.2);">
                                    <div style="font-size: 0.85rem; color: #166534; margin-bottom: 4px; font-weight: 600;">📋 Estado Inicial</div>
                                    <div style="font-size: 0.8rem; color: #15803d;">
                                        La tarea se creará en estado <strong>"Tareas"</strong> y se moverá automáticamente a <strong>"Asignadas"</strong> si seleccionas un empleado.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                
                <div class="modal-footer">
                    <div class="form-buttons" style="margin-top: 0; padding-top: 0; border-top: none;">
                        <button type="button" class="btn btn-secondary" onclick="closeAddTaskModal()">
                            <span>❌</span> Cancelar
                        </button>
                        <button type="submit" class="btn btn-success" id="addTaskSubmitBtn" form="addTaskForm">
                            <span>✨</span> Crear Tarea
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        console.log('🟣 [DEBUG] Modal creado y agregado al DOM');
        
        // Cargar empleados en el select
        const select = modal.querySelector('#addTaskAssignee');
        if (select && employees && employees.length > 0) {
            employees.forEach(employee => {
                const option = document.createElement('option');
                option.value = employee.id;
                option.textContent = `${employee.name} (${employee.id})`;
                select.appendChild(option);
            });
            console.log('🟣 [DEBUG] Empleados cargados en el select:', employees.length);
        }
        
        // Listener para submit
        const form = modal.querySelector('#addTaskForm');
        if (form) {
            console.log('🟣 [DEBUG] Agregando event listener al formulario');
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                const title = form.addTaskTitle.value.trim();
                const description = form.addTaskDescription.value.trim();
                const assigneeId = form.addTaskAssignee.value;
                const assigneeName = employees.find(emp => emp.id === assigneeId)?.name || '';
                const priority = form.addTaskPriority.value;
                const dueDate = form.addTaskDueDate.value;
                const comments = form.addTaskComments.value.trim();
                console.log('🟡 [DEBUG] Formulario submit: ', {title, description, assigneeId, assigneeName, priority, dueDate, comments});
                if (!title) {
                    showNotification('El título es obligatorio', 'warning');
                    return;
                }
                try {
                    const nuevaTarea = await saveTask({
                        title,
                        description,
                        assigneeId,
                        assigneeName,
                        priority,
                        dueDate,
                        column: 'tareas',
                        comments: comments || ''
                    });
                    console.log('🟢 [DEBUG] Tarea creada correctamente:', nuevaTarea);
                    showNotification('Tarea creada exitosamente', 'success');
                    closeAddTaskModal();
                } catch (error) {
                    console.error('❌ [DEBUG] Error creando tarea desde el formulario:', error);
                    showNotification('Error creando tarea', 'error');
                }
            });
        } else {
            console.error('❌ [DEBUG] No se encontró el formulario en el modal');
        }
    } else {
        console.log('🟣 [DEBUG] Modal ya existe, reutilizando');
    }
    modal.style.display = 'block';
    console.log('🟣 [DEBUG] Modal mostrado');
}

function closeAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    if (modal) {
        modal.style.display = 'none';
        // Opcional: limpiar campos
        const form = modal.querySelector('#addTaskForm');
        if (form) form.reset();
    }
}

// =============================
// FUNCIONES DE UI: RECARGAR Y ELIMINAR
// =============================
async function reloadTasksFromDB() {
    await loadTasks();
    showNotification('Tareas recargadas', 'success');
}

async function deleteCurrentTask() {
    if (!currentEditingTaskId) {
        showNotification('No hay tarea seleccionada', 'warning');
        return;
    }
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarea?')) return;
    try {
        await deleteTask(currentEditingTaskId);
        showNotification('Tarea eliminada', 'success');
        closeTaskDetailModal();
    } catch (error) {
        showNotification('Error eliminando tarea', 'error');
    }
}

// Exponer funciones en window
window.openAddTaskModal = openAddTaskModal;
window.closeAddTaskModal = closeAddTaskModal;
window.closeTaskDetailModal = closeTaskDetailModal;
window.deleteCurrentTask = deleteCurrentTask;
window.sendComment = sendComment;
window.reloadTasksFromDB = reloadTasksFromDB;
window.exportTasks = exportTasks;
window.clearAllTasks = clearAllTasks;

// =============================
// FUNCIÓN PARA LLENAR EL SELECT DE EMPLEADOS EN EL MODAL DE NUEVA TAREA
// =============================
function loadEmployeesIntoSelect() {
    const select = document.getElementById('addTaskAssignee');
    if (!select) return;
    // Limpiar opciones existentes excepto la primera
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    employees.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.id;
        option.textContent = `${employee.name} (${employee.id})`;
        select.appendChild(option);
    });
}

// =============================
// FUNCIÓN PARA ACTUALIZAR LOS CONTADORES DE TAREAS EN LA UI
// =============================
function updateStats() {
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

// =============================
// FUNCIÓN PARA RENDERIZAR EL TABLERO DE TAREAS
// =============================
function renderTasks() {
    // Definir las columnas del tablero
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

// ... existing code ...

// Función para mostrar instrucciones de CORS al usuario
function showCORSInstructions() {
    const modal = document.createElement('div');
    modal.id = 'corsInstructionsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 16px;
            padding: 24px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            border: 2px solid #f59e0b;
        ">
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 3rem; margin-bottom: 8px;">⚠️</div>
                <h2 style="color: #d97706; margin: 0; font-size: 1.4rem;">Error de CORS - Subida de Archivos</h2>
            </div>
            
            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border: 1px solid #f59e0b; margin-bottom: 16px;">
                <div style="font-weight: 600; color: #92400e; margin-bottom: 8px;">🔍 ¿Qué está pasando?</div>
                <div style="color: #92400e; font-size: 0.9rem; line-height: 1.4;">
                    Tu navegador está bloqueando la subida de archivos debido a políticas de CORS (Cross-Origin Resource Sharing). 
                    Esto ocurre cuando accedes a la aplicación desde un servidor local.
                </div>
            </div>
            
            <div style="background: #dbeafe; padding: 16px; border-radius: 8px; border: 1px solid #3b82f6; margin-bottom: 16px;">
                <div style="font-weight: 600; color: #1e40af; margin-bottom: 8px;">💡 Soluciones:</div>
                <div style="color: #1e40af; font-size: 0.9rem; line-height: 1.4;">
                    <strong>Opción 1 (Recomendada):</strong> Usa Firebase Hosting<br>
                    • Abre una terminal en tu proyecto<br>
                    • Ejecuta: <code style="background: #f1f5f9; padding: 2px 4px; border-radius: 4px;">firebase serve</code><br>
                    • Accede a <code style="background: #f1f5f9; padding: 2px 4px; border-radius: 4px;">http://localhost:5000</code><br><br>
                    
                    <strong>Opción 2:</strong> Desplegar en producción<br>
                    • Ejecuta: <code style="background: #f1f5f9; padding: 2px 4px; border-radius: 4px;">firebase deploy</code><br>
                    • Accede a tu dominio de Firebase
                </div>
            </div>
            
            <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border: 1px solid #22c55e; margin-bottom: 20px;">
                <div style="font-weight: 600; color: #15803d; margin-bottom: 8px;">✅ Mientras tanto:</div>
                <div style="color: #15803d; font-size: 0.9rem; line-height: 1.4;">
                    Los archivos se registrarán localmente en tus comentarios, pero no se subirán al servidor hasta que resuelvas el problema de CORS.
                </div>
            </div>
            
            <div style="text-align: center;">
                <button onclick="closeCORSInstructions()" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s ease;
                " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                    Entendido
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Función para cerrar las instrucciones de CORS
function closeCORSInstructions() {
    const modal = document.getElementById('corsInstructionsModal');
    if (modal) {
        modal.remove();
    }
}

// Exponer la función al scope global
window.closeCORSInstructions = closeCORSInstructions;

// ... existing code ...

// Función para borrar un comentario individual
async function deleteComment(commentIndex) {
    if (!currentEditingTaskId) {
        showNotification('Error: No hay tarea seleccionada', 'error');
        return;
    }
    
    if (!confirm('¿Estás seguro de que quieres borrar este comentario?')) {
        return;
    }
    
    try {
        showProgressIndicator('Borrando comentario...');
        
        const task = tasks.find(t => t.id === currentEditingTaskId);
        if (!task || !task.comments) {
            throw new Error('No se encontró la tarea o comentarios');
        }
        
        const commentsArray = task.comments.split('\n').filter(line => line.trim());
        
        // Verificar que el índice sea válido
        if (commentIndex < 0 || commentIndex >= commentsArray.length) {
            throw new Error('Índice de comentario inválido');
        }
        
        // Como invertimos el orden en la visualización, necesitamos ajustar el índice
        const realIndex = commentsArray.length - 1 - commentIndex;
        
        // Eliminar el comentario del array
        commentsArray.splice(realIndex, 1);
        
        // Actualizar los comentarios
        const updatedComments = commentsArray.join('\n');
        
        // Actualizar en Firebase
        const taskDoc = doc(db, "tasks", currentEditingTaskId);
        await updateDoc(taskDoc, { 
            comments: updatedComments, 
            updated_at: new Date().toISOString() 
        });
        
        // Actualizar la tarea local
        task.comments = updatedComments;
        
        // Actualizar la visualización
        displayCommentsHistory(updatedComments);
        
        hideProgressIndicator();
        showNotification('Comentario borrado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error borrando comentario:', error);
        hideProgressIndicator();
        showNotification('Error al borrar comentario: ' + error.message, 'error');
    }
}

// Función para ver archivos de un comentario específico
async function viewCommentFiles(commentId) {
    console.log('🔍 Intentando ver archivos del comentario:', commentId);
    
    const commentDiv = document.getElementById(commentId);
    if (!commentDiv) {
        console.log('❌ No se encontró el comentario con ID:', commentId);
        showNotification('Error: No se encontró el comentario', 'error');
        return;
    }
    
    // Buscar todos los archivos en el comentario usando data-file-id
    const fileElements = commentDiv.querySelectorAll('[data-file-id]');
    console.log('📎 Elementos con archivos encontrados:', fileElements.length);
    
    if (fileElements.length === 0) {
        // Fallback: buscar FILE_ID en el texto
        const commentContent = commentDiv.textContent || commentDiv.innerText;
        const fileIdMatches = commentContent.match(/FILE_ID:([^|\s\n]+)/g);
        
        if (!fileIdMatches || fileIdMatches.length === 0) {
            showNotification('Este comentario no tiene archivos adjuntos', 'info');
            return;
        }
        
        // Si hay un solo archivo, abrirlo directamente
        if (fileIdMatches.length === 1) {
            const fileId = fileIdMatches[0].replace('FILE_ID:', '');
            console.log('📄 Abriendo archivo único (fallback):', fileId);
            await openFilePreview(fileId);
            return;
        }
        
        // Múltiples archivos (fallback)
        const fileIds = fileIdMatches.map(match => match.replace('FILE_ID:', ''));
        console.log('📁 Mostrando modal con múltiples archivos (fallback):', fileIds);
        await showCommentFilesModal(fileIds);
        return;
    }
    
    // Si solo hay un archivo, abrirlo directamente
    if (fileElements.length === 1) {
        const fileId = fileElements[0].getAttribute('data-file-id');
        console.log('📄 Abriendo archivo único:', fileId);
        await openFilePreview(fileId);
        return;
    }
    
    // Si hay múltiples archivos, mostrar un modal con la lista
    console.log('📁 Mostrando modal con múltiples archivos');
    
    const fileIds = Array.from(fileElements).map(el => el.getAttribute('data-file-id'));
    await showCommentFilesModal(fileIds);
}

// Función para mostrar modal con múltiples archivos
async function showCommentFilesModal(fileIds) {
    const modal = document.createElement('div');
    modal.id = 'commentFilesModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;
    
    let filesHTML = '';
    
    // Procesar archivos de forma asíncrona
    for (const fileId of fileIds) {
        const fileData = await getFileFromStorage(fileId);
        if (fileData) {
            const icon = getFileIcon(fileData.type);
            const sizeText = formatFileSize(fileData.size);
            
            filesHTML += `
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    border-radius: 8px;
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                " onclick="openFilePreview('${fileId}'); closeCommentFilesModal();" onmouseover="this.style.background='rgba(59, 130, 246, 0.15)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.1)'">
                    <span style="font-size: 1.5rem;">${icon}</span>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; color: #1e40af; font-size: 0.9rem; word-break: break-word;">
                            ${escapeHtml(fileData.originalName)}
                        </div>
                        <div style="font-size: 0.8rem; color: #3730a3;">
                            ${sizeText} • Disponible
                        </div>
                    </div>
                    <div style="color: #3b82f6; font-size: 0.8rem; font-weight: 600;">
                        👁️ Ver
                    </div>
                </div>
            `;
        }
    }
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 16px;
            padding: 24px;
            max-width: 500px;
            max-height: 70vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            border: 2px solid #3b82f6;
        ">
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 2rem; margin-bottom: 8px;">📎</div>
                <h2 style="color: #1e40af; margin: 0; font-size: 1.3rem;">Archivos del Comentario</h2>
                <div style="color: #64748b; font-size: 0.9rem; margin-top: 4px;">
                    ${fileIds.length} archivo${fileIds.length > 1 ? 's' : ''} adjunto${fileIds.length > 1 ? 's' : ''}
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                ${filesHTML}
            </div>
            
            <div style="text-align: center;">
                <button onclick="closeCommentFilesModal()" style="
                    background: #6b7280;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s ease;
                " onmouseover="this.style.background='#4b5563'" onmouseout="this.style.background='#6b7280'">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Función para cerrar el modal de archivos del comentario
function closeCommentFilesModal() {
    const modal = document.getElementById('commentFilesModal');
    if (modal) {
        modal.remove();
    }
}

// Exponer las funciones al scope global
window.deleteComment = deleteComment;
window.viewCommentFiles = viewCommentFiles;
window.closeCommentFilesModal = closeCommentFilesModal;

// Inicializar la aplicación cuando se carga la página
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