---
trigger: always_on
---

ARQUITECTURA GENERAL
La aplicación debe seguir una arquitectura cliente-servidor desacoplada.
Se debe separar claramente:
Frontend (HTML, CSS, JavaScript)
Backend en Python (Flask)
Base de datos en la nube
Integración con Fortinet

El sistema debe ser desplegable en AWS y permitir escalabilidad futura.

ORGANIZACIÓN DEL CÓDIGO
El proyecto debe estructurarse en módulos separados para mantener orden y claridad:

project/

frontend/
backend/
database/
logs/
docs/

Dentro del backend se debe separar:

rutas (routes)
lógica (services)
modelos (models)
utilidades (utils)

No se debe mezclar lógica de negocio con presentación.

DOCUMENTACIÓN
El proyecto debe estar completamente documentado.
Debe incluir:
README general
Descripción de cada módulo
Diagrama de arquitectura
Flujo de datos

Cada componente debe tener una explicación clara de su función.

BACKEND
El backend debe:
Exponer una API REST (/api/)
Manejar toda la lógica del sistema
Procesar datos de syslog
Comunicarse con el Fortinet

Se debe evitar lógica compleja en el frontend.

FRONTEND
El frontend debe:
Consumir la API del backend
No contener lógica crítica
Mostrar datos reales (no simulados)
Manejar estados de carga, éxito y error

Se recomienda el uso de fetch() o Axios.

INTEGRACIÓN CON FORTINET
Toda acción sobre el dispositivo debe pasar por el backend.
Se debe utilizar la API REST del Fortinet con autenticación segura.

Acciones mínimas requeridas:

Consultar estado de interfaces
Encender interfaces (UP)
Apagar interfaces (DOWN)

Está prohibido exponer credenciales en el frontend.

SYSLOG Y MONITOREO
El sistema debe recibir logs desde Fortinet mediante syslog.
Los logs deben:
Ser recibidos en AWS
Procesarse automáticamente
Almacenarse en base de datos

Los datos deben incluir:

Fecha
IP origen
Evento
Nivel de severidad
BASE DE DATOS
Se debe utilizar una base de datos en la nube.
Tablas mínimas:
logs
interfaces
historial de acciones
usuarios

Se debe mantener una estructura organizada y optimizada.

SEGURIDAD
El sistema debe implementar:
HTTPS
Autenticación segura
Validación de entradas

No se deben almacenar contraseñas en texto plano.
Se deben validar permisos antes de ejecutar acciones críticas.

DESPLIEGUE
El sistema debe ser desplegado en AWS utilizando:
EC2 para backend
RDS para base de datos

Se recomienda conexión segura con Fortinet mediante VPN.

PRUEBAS
Se deben realizar pruebas de:
API
Acciones sobre interfaces
Recepción de logs

También se deben considerar escenarios de error y seguridad.

ESCALABILIDAD
El sistema debe permitir agregar nuevas funcionalidades como:
Gestión de VPN
Reglas de firewall
Sistema de alertas
Gestión de usuarios y roles
CÓDIGO LIMPIO
El código debe:
Ser claro y legible
Tener nombres descriptivos
Evitar funciones largas
Reutilizar lógica
CONTROL DE VERSIONES
Se debe utilizar Git para control de versiones.
Los commits deben ser claros y descriptivos, por ejemplo:
feat: agregar monitoreo de tráfico
fix: corregir error en API

RESULTADO ESPERADO
El proyecto debe ser:

Ordenado
Escalable
Seguro
Profesional
Fácil de mantener