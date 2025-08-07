// ===================================================================
// FUNCIONES AUXILIARES
// ===================================================================

// Función para escapar HTML
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Función para formatear el tamaño del archivo
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para obtener el icono del archivo según su tipo
export function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('text')) return '📄';
    return '📎';
}

// Función para agregar comentario a la historia
export function addCommentToHistory(existingComments, newComment, userInfo = null) {
    if (!newComment || newComment.trim() === '') {
        return existingComments;
    }
    
    const now = new Date();
    const timestamp = now.toLocaleString('es-ES', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
    
    // Usar información del usuario actual o la proporcionada
    const user = userInfo || window.currentUser;
    const userName = user ? user.name : 'Usuario';
    const userId = user ? user.id : '';
    
    const formattedComment = `[${timestamp} - ${userName} (${userId})] ${newComment.trim()}`;
    
    if (!existingComments || existingComments.trim() === '') {
        return formattedComment;
    }
    
    return existingComments + '\n' + formattedComment;
}

// Función para mostrar notificación
export function showNotification(message, type = 'info') {
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

// Función para mostrar indicador de progreso
export function showProgressIndicator(message = 'Procesando...') {
    const indicator = document.getElementById('progressIndicator') || createProgressIndicator();
    const messageEl = indicator.querySelector('.progress-message');
    if (messageEl) {
        messageEl.textContent = message;
    }
    indicator.style.display = 'flex';
}

// Función para ocultar indicador de progreso
export function hideProgressIndicator() {
    const indicator = document.getElementById('progressIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Función para crear indicador de progreso
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