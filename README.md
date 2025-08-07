# 📋 TaskBoard ITLA - Sistema de Gestión de Tareas

## 🎯 Descripción

**TaskBoard ITLA** es una aplicación web de gestión de tareas desarrollada para el Instituto Tecnológico de Las Américas (ITLA). Permite a los empleados crear, asignar, gestionar y dar seguimiento a tareas en un entorno colaborativo con sistema de roles y permisos.

## 🚀 Características Principales

- **Sistema de Autenticación**: Basado en Firebase Auth con roles de usuario y administrador
- **Gestión de Tareas**: Creación, edición, asignación y seguimiento de tareas
- **Sistema de Columnas**: Kanban board con estados: Tareas, Asignadas, En Proceso, Revisión, Realizadas
- **Subida de Archivos**: Integración con Firebase Storage para adjuntar documentos
- **Sistema de Comentarios**: Historial de comentarios con timestamps
- **Dashboard Administrativo**: Panel de control para administradores
- **Sistema de Ponche**: Control de entrada/salida de empleados
- **Responsive Design**: Interfaz adaptativa para diferentes dispositivos

## 🏗️ Arquitectura del Proyecto

### Estructura de Carpetas

```
itlastgadmin/
├── 📁 src/                          # Código fuente modular
│   ├── 📁 services/                 # Servicios de Firebase
│   │   ├── auth.js                  # Autenticación
│   │   ├── tasks.js                 # Gestión de tareas
│   │   ├── employees.js             # Gestión de empleados
│   │   └── files.js                 # Gestión de archivos
│   ├── 📁 utils/                    # Utilidades y helpers
│   │   ├── constants.js             # Constantes del proyecto
│   │   ├── helpers.js               # Funciones auxiliares
│   │   └── permissions.js           # Lógica de permisos
│   ├── 📁 components/               # Componentes UI (futuro)
│   └── 📁 styles/                   # Estilos (futuro)
├── 📁 config/                       # Configuración
│   └── firebase.js                  # Configuración de Firebase
├── 📁 public/                       # Archivos públicos
│   ├── index.html                   # Página de login
│   ├── taskboard.html               # Tablero principal
│   ├── ponche.html                  # Sistema de ponche
│   └── taskboard.js                 # Código principal (legacy)
├── 📁 docs/                         # Documentación
│   └── GUIA_REPLICACION_PROYECTO.md # Guía completa
└── 📁 configuración/                # Archivos de configuración Firebase
    ├── firebase.json
    ├── firestore.rules
    ├── storage.rules
    └── firestore.indexes.json
```

## 🔧 Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Firestore, Storage, Hosting)
- **Autenticación**: Firebase Auth
- **Base de Datos**: Firestore (NoSQL)
- **Almacenamiento**: Firebase Storage
- **Despliegue**: Firebase Hosting

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js (versión 14 o superior)
- Firebase CLI
- Cuenta de Firebase

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/joelosiris11/itlastgadmin.git
   cd itlastgadmin
   ```

2. **Instalar Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

3. **Login a Firebase**
   ```bash
   firebase login
   ```

4. **Inicializar proyecto**
   ```bash
   firebase init
   ```

5. **Configurar Firebase**
   - Habilitar Firestore, Storage y Hosting
   - Configurar reglas de seguridad
   - Actualizar configuración en `config/firebase.js`

6. **Desplegar**
   ```bash
   firebase deploy
   ```

## 📖 Uso

### Acceso a la Aplicación

1. Abrir la URL desplegada
2. Ingresar con ID de empleado
3. Comenzar a gestionar tareas

### Roles de Usuario

#### Administradores
- Crear, editar y eliminar cualquier tarea
- Mover tareas entre cualquier columna
- Acceso al dashboard administrativo
- Eliminar todas las tareas

#### Usuarios Regulares
- Crear nuevas tareas
- Editar tareas asignadas a ellos
- Mover sus tareas entre columnas
- Ver todas las tareas

## 🔄 Mejoras Implementadas

### ✅ Problemas Resueltos

1. **Eliminación de Recargas de Página**
   - Actualización reactiva del estado
   - Eventos personalizados para actualizaciones
   - Feedback inmediato en drag & drop

2. **Arquitectura Modular**
   - Separación de responsabilidades
   - Código más mantenible
   - Reutilización de componentes

3. **Mejor Gestión de Estado**
   - Estado centralizado
   - Actualizaciones reactivas
   - Mejor performance

### 🚧 Mejoras Futuras

- [ ] Componentes UI reutilizables
- [ ] Sistema de notificaciones push
- [ ] Reportes avanzados
- [ ] Integración con calendario
- [ ] API REST para integraciones

## 🛠️ Desarrollo

### Comandos Útiles

```bash
# Servir aplicación localmente
firebase serve

# Desplegar a producción
firebase deploy

# Ver logs
firebase functions:log

# Emuladores
firebase emulators:start
```

### Estructura de Desarrollo

- **`src/`**: Código fuente modular
- **`config/`**: Configuración de servicios
- **`public/`**: Archivos estáticos
- **`docs/`**: Documentación

## 📊 Monitoreo

### Métricas Importantes

- Tiempo de carga de páginas
- Tiempo de respuesta de consultas Firestore
- Uso de Storage
- Número de usuarios activos

### Herramientas de Monitoreo

- Firebase Console
- Firebase Analytics
- Firebase Performance
- Firebase Crashlytics

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas:

- Revisar la documentación en `docs/`
- Crear un issue en GitHub
- Contactar al equipo de desarrollo

## 🎉 Agradecimientos

- Equipo de ITLA por el apoyo
- Comunidad de Firebase por las herramientas
- Contribuidores del proyecto

---

**Desarrollado con ❤️ para ITLA** 