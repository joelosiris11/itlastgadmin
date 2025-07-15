# FIREBASE_RULES_BASE.md

## Reglas y recomendaciones para migrar la seguridad del proyecto a Firebase

### 1. Firestore Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Tareas
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
    // Historial de tareas
    match /task_history/{historyId} {
      allow read, write: if request.auth != null;
    }
    // Comentarios (si se usa colección separada)
    match /comments/{commentId} {
      allow read, write: if request.auth != null;
    }
    // Empleados
    match /employees/{employeeId} {
      allow read, write: if request.auth != null;
    }
    // Registros de ponche
    match /punch_records/{recordId} {
      allow read, write: if request.auth != null;
    }
    // (Agrega aquí otras colecciones necesarias)
  }
}
```

### 2. Realtime Database Rules (`database.rules.json`)
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

### 3. Storage Rules (`storage.rules`)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Solo archivos bajo 'tasks/' y autenticados
    match /tasks/{taskId}/{allPaths=**} {
      allow read, write: if request.auth != null
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
  }
}
```

---

## Recomendaciones
- Actualiza los nombres de colección/ruta si cambian en tu modelo Firebase.
- Si necesitas roles (admin/usuario), usa custom claims en Auth y agrega condiciones en las reglas.
- Para Storage, los archivos deben subirse bajo la ruta `tasks/{taskId}/archivo`.
- Revisa y adapta las reglas si agregas nuevas colecciones o flujos.
- Antes de desplegar, valida las reglas en la consola de Firebase.

---

**Este documento es una base inicial. Personalízalo según la evolución de tu app y tus necesidades de seguridad.** 