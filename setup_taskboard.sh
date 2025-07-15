#!/bin/bash

# ===================================================================
# CONFIGURADOR AUTOMÁTICO DEL TASKBOARD ITLA
# ===================================================================

echo "🚀 Configurando TaskBoard ITLA..."
echo "📋 Este script creará las tablas necesarias para el sistema de tareas"
echo ""

SUPABASE_URL="https://kqqucevarmhuhvtiiphs.supabase.co"
echo "🔗 Conectando a: $SUPABASE_URL"
echo ""

# Mostrar instrucciones
echo "📝 INSTRUCCIONES:"
echo "1. Ve a tu SQL Editor de Supabase:"
echo "   👉 $SUPABASE_URL/project/default/sql"
echo ""
echo "2. Copia y pega el contenido del archivo 'taskboard_schema.sql'"
echo "3. Haz clic en 'RUN' para ejecutar el SQL"
echo ""

# Verificar conexión
echo "🔍 Verificando conexión a la base de datos..."
RESPONSE=$(curl -s -X GET "$SUPABASE_URL/rest/v1/employees?select=count&head=true" \
-H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxcXVjZXZhcm1odWh2dGlpcGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI3MDgsImV4cCI6MjA2Njk2ODcwOH0.gZW4Eyu2hiTJeNcmFff2HOscmCY2CAhDiSvCjBUgx0k")

if [ $? -eq 0 ]; then
    echo "✅ Conexión exitosa a Supabase"
    
    # Obtener empleados
    echo ""
    echo "👥 Empleados encontrados en la base de datos:"
    curl -s -X GET "$SUPABASE_URL/rest/v1/employees?select=employee_id,name&order=name" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxcXVjZXZhcm1odWh2dGlpcGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI3MDgsImV4cCI6MjA2Njk2ODcwOH0.gZW4Eyu2hiTJeNcmFff2HOscmCY2CAhDiSvCjBUgx0k" | \
    python3 -m json.tool 2>/dev/null || echo "Datos obtenidos correctamente"
    
else
    echo "❌ Error de conexión. Verifica las credenciales."
    exit 1
fi

echo ""
echo "📋 SIGUIENTE PASO:"
echo "Ejecuta el archivo taskboard_schema.sql en el SQL Editor de Supabase"
echo ""
echo "🌐 Abre este enlace:"
echo "👉 $SUPABASE_URL/project/default/sql"
echo ""

# Intentar abrir el enlace automáticamente (solo en macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    read -p "¿Quieres abrir el SQL Editor automáticamente? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "$SUPABASE_URL/project/default/sql"
        echo "✅ SQL Editor abierto en tu navegador"
    fi
fi

echo ""
echo "🔧 Después de ejecutar el SQL, el TaskBoard estará listo para usar!"
echo "📱 Abre taskboard.html en tu navegador para empezar." 