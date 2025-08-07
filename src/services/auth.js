// ===================================================================
// SERVICIOS DE AUTENTICACIÓN
// ===================================================================
import { db } from '../../config/firebase.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { showNotification } from '../utils/helpers.js';

// Función de autenticación
export async function initAuth() {
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
        
        const currentUser = {
            id: employeeData.employee_id,
            name: employeeData.name,
            department: employeeData.department,
            loginTime: new Date().toISOString()
        };

        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        window.currentUser = currentUser;

        console.log('✅ Usuario autenticado desde Firebase:', currentUser);
        return currentUser;
        
    } catch (error) {
        console.error('❌ Error de autenticación:', error);
        throw error;
    }
}

// Función para verificar que el usuario siga autenticado
export async function checkAuthStatus() {
    if (!window.currentUser) {
        // Intentar restaurar la sesión desde sessionStorage
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            try {
                window.currentUser = JSON.parse(storedUser);
                console.log('🔄 Sesión restaurada desde sessionStorage');
            } catch (e) {
                console.error('Error leyendo sesión almacenada:', e);
            }
        }

        if (!window.currentUser) {
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

// Función de logout
export function logout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        sessionStorage.removeItem('currentUser');
        window.currentUser = null;
        window.location.href = 'index.html';
    }
} 