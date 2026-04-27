# Mi Primera Billetera

Este es un proyecto que consta de un backend (API) y un frontend (interfaz de usuario). Sigue las instrucciones a continuación para iniciar ambos servicios localmente.

## Requisitos previos

- Tener [Node.js](https://nodejs.org/) instalado en tu computadora.
- (Opcional) Una base de datos SQLite (el backend la generará y gestionará de manera automática en la mayoría de los casos).

---

## 1. Cómo iniciar el Backend

El backend está construido con Node.js y Express, utilizando una base de datos SQLite.

1. Abre una terminal.
2. Navega a la carpeta del backend:
   ```bash
   cd backend
   ```
3. Instala las dependencias del proyecto (solo la primera vez):
   ```bash
   npm install
   ```
4. Inicia el servidor:
   ```bash
   node server.js
   ```
El backend estará ejecutándose y escuchando peticiones (por lo general en `http://localhost:3000` o el puerto configurado en el código).

---

## 2. Cómo iniciar el Frontend

El frontend está construido con Vue.js y Vite.

1. Abre una **nueva** terminal (mantén la del backend abierta y ejecutándose).
2. Navega a la carpeta del frontend:
   ```bash
   cd frontend
   ```
3. Instala las dependencias del proyecto (solo la primera vez):
   ```bash
   npm install
   ```
4. Inicia el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
5. Vite te mostrará en la terminal una URL local (usualmente `http://localhost:5173`). Haz clic o ábrela en tu navegador para ver la aplicación funcionando.

---

## Notas adicionales

- Asegúrate de iniciar el **backend primero** para que el frontend pueda comunicarse correctamente con la API desde el primer momento.
- Si instalas nuevas dependencias en el futuro, recuerda detener los servidores y volver a ejecutar `npm install` en la carpeta correspondiente.
