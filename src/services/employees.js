// ===================================================================
// SERVICIOS DE EMPLEADOS
// ===================================================================
import { db } from '../../config/firebase.js';
import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { showNotification } from '../utils/helpers.js';

// Variable global para empleados
let employees = [];

// Función para cargar empleados
export async function loadEmployees() {
    try {
        const q = query(collection(db, "employees"), where("active", "==", true), orderBy("name"));
        const querySnapshot = await getDocs(q);
        employees = querySnapshot.docs.map(doc => ({
            id: doc.data().employee_id,
            name: doc.data().name,
            department: doc.data().department
        }));
        
        // Disparar evento de actualización
        window.dispatchEvent(new CustomEvent('employeesUpdated', { detail: employees }));
        
        console.log('✅ Empleados cargados:', employees.length);
        return employees;
    } catch (error) {
        console.error('❌ Error cargando empleados:', error);
        showNotification('Error cargando empleados', 'error');
        throw error;
    }
}

// Función para obtener empleados
export function getEmployees() {
    return employees;
}

// Función para cargar empleados en un select
export function loadEmployeesIntoSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Limpiar opciones existentes excepto la primera
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    employees.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.id;
        option.textContent = employee.name;
        select.appendChild(option);
    });
} 