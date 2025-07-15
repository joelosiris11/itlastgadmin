const admin = require("firebase-admin");
const data = require("./taskboard_data.json");

// Cambia la ruta a tu archivo de credenciales
const serviceAccount = require("./itlastg25-firebase-adminsdk-fbsvc-7a614fe161.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importEmployees() {
  const batch = db.batch();
  data.employees.forEach(emp => {
    const ref = db.collection("employees").doc(emp.employee_id);
    batch.set(ref, emp);
  });
  await batch.commit();
  console.log("Empleados importados.");
}

async function importTasks() {
  for (const task of data.tasks) {
    const taskRef = db.collection("tasks").doc(task.task_id);
    const { comments, files, ...taskData } = task;
    await taskRef.set(taskData);

    // Subcolección de comentarios
    if (comments && comments.length > 0) {
      for (const comment of comments) {
        await taskRef.collection("comments").doc(comment.comment_id).set(comment);
      }
    }

    // Subcolección de archivos
    if (files && files.length > 0) {
      for (const file of files) {
        await taskRef.collection("files").doc(file.file_id).set(file);
      }
    }
  }
  console.log("Tareas, comentarios y archivos importados.");
}

async function main() {
  await importEmployees();
  await importTasks();
  console.log("¡Importación completa!");
}

main().catch(console.error); 