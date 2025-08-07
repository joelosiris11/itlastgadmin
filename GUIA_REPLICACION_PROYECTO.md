# 📋 Guía de Replicación - TaskBoard ITLA

## 🎯 Descripción del Proyecto

**TaskBoard ITLA** es una aplicación web de gestión de tareas desarrollada para el Instituto Tecnológico de Las Américas (ITLA). La aplicación permite a los empleados crear, asignar, gestionar y dar seguimiento a tareas en un entorno colaborativo con sistema de roles y permisos.

### 🚀 Características Principales

- **Sistema de Autenticación**: Basado en Firebase Auth con roles de usuario y administrador
- **Gestión de Tareas**: Creación, edición, asignación y seguimiento de tareas
- **Sistema de Columnas**: Kanban board con estados: Tareas, Asignadas, En Proceso, Revisión, Realizadas
- **Subida de Archivos**: Integración con Firebase Storage para adjuntar documentos
- **Sistema de Comentarios**: Historial de comentarios con timestamps
- **Dashboard Administrativo**: Panel de control para administradores
- **Sistema de Ponche**: Control de entrada/salida de empleados
- **Responsive Design**: Interfaz adaptativa para diferentes dispositivos

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Firestore, Storage, Hosting)
- **Autenticación**: Firebase Auth
- **Base de Datos**: Firestore (NoSQL)
- **Almacenamiento**: Firebase Storage
- **Despliegue**: Firebase Hosting

### Estructura de Archivos

```
itlastgadmin/
├── 📁 public/                    # Archivos públicos para hosting
│   ├── index.html               # Página de login
│   ├── taskboard.html           # Tablero principal de tareas
│   ├── taskboard.js             # Lógica principal de la aplicación
│   ├── ponche.html              # Sistema de control de ponche
│   ├── logo.png                 # Logo de la institución
│   └── 404.html                 # Página de error
├── 📁 configuración/
│   ├── firebase.json            # Configuración de Firebase
│   ├── firestore.rules          # Reglas de seguridad Firestore
│   ├── storage.rules            # Reglas de seguridad Storage
│   ├── firestore.indexes.json   # Índices de Firestore
│   └── database.rules.json      # Reglas de Realtime Database
├── package.json                 # Dependencias del proyecto
└── GUIA_REPLICACION_PROYECTO.md # Esta guía
```

---

## 🔥 Configuración de Firebase

### 1. Crear Proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto con el nombre deseado
3. Habilita los siguientes servicios:
   - **Firestore Database**
   - **Storage**
   - **Hosting**
   - **Authentication** (opcional, para futuras mejoras)

### 2. Configuración del Proyecto

#### firebase.json
```json
{
  "firestore": {
    "database": "(default)",
    "location": "nam5",
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ]
  },
  "database": {
    "rules": "database.rules.json"
  }
}
```

#### firestore.rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Tareas - Acceso completo para desarrollo
    match /tasks/{taskId} {
      allow read, write: if true;
    }
    // Empleados - Solo lectura para la app
    match /employees/{employeeId} {
      allow read, write: if true;
    }
    // Comentarios y archivos
    match /comments/{commentId} {
      allow read, write: if true;
    }
    // Registros de ponche
    match /punch_records/{recordId} {
      allow read, write: if true;
    }
    // Historial de tareas
    match /task_history/{historyId} {
      allow read, write: if true;
    }
    // Permitir acceso a cualquier documento para desarrollo
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

#### storage.rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Archivos de tareas - Acceso completo para desarrollo
    match /tasks/{taskId}/{allPaths=**} {
      allow read, write: if true
        && request.resource.size < 50 * 1024 * 1024 // 50MB
        && (
          request.resource.contentType.matches('image/.*') ||
          request.resource.contentType.matches('application/pdf') ||
          request.resource.contentType.matches('application/vnd.ms-excel') ||
          request.resource.contentType.matches('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
          request.resource.contentType.matches('application/msword') ||
          request.resource.contentType.matches('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
          request.resource.contentType.matches('text/plain') ||
          request.resource.contentType.matches('text/csv')
        );
    }
    // Permitir lectura de archivos existentes
    match /{allPaths=**} {
      allow read: if true;
    }
  }
}
```

### 3. Configuración de la Aplicación

#### Configuración Firebase en taskboard.js
```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};
```

---

## 🗄️ Estructura de la Base de Datos

### Colecciones de Firestore

#### 1. Colección: `employees`
```javascript
{
  employee_id: "0062",           // ID único del empleado
  name: "Juan Pérez",            // Nombre completo
  department: "IT",              // Departamento
  active: true,                  // Estado activo/inactivo
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z"
}
```

#### 2. Colección: `tasks`
```javascript
{
  title: "Implementar nueva funcionalidad",
  description: "Desarrollar módulo de reportes",
  assignee_id: "0062",          // ID del empleado asignado
  assignee_name: "Juan Pérez",   // Nombre del empleado
  priority: "high",              // low, medium, high
  status: "proceso",             // tareas, asignadas, proceso, revision, realizadas
  due_date: "2024-12-31",       // Fecha límite
  comments: "Historial de comentarios...",
  created_by: "1771",           // ID del creador
  created_by_name: "Admin User", // Nombre del creador
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  updated_by: "0062",           // ID del último editor
  updated_by_name: "Juan Pérez" // Nombre del último editor
}
```

#### 3. Colección: `file_metadata`
```javascript
{
  id: "file_1234567890",        // ID único del archivo
  originalName: "documento.pdf", // Nombre original
  fileName: "task-123-2024-01-01-abc123.pdf", // Nombre en storage
  filePath: "tasks/123/documento.pdf", // Ruta en storage
  downloadURL: "https://...",    // URL de descarga
  size: 1024000,                // Tamaño en bytes
  type: "application/pdf",       // Tipo MIME
  uploadedAt: "2024-01-01T00:00:00.000Z",
  uploadedBy: "0062",           // ID del usuario que subió
  taskId: "123"                 // ID de la tarea asociada
}
```

#### 4. Colección: `punch_records`
```javascript
{
  employee_id: "0062",          // ID del empleado
  employee_name: "Juan Pérez",   // Nombre del empleado
  punch_type: "in",             // in, out
  timestamp: "2024-01-01T08:00:00.000Z",
  location: "Oficina Principal", // Ubicación del ponche
  device_id: "device_001",      // ID del dispositivo
  notes: "Entrada normal"       // Notas adicionales
}
```

### Índices de Firestore

#### firestore.indexes.json
```json
{
  "indexes": [
    {
      "collectionGroup": "employees",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "active",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "name",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "created_at",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "file_metadata",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "taskId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "uploadedAt",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

---

## 👥 Sistema de Roles y Permisos

### Roles Definidos

#### 1. Administradores
- **IDs**: `['0062', '1771']` (configurables en el código)
- **Permisos**:
  - Crear, editar y eliminar cualquier tarea
  - Mover tareas entre cualquier columna
  - Acceso al dashboard administrativo
  - Eliminar todas las tareas
  - Cambiar fechas límite de tareas
  - Reasignar tareas en cualquier estado

#### 2. Usuarios Regulares
- **Permisos**:
  - Crear nuevas tareas
  - Editar tareas asignadas a ellos
  - Mover sus tareas entre columnas (excepto de "Revisión" a "Realizadas")
  - Ver todas las tareas
  - Agregar comentarios a tareas asignadas

### Lógica de Permisos

```javascript
// Verificar si es administrador
function isAdmin() {
    return currentUser && ADMINISTRATORS.includes(currentUser.id);
}

// Verificar si puede editar una tarea
function canEditTask(task) {
    if (!currentUser) return false;
    if (isAdmin()) return true;
    return task.assigneeId === currentUser.id;
}

// Verificar si puede mover una tarea
function canMoveTask(task, targetColumn = null) {
    if (!currentUser) return false;
    if (task.column === 'revision' && targetColumn === 'realizadas') {
        return isAdmin();
    }
    if (isAdmin()) return true;
    if (task.column === 'realizadas') return false;
    return task.assigneeId === currentUser.id;
}
```

---

## 🎨 Estructura de la Interfaz

### Páginas Principales

#### 1. Login (index.html)
- Autenticación por ID de empleado
- Validación contra base de datos
- Redirección automática al taskboard

#### 2. TaskBoard (taskboard.html)
- Tablero Kanban con 5 columnas
- Sistema de drag & drop
- Modales para crear/editar tareas
- Sistema de comentarios con archivos
- Estadísticas en tiempo real

#### 3. Sistema de Ponche (ponche.html)
- Control de entrada/salida
- Historial de registros
- Dashboard administrativo
- Reportes de asistencia

### Componentes de UI

#### Modales
- **Modal de Nueva Tarea**: Formulario completo para crear tareas
- **Modal de Detalles**: Edición y visualización de tareas
- **Modal de Archivos**: Preview y gestión de archivos adjuntos

#### Notificaciones
- Sistema de notificaciones toast
- Indicadores de progreso
- Mensajes de error y éxito

#### Responsive Design
- Diseño adaptativo para móviles
- Grid system flexible
- Componentes optimizados para touch

---

## 📁 Gestión de Archivos

### Estructura de Storage

```
firebase-storage/
└── tasks/
    └── {taskId}/
        ├── {timestamp}-{randomId}.pdf
        ├── {timestamp}-{randomId}.jpg
        └── {timestamp}-{randomId}.docx
```

### Tipos de Archivo Soportados

- **Imágenes**: JPG, JPEG, PNG, GIF, WebP
- **Documentos**: PDF, DOC, DOCX
- **Hojas de Cálculo**: XLS, XLSX
- **Texto**: TXT, CSV
- **Comprimidos**: ZIP, RAR

### Límites de Archivo

- **Tamaño máximo**: 50MB por archivo
- **Formato de nombre**: `task-{taskId}-{timestamp}-{randomId}.{extension}`
- **Metadatos**: Incluyen información del usuario y timestamp

---

## 🔧 Configuración del Entorno de Desarrollo

### 1. Instalación de Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Inicialización del Proyecto

```bash
# Login a Firebase
firebase login

# Inicializar proyecto
firebase init

# Seleccionar servicios:
# - Firestore
# - Storage
# - Hosting
```

### 3. Configuración de Dependencias

#### package.json
```json
{
  "dependencies": {
    "firebase-admin": "^13.4.0"
  },
  "scripts": {
    "serve": "firebase serve",
    "deploy": "firebase deploy",
    "emulators": "firebase emulators:start"
  }
}
```

### 4. Variables de Entorno

Crear archivo `.env` (opcional para desarrollo local):
```env
FIREBASE_API_KEY=tu_api_key
FIREBASE_PROJECT_ID=tu_proyecto_id
FIREBASE_STORAGE_BUCKET=tu_bucket
```

---

## 🚀 Plan de Acción para Replicación

### Fase 1: Configuración Inicial (1-2 días)

#### 1.1 Crear Proyecto Firebase
- [ ] Crear nuevo proyecto en Firebase Console
- [ ] Habilitar servicios: Firestore, Storage, Hosting
- [ ] Configurar reglas de seguridad
- [ ] Obtener configuración del proyecto

#### 1.2 Configurar Entorno Local
- [ ] Instalar Firebase CLI
- [ ] Clonar o crear estructura de archivos
- [ ] Configurar firebase.json
- [ ] Inicializar proyecto con `firebase init`

#### 1.3 Preparar Archivos Base
- [ ] Copiar archivos HTML/CSS/JS
- [ ] Actualizar configuración Firebase en taskboard.js
- [ ] Configurar reglas de Firestore y Storage
- [ ] Probar conexión local

### Fase 2: Configuración de Datos (1 día)

#### 2.1 Crear Datos Iniciales
- [ ] Crear colección `employees` con datos de prueba
- [ ] Configurar administradores en el código
- [ ] Crear índices de Firestore
- [ ] Probar autenticación básica

#### 2.2 Configurar Storage
- [ ] Configurar reglas de Storage
- [ ] Probar subida de archivos
- [ ] Verificar permisos de lectura/escritura

### Fase 3: Desarrollo y Pruebas (3-5 días)

#### 3.1 Funcionalidades Core
- [ ] Sistema de autenticación
- [ ] CRUD de tareas
- [ ] Sistema de columnas Kanban
- [ ] Drag & drop funcional

#### 3.2 Funcionalidades Avanzadas
- [ ] Sistema de comentarios
- [ ] Subida y gestión de archivos
- [ ] Sistema de permisos
- [ ] Dashboard administrativo

#### 3.3 Pruebas y Optimización
- [ ] Pruebas de funcionalidad
- [ ] Pruebas de rendimiento
- [ ] Optimización de consultas
- [ ] Pruebas de seguridad

### Fase 4: Despliegue y Configuración Final (1-2 días)

#### 4.1 Despliegue a Producción
- [ ] Configurar dominio personalizado (opcional)
- [ ] Desplegar con `firebase deploy`
- [ ] Configurar variables de entorno
- [ ] Probar en producción

#### 4.2 Configuración de Seguridad
- [ ] Revisar y ajustar reglas de seguridad
- [ ] Configurar monitoreo
- [ ] Documentar credenciales
- [ ] Crear respaldos

### Fase 5: Mejoras y Optimizaciones (Ongoing)

#### 5.1 Mejoras de UX/UI
- [ ] Optimizar responsive design
- [ ] Mejorar accesibilidad
- [ ] Agregar animaciones
- [ ] Optimizar carga de archivos

#### 5.2 Funcionalidades Adicionales
- [ ] Sistema de notificaciones push
- [ ] Reportes avanzados
- [ ] Integración con calendario
- [ ] API REST para integraciones

---

## 🛠️ Comandos Útiles

### Desarrollo Local
```bash
# Servir aplicación localmente
firebase serve

# Iniciar emuladores
firebase emulators:start

# Ver logs
firebase functions:log
```

### Despliegue
```bash
# Desplegar todo
firebase deploy

# Desplegar solo hosting
firebase deploy --only hosting

# Desplegar solo firestore
firebase deploy --only firestore

# Desplegar solo storage
firebase deploy --only storage
```

### Gestión de Datos
```bash
# Exportar datos
firebase firestore:export ./backup

# Importar datos
firebase firestore:import ./backup

# Ver datos en tiempo real
firebase firestore:get
```

---

## 🔒 Consideraciones de Seguridad

### Reglas de Seguridad Recomendadas para Producción

#### Firestore Rules (Producción)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Función para verificar autenticación
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Función para verificar si es administrador
    function isAdmin() {
      return isAuthenticated() && 
             request.auth.token.admin == true;
    }
    
    // Tareas - Solo usuarios autenticados
    match /tasks/{taskId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
                   (resource.data.created_by == request.auth.uid || isAdmin());
      allow delete: if isAdmin();
    }
    
    // Empleados - Solo lectura para usuarios autenticados
    match /employees/{employeeId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

#### Storage Rules (Producción)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Función para verificar autenticación
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Archivos de tareas
    match /tasks/{taskId}/{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && 
                   request.resource.size < 50 * 1024 * 1024 &&
                   request.resource.contentType.matches('image/.*|application/pdf|application/vnd.ms-excel|application/vnd.openxmlformats-officedocument.spreadsheetml.sheet|application/msword|application/vnd.openxmlformats-officedocument.wordprocessingml.document|text/plain|text/csv');
    }
  }
}
```

---

## 📊 Monitoreo y Mantenimiento

### Métricas a Monitorear

#### Rendimiento
- Tiempo de carga de páginas
- Tiempo de respuesta de consultas Firestore
- Uso de Storage
- Número de conexiones simultáneas

#### Uso
- Número de usuarios activos
- Tareas creadas por día
- Archivos subidos
- Comentarios agregados

#### Errores
- Errores de autenticación
- Errores de permisos
- Errores de subida de archivos
- Errores de red

### Herramientas de Monitoreo

#### Firebase Console
- **Analytics**: Uso de la aplicación
- **Performance**: Rendimiento de la app
- **Crashlytics**: Reportes de errores
- **Firestore**: Métricas de base de datos

#### Logs Personalizados
```javascript
// Ejemplo de logging personalizado
function logUserAction(action, details) {
    console.log(`[${new Date().toISOString()}] User ${currentUser.id} performed ${action}:`, details);
    
    // Enviar a servicio de logging si es necesario
    if (window.gtag) {
        gtag('event', 'user_action', {
            'action': action,
            'user_id': currentUser.id,
            'details': details
        });
    }
}
```

---

## 🚨 Solución de Problemas Comunes

### Problemas de Autenticación

#### Error: "Usuario no autenticado"
```javascript
// Verificar configuración Firebase
console.log('Firebase Config:', firebaseConfig);

// Verificar conexión a Firestore
const testQuery = query(collection(db, "employees"), where("active", "==", true));
const testSnapshot = await getDocs(testQuery);
console.log('Firestore conectado:', testSnapshot.size);
```

#### Error: "Empleado no encontrado"
```javascript
// Verificar datos en Firestore
const employeeQuery = query(
    collection(db, "employees"), 
    where("employee_id", "==", employeeId),
    where("active", "==", true)
);
const employeeSnapshot = await getDocs(employeeQuery);
console.log('Empleado encontrado:', !employeeSnapshot.empty);
```

### Problemas de Archivos

#### Error de CORS
```javascript
// Solución: Usar Firebase Hosting
// Ejecutar: firebase serve
// Acceder a: http://localhost:5000
```

#### Error de Subida de Archivos
```javascript
// Verificar reglas de Storage
// Verificar tamaño de archivo (máximo 50MB)
// Verificar tipo de archivo permitido
```

### Problemas de Rendimiento

#### Consultas Lentas
```javascript
// Usar índices compuestos
// Limitar resultados con limit()
// Usar where() para filtrar
```

#### Carga Lenta de Archivos
```javascript
// Implementar lazy loading
// Comprimir imágenes
// Usar CDN para archivos estáticos
```

---

## 📚 Recursos Adicionales

### Documentación Oficial
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)

### Herramientas de Desarrollo
- [Firebase CLI](https://firebase.google.com/docs/cli)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Firebase Extensions](https://firebase.google.com/docs/extensions)

### Mejores Prácticas
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase Performance](https://firebase.google.com/docs/perf-mon)
- [Firebase Analytics](https://firebase.google.com/docs/analytics)

---

## 🎯 Checklist de Replicación

### ✅ Configuración Inicial
- [ ] Proyecto Firebase creado
- [ ] Servicios habilitados (Firestore, Storage, Hosting)
- [ ] Firebase CLI instalado
- [ ] Proyecto inicializado localmente

### ✅ Configuración de Archivos
- [ ] firebase.json configurado
- [ ] Reglas de Firestore aplicadas
- [ ] Reglas de Storage aplicadas
- [ ] Configuración Firebase en taskboard.js actualizada

### ✅ Datos Iniciales
- [ ] Colección employees creada
- [ ] Administradores configurados
- [ ] Índices de Firestore creados
- [ ] Datos de prueba cargados

### ✅ Funcionalidades Core
- [ ] Autenticación funcionando
- [ ] CRUD de tareas operativo
- [ ] Sistema de columnas funcionando
- [ ] Drag & drop implementado

### ✅ Funcionalidades Avanzadas
- [ ] Sistema de comentarios
- [ ] Subida de archivos
- [ ] Sistema de permisos
- [ ] Dashboard administrativo

### ✅ Pruebas y Despliegue
- [ ] Pruebas locales completadas
- [ ] Despliegue a producción
- [ ] Pruebas en producción
- [ ] Documentación actualizada

---

## 📞 Soporte y Contacto

### Para Dudas Técnicas
- Revisar documentación oficial de Firebase
- Consultar logs de la aplicación
- Verificar configuración de reglas de seguridad

### Para Mejoras y Nuevas Funcionalidades
- Crear issues en el repositorio del proyecto
- Documentar nuevas funcionalidades
- Mantener compatibilidad con versiones anteriores

---

**🎉 ¡Felicitaciones! Tu TaskBoard ITLA está listo para usar.**

*Esta guía te proporciona toda la información necesaria para replicar y mejorar la aplicación. Recuerda mantener actualizada la documentación y seguir las mejores prácticas de desarrollo.* 