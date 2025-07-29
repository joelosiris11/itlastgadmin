# 📋 Índice del Proyecto - ITLA Santiago Sistema Administrativo

## 🏗️ **Arquitectura del Sistema**

Este proyecto es un **sistema administrativo completo** para ITLA Santiago que utiliza **Firebase** como backend y **HTML/CSS/JavaScript** para el frontend. El sistema incluye múltiples módulos interconectados.

### **Stack Tecnológico**
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Firebase (Firestore, Storage, Authentication)
- **Base de Datos:** Firestore (NoSQL)
- **Almacenamiento:** Firebase Storage
- **Autenticación:** Firebase Auth
- **Dependencias:** firebase-admin (Node.js)

---

## 📁 **Estructura de Archivos**

### **🎯 Archivos Principales (Aplicaciones Web)**

#### **1. `index.html`** - Portal de Acceso Principal
- **Propósito:** Página de login/autenticación del sistema
- **Características:**
  - Diseño moderno con gradientes animados
  - Sistema de autenticación con Firebase
  - Interfaz responsive y accesible
  - Animaciones CSS avanzadas
- **Funcionalidades:**
  - Login de usuarios
  - Validación de credenciales
  - Redirección a módulos específicos

#### **2. `dashboard.html`** - Panel de Control Principal
- **Propósito:** Dashboard administrativo con sistema de ponche
- **Características:**
  - Integración con Supabase para datos
  - Interfaz moderna con efectos glassmorphism
  - Sistema de tarjetas informativas
  - Gráficos y estadísticas en tiempo real
- **Funcionalidades:**
  - Control de asistencia
  - Gestión de empleados
  - Reportes y estadísticas
  - Sistema de notificaciones

#### **3. `taskboard.html`** - Gestión de Tareas
- **Propósito:** Sistema de gestión de tareas tipo Kanban
- **Características:**
  - Interfaz tipo Trello/Jira
  - Drag & drop para tareas
  - Sistema de comentarios con archivos adjuntos
  - Categorización por estados
- **Funcionalidades:**
  - Crear, editar, eliminar tareas
  - Asignar responsables
  - Adjuntar archivos y evidencias
  - Sistema de comentarios
  - Filtros y búsqueda

#### **4. `ponche.html`** - Sistema de Control de Asistencia
- **Propósito:** Registro de entrada/salida de empleados
- **Características:**
  - Interfaz optimizada para dispositivos móviles
  - Lectura de códigos QR
  - Geolocalización
  - Validación de horarios
- **Funcionalidades:**
  - Registro de entrada/salida
  - Validación de ubicación
  - Reportes de asistencia
  - Notificaciones en tiempo real

#### **5. `auto_configurador.html`** - Configuración Automática
- **Propósito:** Herramienta de configuración del sistema
- **Características:**
  - Setup automático de Firebase
  - Configuración de reglas de seguridad
  - Importación de datos iniciales
- **Funcionalidades:**
  - Configuración de proyecto Firebase
  - Importación de datos de prueba
  - Validación de configuración

### **🔧 Archivos de Configuración**

#### **6. `firebase.json`** - Configuración de Firebase
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
  }
}
```

#### **7. `firestore.rules`** - Reglas de Seguridad Firestore
- **Propósito:** Definir permisos de acceso a la base de datos
- **Contenido:** Reglas de autenticación y autorización
- **Seguridad:** Control de acceso por roles y usuarios

#### **8. `firestore.indexes.json`** - Índices de Firestore
- **Propósito:** Optimizar consultas de la base de datos
- **Contenido:** Definición de índices compuestos
- **Rendimiento:** Mejora velocidad de consultas complejas

#### **9. `storage.rules`** - Reglas de Almacenamiento
- **Propósito:** Controlar acceso a archivos en Firebase Storage
- **Contenido:** Permisos para subida/descarga de archivos
- **Seguridad:** Validación de tipos y tamaños de archivo

### **📦 Archivos de Dependencias**

#### **10. `package.json`** - Gestión de Dependencias
```json
{
  "dependencies": {
    "firebase-admin": "^13.4.0"
  }
}
```

#### **11. `package-lock.json`** - Lock de Versiones
- **Propósito:** Asegurar versiones exactas de dependencias
- **Contenido:** Árbol de dependencias completo

### **🔄 Archivos de Scripts y Utilidades**

#### **12. `taskboard.js`** - Lógica Principal del TaskBoard
- **Tamaño:** 108KB, 2732 líneas
- **Propósito:** Funcionalidad completa del sistema de tareas
- **Características:**
  - Gestión de estado de tareas
  - Integración con Firebase
  - Sistema de drag & drop
  - Manejo de archivos adjuntos

#### **13. `import_taskboard_data.js`** - Importador de Datos
- **Propósito:** Script para importar datos iniciales
- **Funcionalidades:**
  - Carga de datos de prueba
  - Configuración inicial de tareas
  - Validación de estructura de datos

#### **14. `setup_taskboard.sh`** - Script de Configuración
- **Propósito:** Automatizar la configuración del proyecto
- **Funcionalidades:**
  - Instalación de dependencias
  - Configuración de Firebase
  - Deploy automático

### **📊 Archivos de Datos**

#### **15. `taskboard_data.json`** - Datos de Prueba
- **Propósito:** Datos iniciales para el sistema de tareas
- **Contenido:** Tareas de ejemplo, usuarios, comentarios
- **Uso:** Desarrollo y pruebas

### **🎨 Recursos Visuales**

#### **16. `logo.png`** - Logo del Sistema
- **Tamaño:** 205KB
- **Propósito:** Identidad visual del sistema
- **Uso:** Headers y páginas de login

### **📚 Documentación**

#### **17. `EVIDENCIAS_ARCHIVOS.md`** - Documentación de Sistema de Archivos
- **Propósito:** Documentar el sistema de adjuntar archivos
- **Contenido:**
  - Funcionalidades implementadas
  - Formatos soportados
  - Instrucciones de uso
  - Detalles técnicos

#### **18. `FIREBASE_RULES_BASE.md`** - Base de Reglas Firebase
- **Propósito:** Documentar reglas de seguridad base
- **Contenido:** Plantillas de reglas para diferentes módulos

### **🔒 Archivos de Control de Versión**

#### **19. `.gitignore`** - Archivos Ignorados
- **Propósito:** Excluir archivos del control de versiones
- **Contenido:** node_modules, archivos temporales, configuraciones locales

#### **20. `.firebaserc`** - Configuración de Proyecto Firebase
- **Propósito:** Identificar el proyecto Firebase
- **Contenido:** ID del proyecto y configuración de alias

---

## 🔄 **Flujo de Datos del Sistema**

### **1. Autenticación (`index.html`)**
```
Usuario → Login → Firebase Auth → Redirección a módulo
```

### **2. Dashboard (`dashboard.html`)**
```
Supabase → Datos en tiempo real → UI → Reportes
```

### **3. TaskBoard (`taskboard.html` + `taskboard.js`)**
```
Usuario → Crear/Editar Tarea → Firebase Firestore → UI Update
```

### **4. Sistema de Archivos**
```
Archivo → Base64 → localStorage → Preview → Descarga
```

---

## 🚀 **Instalación y Configuración**

### **Requisitos Previos**
- Node.js (para firebase-admin)
- Cuenta de Firebase
- Navegador moderno

### **Pasos de Instalación**
1. **Clonar repositorio**
2. **Instalar dependencias:** `npm install`
3. **Configurar Firebase:** Usar `auto_configurador.html`
4. **Importar datos:** Ejecutar `import_taskboard_data.js`
5. **Deploy:** Usar `setup_taskboard.sh`

---

## 🎯 **Módulos del Sistema**

### **📊 Dashboard Administrativo**
- Control de asistencia
- Estadísticas en tiempo real
- Gestión de empleados
- Reportes automáticos

### **📋 TaskBoard (Gestión de Tareas)**
- Sistema Kanban completo
- Adjuntar archivos y evidencias
- Sistema de comentarios
- Asignación de responsables

### **⏰ Sistema de Ponche**
- Registro de entrada/salida
- Geolocalización
- Validación de horarios
- Reportes de asistencia

### **🔧 Configuración Automática**
- Setup de Firebase
- Importación de datos
- Validación de configuración

---

## 🔒 **Seguridad y Permisos**

### **Firestore Rules**
- Autenticación requerida
- Control de acceso por roles
- Validación de datos

### **Storage Rules**
- Control de tipos de archivo
- Límites de tamaño
- Permisos por usuario

---

## 📱 **Compatibilidad**

### **Navegadores Soportados**
- Chrome (recomendado)
- Firefox
- Safari
- Edge

### **Dispositivos**
- Desktop (1920x1080+)
- Tablet (768px+)
- Mobile (320px+)

---

## 🔮 **Próximas Mejoras**

### **Corto Plazo**
- [ ] Migración completa a Supabase Storage
- [ ] Sistema de notificaciones push
- [ ] Exportación de reportes a PDF

### **Mediano Plazo**
- [ ] App móvil nativa
- [ ] Integración con sistemas externos
- [ ] Dashboard analítico avanzado

### **Largo Plazo**
- [ ] IA para análisis de productividad
- [ ] Integración con calendarios
- [ ] Sistema de métricas avanzadas

---

## 📞 **Soporte y Contacto**

Para soporte técnico o consultas sobre el sistema, contactar al equipo de desarrollo de ITLA Santiago.

---

*Última actualización: Diciembre 2024*
*Versión del sistema: 1.0.0* 