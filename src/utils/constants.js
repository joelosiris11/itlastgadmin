// ===================================================================
// CONSTANTES DEL PROYECTO
// ===================================================================

// Administradores del sistema
export const ADMINISTRATORS = ['0062', '1771'];

// Estados de las tareas
export const TASK_STATUS = {
  TAREAS: 'tareas',
  ASIGNADAS: 'asignadas',
  PROCESO: 'proceso',
  REVISION: 'revision',
  REALIZADAS: 'realizadas'
};

// Prioridades de las tareas
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

// Nombres de columnas para mostrar
export const COLUMN_DISPLAY_NAMES = {
  'tareas': 'Tareas',
  'asignadas': 'Asignadas',
  'proceso': 'En Proceso',
  'revision': 'Revisión',
  'realizadas': 'Realizadas'
};

// Nombres de prioridades para mostrar
export const PRIORITY_DISPLAY_NAMES = {
  'low': 'Baja',
  'medium': 'Media',
  'high': 'Alta'
};

// Estados vacíos por columna
export const EMPTY_STATES = {
  'tareas': { icon: '📝', text: 'No hay tareas nuevas', subtext: 'Haz clic en "Nueva Tarea" para empezar' },
  'asignadas': { icon: '👥', text: 'No hay tareas asignadas', subtext: 'Las tareas se moverán aquí automáticamente' },
  'proceso': { icon: '⚙️', text: 'No hay tareas en proceso', subtext: 'Arrastra tareas aquí cuando empiecen' },
  'revision': { icon: '🔎', text: 'No hay tareas en revisión', subtext: 'Tareas listas para revisar aparecerán aquí' },
  'realizadas': { icon: '🎉', text: 'No hay tareas completadas', subtext: 'Las tareas finalizadas aparecerán aquí' }
}; 