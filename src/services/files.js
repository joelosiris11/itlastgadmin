// ===================================================================
// SERVICIOS DE ARCHIVOS
// ===================================================================
import { storage, db } from '../../config/firebase.js';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";
import { collection, query, where, getDocs, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { showNotification, formatFileSize } from '../utils/helpers.js';

// Función para subir archivos
export async function uploadFiles(files, taskId) {
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
                        'uploadedBy': window.currentUser.id,
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
                    uploadedBy: window.currentUser.id
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

// Función para obtener archivo desde Firestore
export async function getFileFromFirestore(fileId) {
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

// Función para descargar archivo
export async function downloadFile(fileId) {
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

// Función para eliminar archivo de comentario
export async function deleteFileFromComment(fileId, taskId) {
    if (!confirm('¿Estás seguro de que quieres borrar este archivo y su comentario?')) {
        return;
    }
    
    try {
        showNotification('Borrando archivo...', 'info');
        
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
        
        showNotification('Archivo borrado correctamente', 'success');
        
    } catch (error) {
        console.error('Error al borrar archivo:', error);
        showNotification('Error al borrar el archivo: ' + error.message, 'error');
    }
}

// Función para obtener archivo (alias para compatibilidad)
export async function getFileFromStorage(fileId) {
    return await getFileFromFirestore(fileId);
} 