# Documento de Requerimientos Sistema de Monitoreo y Administración de Fortinet en AWS

# **1\. Introducción**

Este documento describe los requerimientos para una aplicación web orientada al monitoreo y administración de dispositivos Fortinet. La solución estará basada en una arquitectura en la nube utilizando AWS, integrando syslog para la recolección de eventos y una base de datos para almacenamiento centralizado.

# **2\. Objetivos**

\- Monitorear tráfico de red en tiempo real.

\- Administrar interfaces del Fortinet (UP/DOWN).

\- Centralizar logs y eventos en la nube.

\- Visualizar información mediante dashboard web.

# **3\. Requerimientos Funcionales**

## **3.1 Autenticación**

\- Inicio de sesión seguro.

\- Gestión de sesiones desde backend.

## **3.2 Monitoreo mediante Syslog**

\- Recepción de logs desde Fortinet vía syslog.

\- Procesamiento de logs en servidor AWS.

\- Almacenamiento en base de datos.

\- Visualización de tráfico y eventos relevantes.

## **3.3 Administración del Fortinet**

\- Encendido y apagado de interfaces.

\- Comunicación mediante API REST del Fortinet.

\- Validación de acciones antes de ejecución.

## **3.4 Visualización**

\- Dashboard web interactivo.

\- Visualización de estado de interfaces.

\- Integración con frontend existente.

# **4\. Requerimientos No Funcionales**

\- Seguridad (HTTPS, autenticación, tokens).

\- Escalabilidad en la nube (AWS).

\- Alta disponibilidad.

\- Rendimiento para procesamiento de logs.

# **5\. Arquitectura del Sistema**

La arquitectura estará basada en AWS, incluyendo:  
\- Servidor backend (EC2) ejecutando Python/Flask.  
\- Recepción de logs mediante syslog.  
\- Base de datos en la nube (RDS u otra).  
\- Comunicación con Fortinet mediante API.  
\- Frontend consumiendo datos desde el backend.

# **6\. Flujo de Datos**

1\. Fortinet envía logs vía syslog hacia AWS.  
2\. El servidor procesa los logs.  
3\. Se almacenan en base de datos.  
4\. El backend expone los datos mediante API.  
5\. El frontend muestra la información al usuario.  
6\. El usuario puede ejecutar acciones sobre el Fortinet.

# **7\. Despliegue**

La solución será desplegada en AWS utilizando servicios como EC2 para backend y RDS para base de datos. Se recomienda el uso de VPN para conexión segura con el Fortinet.