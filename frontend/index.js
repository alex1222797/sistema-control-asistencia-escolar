/* =====================================================================
   Sistema de Control de Asistencia Escolar
   index.js
===================================================================== */

const API_BASE = "http://localhost:8000";

/* ===================== ELEMENTOS ===================== */
const screenLogin = document.getElementById("screen-login");
const app = document.getElementById("app");
const formLogin = document.getElementById("form-login");
const formRegister = document.getElementById("form-register");
const btnShowRegister = document.getElementById("btn-show-register");
const btnShowLogin = document.getElementById("btn-show-login");
const loginError = document.getElementById("login-error");
const registerError = document.getElementById("register-error");
const registerSuccess = document.getElementById("register-success");

/* ===================== SESIÓN ===================== */
let token = localStorage.getItem("scae_token");
let docente = JSON.parse(localStorage.getItem("scae_docente") || "null");

function mostrarError(elemento, mensaje) {
    if (!elemento) return;
    elemento.textContent = mensaje;
    elemento.hidden = false;
}

function ocultarElemento(elemento) {
    if (elemento) elemento.hidden = true;
}

function mostrarLogin() {
    if (formLogin) formLogin.hidden = false;
    if (formRegister) formRegister.hidden = true;
    ocultarElemento(loginError);
    ocultarElemento(registerError);
    ocultarElemento(registerSuccess);
}

function mostrarRegistro() {
    if (formLogin) formLogin.hidden = true;
    if (formRegister) formRegister.hidden = false;
    ocultarElemento(loginError);
    ocultarElemento(registerError);
    ocultarElemento(registerSuccess);
}

btnShowRegister?.addEventListener("click", mostrarRegistro);
btnShowLogin?.addEventListener("click", mostrarLogin);

/* ===================== MOSTRAR/OCULTAR CONTRASEÑA ===================== */
document.querySelectorAll(".btn-toggle-password").forEach(button => {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.target);
        if (!input) return;
        if (input.type === "password") {
            input.type = "text";
            button.textContent = "🙈";
        } else {
            input.type = "password";
            button.textContent = "👁️";
        }
    });
});

/* ===================== REGISTRO ===================== */
formRegister?.addEventListener("submit", async (event) => {
    event.preventDefault();
    ocultarElemento(registerError);
    ocultarElemento(registerSuccess);

    const usuario = document.getElementById("input-reg-usuario")?.value.trim();
    const correo = document.getElementById("input-reg-email")?.value.trim();
    const direccion = document.getElementById("input-reg-direccion")?.value.trim();
    const clave = document.getElementById("input-reg-clave")?.value;

    if (!usuario || !correo || !direccion || !clave) {
        mostrarError(registerError, "Todos los campos son obligatorios.");
        return;
    }
    if (usuario.length < 3) {
        mostrarError(registerError, "El usuario debe tener al menos 3 caracteres.");
        return;
    }
    if (clave.length < 6) {
        mostrarError(registerError, "La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/registro`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario, correo, direccion, clave }),
        });

        let data = {};
        try { data = await response.json(); } catch { data = {}; }

        if (!response.ok) {
            let mensaje = data.detail || "No se pudo crear la cuenta.";
            if (Array.isArray(data.detail)) mensaje = data.detail.map(e => e.msg).join(", ");
            mostrarError(registerError, mensaje);
            return;
        }

        registerSuccess.textContent = "Cuenta creada correctamente. Ahora puedes iniciar sesión.";
        registerSuccess.hidden = false;
        formRegister.reset();

        setTimeout(() => {
            mostrarLogin();
            const inputUsuario = document.getElementById("input-usuario");
            if (inputUsuario) {
                inputUsuario.value = usuario;
                inputUsuario.focus();
            }
        }, 1500);

    } catch (error) {
        console.error("Error en registro:", error);
        mostrarError(registerError, "No se pudo conectar con el servidor.");
    }
});

/* ===================== LOGIN ===================== */
formLogin?.addEventListener("submit", async (event) => {
    event.preventDefault();
    ocultarElemento(loginError);

    const usuario = document.getElementById("input-usuario")?.value.trim();
    const clave = document.getElementById("input-clave")?.value;

    if (!usuario || !clave) {
        mostrarError(loginError, "Ingresa tu usuario y contraseña.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario, clave }),
        });

        let data = {};
        try { data = await response.json(); } catch { data = {}; }

        if (!response.ok) {
            let mensaje = data.detail || "Usuario o contraseña incorrectos.";
            if (Array.isArray(data.detail)) mensaje = data.detail.map(e => e.msg).join(", ");
            mostrarError(loginError, mensaje);
            return;
        }

        token = data.access_token;
        if (!token) {
            mostrarError(loginError, "El servidor no devolvió un token de autenticación.");
            return;
        }

        docente = data.docente || { usuario };
        localStorage.setItem("scae_token", token);
        localStorage.setItem("scae_docente", JSON.stringify(docente));

        entrarAlSistema();

    } catch (error) {
        console.error("Error en login:", error);
        mostrarError(loginError, "No se pudo conectar con el servidor.");
    }
});

/* ===================== ENTRAR AL SISTEMA ===================== */
function entrarAlSistema() {
    if (screenLogin) screenLogin.hidden = true;
    if (app) app.hidden = false;

    const nombreDocente = docente?.usuario || "Docente";
    const greetName = document.getElementById("greet-name");
    const teacherName = document.getElementById("teacher-name");
    const teacherAvatar = document.getElementById("teacher-avatar");

    if (greetName) greetName.textContent = nombreDocente;
    if (teacherName) teacherName.textContent = nombreDocente;
    if (teacherAvatar) teacherAvatar.textContent = nombreDocente.charAt(0).toUpperCase();

    const todayDate = document.getElementById("today-date");
    if (todayDate) {
        todayDate.textContent = new Date().toLocaleDateString("es-SV", {
            day: "numeric", month: "long", year: "numeric",
        });
    }

    cargarDatosIniciales();
}

/* ===================== CERRAR SESIÓN ===================== */
document.getElementById("btn-logout")?.addEventListener("click", () => {
    localStorage.removeItem("scae_token");
    localStorage.removeItem("scae_docente");
    token = null;
    docente = null;

    if (app) app.hidden = true;
    if (screenLogin) screenLogin.hidden = false;

    formLogin?.reset();
    mostrarLogin();
});

/* ===================== PETICIONES AUTENTICADAS ===================== */
async function apiFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    if (options.body && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE}${url}`, { ...options, headers });

    if (response.status === 401) {
        localStorage.removeItem("scae_token");
        localStorage.removeItem("scae_docente");
        token = null;
        docente = null;

        if (app) app.hidden = true;
        if (screenLogin) screenLogin.hidden = false;
        mostrarLogin();

        throw new Error("Sesión expirada.");
    }

    return response;
}

/* ===================== NAVEGACIÓN ===================== */
const navButtons = document.querySelectorAll(".nav-btn");
const menuCards = document.querySelectorAll(".menu-card");

function mostrarPantalla(targetId) {
    document.querySelectorAll(".screen").forEach(screen => {
        if (screen.id === "screen-login") return;
        screen.classList.remove("active");
    });

    document.getElementById(targetId)?.classList.add("active");

    navButtons.forEach(button => {
        button.classList.toggle("active", button.dataset.target === targetId);
    });

    if (targetId === "screen-students") cargarEstudiantes();
    if (targetId === "screen-attendance") cargarAsistencia();
    if (targetId === "screen-reports") cargarReportes();
}

navButtons.forEach(button => button.addEventListener("click", () => mostrarPantalla(button.dataset.target)));
menuCards.forEach(card => card.addEventListener("click", () => mostrarPantalla(card.dataset.target)));

/* ===================== VARIABLES DE DATOS ===================== */
let grados = [];
let secciones = [];
let estudiantes = [];
let asistenciaActual = [];
let estudianteSeleccionado = null;

/* ===================== CARGAR DATOS INICIALES ===================== */
async function cargarDatosIniciales() {
    try {
        await cargarGrados();
        await cargarSecciones();
        prepararFechas();
        await actualizarEstadisticasHoy();
    } catch (error) {
        console.error("Error cargando datos:", error);
    }
}

/* ===================== GRADOS / SECCIONES ===================== */
async function cargarGrados() {
    try {
        const response = await apiFetch("/api/grados");
        if (!response.ok) throw new Error("Error obteniendo grados.");
        grados = await response.json();
        llenarSelectGrados();
    } catch (error) {
        console.error("Error cargando grados:", error);
    }
}

async function cargarSecciones() {
    try {
        const response = await apiFetch("/api/secciones");
        if (!response.ok) throw new Error("Error obteniendo secciones.");
        secciones = await response.json();
        llenarSelectSecciones();
    } catch (error) {
        console.error("Error cargando secciones:", error);
    }
}

function llenarSelectGrados() {
    const ids = ["select-grado-students", "select-grado-attendance", "select-grado-reports", "select-grado-nuevo"];
    ids.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = `<option value="">Seleccionar grado</option>`;
        grados.forEach(grado => {
            const option = document.createElement("option");
            option.value = grado.nombre;
            option.textContent = grado.nombre;
            select.appendChild(option);
        });
    });
}

function llenarSelectSecciones() {
    const ids = ["select-seccion-students", "select-seccion-attendance", "select-seccion-reports", "select-seccion-nuevo"];
    ids.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = `<option value="">Seleccionar sección</option>`;
        secciones.forEach(seccion => {
            const option = document.createElement("option");
            option.value = seccion.nombre;
            option.textContent = seccion.nombre;
            select.appendChild(option);
        });
    });
}

/* ===================== FECHAS ===================== */
function prepararFechas() {
    const input = document.getElementById("input-fecha-attendance");
    if (!input) return;
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const day = String(hoy.getDate()).padStart(2, "0");
    input.value = `${year}-${month}-${day}`;
}

/* ===================== ESTUDIANTES ===================== */
async function cargarEstudiantes() {
    const grado = document.getElementById("select-grado-students")?.value;
    const seccion = document.getElementById("select-seccion-students")?.value;

    if (!grado || !seccion) {
        estudiantes = [];
        renderizarEstudiantes();
        return;
    }

    try {
        const params = new URLSearchParams({ grado, seccion });
        const response = await apiFetch(`/api/estudiantes?${params.toString()}`);
        if (!response.ok) throw new Error("Error obteniendo estudiantes.");
        estudiantes = await response.json();
        renderizarEstudiantes();
    } catch (error) {
        console.error("Error cargando estudiantes:", error);
    }
}

function renderizarEstudiantes() {
    const tbody = document.getElementById("tbody-students");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!estudiantes.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Selecciona grado y sección, o agrega un estudiante.</td></tr>`;
        return;
    }

    estudiantes.forEach((estudiante, index) => {
        const tr = document.createElement("tr");
        tr.classList.add("fila-estudiante");
        tr.addEventListener("dblclick", () => abrirFicha(estudiante));

        const nombre = `${estudiante.nombre || ""} ${estudiante.apellido || ""}`.trim();
        const inicial = nombre.charAt(0).toUpperCase() || "E";
        const foto = estudiante.foto;

        const estadoTexto = estudiante.estado_actual
            ? estudiante.estado_actual.charAt(0).toUpperCase() + estudiante.estado_actual.slice(1)
            : "Sin registro";

        const estadoClase = estudiante.estado_actual
            ? `stamp-${estudiante.estado_actual}`
            : "stamp-pendiente";

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${foto ? `<img src="${API_BASE}${foto}" class="thumb-foto" alt="Foto">` : `<span class="thumb-avatar">${inicial}</span>`}</td>
            <td>${nombre || "Sin nombre"}</td>
            <td><span class="stamp ${estadoClase}">${estadoTexto}</span></td>
        `;

        tbody.appendChild(tr);
    });
}

document.getElementById("select-grado-students")?.addEventListener("change", cargarEstudiantes);
document.getElementById("select-seccion-students")?.addEventListener("change", cargarEstudiantes);

/* ===================== AGREGAR ESTUDIANTE ===================== */
document.getElementById("btn-agregar-estudiante")?.addEventListener("click", () => abrirModal("modal-agregar"));

document.getElementById("input-foto-nuevo")?.addEventListener("change", (event) => {
    mostrarVistaPreviaFoto(event.target, "preview-foto-nuevo");
});

document.getElementById("form-agregar-estudiante")?.addEventListener("submit", agregarEstudiante);

async function agregarEstudiante(event) {
    event.preventDefault();

    const grado = document.getElementById("select-grado-nuevo")?.value;
    const seccion = document.getElementById("select-seccion-nuevo")?.value;

    if (!grado || !seccion) {
        alert("Selecciona grado y sección para el nuevo estudiante.");
        return;
    }

    const formData = new FormData();
    formData.append("nombre", document.getElementById("input-nombre-nuevo")?.value.trim() || "");
    formData.append("apellido", document.getElementById("input-apellido-nuevo")?.value.trim() || "");
    formData.append("grado", grado);
    formData.append("seccion", seccion);
    formData.append("direccion", document.getElementById("input-direccion-nuevo")?.value.trim() || "");
    formData.append("telefono", document.getElementById("input-telefono-nuevo")?.value.trim() || "");
    formData.append("responsable", document.getElementById("input-responsable-nuevo")?.value.trim() || "");

    const archivoFoto = document.getElementById("input-foto-nuevo")?.files?.[0];
    if (archivoFoto) formData.append("foto", archivoFoto);

    try {
        const response = await apiFetch("/api/estudiantes", { method: "POST", body: formData });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || "No se pudo agregar el estudiante.");
        }

        cerrarModal("modal-agregar");
        document.getElementById("form-agregar-estudiante")?.reset();
        document.getElementById("preview-foto-nuevo")?.setAttribute("hidden", "");

        // Si el estudiante quedó en el grado/sección que se está viendo, refresca la lista
        const gradoActual = document.getElementById("select-grado-students")?.value;
        const seccionActual = document.getElementById("select-seccion-students")?.value;
        if (gradoActual === grado && seccionActual === seccion) {
            await cargarEstudiantes();
        }

    } catch (error) {
        console.error("Error agregando estudiante:", error);
        alert(error.message);
    }
}

function mostrarVistaPreviaFoto(input, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview || !input.files?.[0]) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        preview.src = e.target.result;
        preview.hidden = false;
    };
    reader.readAsDataURL(input.files[0]);
}

/* ===================== MODALES ===================== */
function abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.hidden = false;
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.hidden = true;
}

document.querySelectorAll("[data-close-modal]").forEach(button => {
    button.addEventListener("click", () => cerrarModal(button.dataset.closeModal));
});

document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.addEventListener("click", (event) => {
        if (event.target === modal) modal.hidden = true;
    });
});

/* ===================== FICHA DEL ESTUDIANTE ===================== */
const fichaVista = document.getElementById("ficha-vista");
const formEditarEstudiante = document.getElementById("form-editar-estudiante");
const btnEditarEstudiante = document.getElementById("btn-editar-estudiante");
const btnCancelarEdicion = document.getElementById("btn-cancelar-edicion");
const btnGuardarEdicion = document.getElementById("btn-guardar-edicion");
const btnEliminarEstudiante = document.getElementById("btn-eliminar-estudiante");

function abrirFicha(estudiante) {
    estudianteSeleccionado = estudiante;
    mostrarModoVisualizacion();

    const nombre = `${estudiante.nombre || ""} ${estudiante.apellido || ""}`.trim();

    document.getElementById("ficha-nombre").textContent = nombre || "Sin nombre";
    document.getElementById("ficha-grupo").textContent = `${estudiante.grado || ""} · Sección ${estudiante.seccion || ""}`;
    document.getElementById("ficha-direccion").textContent = estudiante.direccion || "No registrada";
    document.getElementById("ficha-telefono").textContent = estudiante.telefono || "No registrado";
    document.getElementById("ficha-responsable").textContent = estudiante.responsable || "No registrado";
    document.getElementById("ficha-estado").textContent = estudiante.estado_actual || "Sin registro";

    const fichaAvatar = document.getElementById("ficha-avatar");
    const fichaFoto = document.getElementById("ficha-foto");

    fichaAvatar.textContent = nombre.charAt(0).toUpperCase() || "E";

    if (estudiante.foto) {
        fichaFoto.src = `${API_BASE}${estudiante.foto}`;
        fichaFoto.hidden = false;
        fichaAvatar.hidden = true;
    } else {
        fichaFoto.hidden = true;
        fichaAvatar.hidden = false;
    }

    abrirModal("modal-ficha");
}

function mostrarModoVisualizacion() {
    fichaVista.hidden = false;
    formEditarEstudiante.hidden = true;
    btnEditarEstudiante.hidden = false;
    btnEliminarEstudiante.hidden = false;
    btnGuardarEdicion.hidden = true;
    btnCancelarEdicion.hidden = true;
}

function mostrarModoEdicion() {
    if (!estudianteSeleccionado) return;

    fichaVista.hidden = true;
    formEditarEstudiante.hidden = false;
    btnEditarEstudiante.hidden = true;
    btnEliminarEstudiante.hidden = true;
    btnGuardarEdicion.hidden = false;
    btnCancelarEdicion.hidden = false;

    document.getElementById("input-nombre-editar").value = estudianteSeleccionado.nombre || "";
    document.getElementById("input-apellido-editar").value = estudianteSeleccionado.apellido || "";
    document.getElementById("input-direccion-editar").value = estudianteSeleccionado.direccion || "";
    document.getElementById("input-telefono-editar").value = estudianteSeleccionado.telefono || "";
    document.getElementById("input-responsable-editar").value = estudianteSeleccionado.responsable || "";

    const preview = document.getElementById("preview-foto-editar");
    if (preview) preview.hidden = true;
}

btnEditarEstudiante?.addEventListener("click", mostrarModoEdicion);
btnCancelarEdicion?.addEventListener("click", mostrarModoVisualizacion);

document.getElementById("input-foto-editar")?.addEventListener("change", (event) => {
    mostrarVistaPreviaFoto(event.target, "preview-foto-editar");
});

formEditarEstudiante?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!estudianteSeleccionado) return;

    const formData = new FormData();
    formData.append("nombre", document.getElementById("input-nombre-editar")?.value.trim() || "");
    formData.append("apellido", document.getElementById("input-apellido-editar")?.value.trim() || "");
    formData.append("direccion", document.getElementById("input-direccion-editar")?.value.trim() || "");
    formData.append("telefono", document.getElementById("input-telefono-editar")?.value.trim() || "");
    formData.append("responsable", document.getElementById("input-responsable-editar")?.value.trim() || "");

    const archivoFoto = document.getElementById("input-foto-editar")?.files?.[0];
    if (archivoFoto) formData.append("foto", archivoFoto);

    try {
        const response = await apiFetch(`/api/estudiantes/${estudianteSeleccionado.id}`, {
            method: "PUT",
            body: formData,
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || "No se pudo actualizar el estudiante.");
        }

        const actualizado = await response.json();
        estudianteSeleccionado = actualizado;

        cerrarModal("modal-ficha");
        await cargarEstudiantes();

    } catch (error) {
        console.error("Error actualizando estudiante:", error);
        alert(error.message);
    }
});

btnEliminarEstudiante?.addEventListener("click", async () => {
    if (!estudianteSeleccionado) return;

    const nombre = `${estudianteSeleccionado.nombre || ""} ${estudianteSeleccionado.apellido || ""}`.trim();
    if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;

    try {
        const response = await apiFetch(`/api/estudiantes/${estudianteSeleccionado.id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("No se pudo eliminar el estudiante.");

        cerrarModal("modal-ficha");
        await cargarEstudiantes();

    } catch (error) {
        console.error("Error eliminando estudiante:", error);
        alert(error.message);
    }
});

/* ===================== ASISTENCIA ===================== */
async function cargarAsistencia() {
    const grado = document.getElementById("select-grado-attendance")?.value;
    const seccion = document.getElementById("select-seccion-attendance")?.value;
    const fecha = document.getElementById("input-fecha-attendance")?.value;

    if (!grado || !seccion || !fecha) {
        renderizarAsistencia([]);
        return;
    }

    try {
        const params = new URLSearchParams({ grado, seccion, fecha });
        const response = await apiFetch(`/api/asistencia?${params.toString()}`);
        if (!response.ok) throw new Error("Error cargando estudiantes.");

        asistenciaActual = await response.json();
        renderizarAsistencia(asistenciaActual);

    } catch (error) {
        console.error("Error asistencia:", error);
    }
}

function renderizarAsistencia(lista) {
    const tbody = document.getElementById("tbody-attendance");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Selecciona grado y sección para ver a los estudiantes.</td></tr>`;
        return;
    }

    lista.forEach((estudiante, index) => {
        const tr = document.createElement("tr");
        const id = estudiante.estudiante_id;
        const estadoGuardado = estudiante.estado;

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${estudiante.nombre || ""} ${estudiante.apellido || ""}</td>
            <td><label class="estado-opcion"><input type="radio" name="estado-${id}" value="presente" class="radio-presente" ${estadoGuardado === "presente" ? "checked" : ""}></label></td>
            <td><label class="estado-opcion"><input type="radio" name="estado-${id}" value="ausente" class="radio-ausente" ${estadoGuardado === "ausente" ? "checked" : ""}></label></td>
            <td><label class="estado-opcion"><input type="radio" name="estado-${id}" value="tarde" class="radio-tarde" ${estadoGuardado === "tarde" ? "checked" : ""}></label></td>
        `;

        tbody.appendChild(tr);
    });
}

document.getElementById("btn-marcar-todos")?.addEventListener("click", () => {
    document.querySelectorAll(".radio-presente").forEach(radio => { radio.checked = true; });
});

document.getElementById("select-grado-attendance")?.addEventListener("change", cargarAsistencia);
document.getElementById("select-seccion-attendance")?.addEventListener("change", cargarAsistencia);
document.getElementById("input-fecha-attendance")?.addEventListener("change", cargarAsistencia);

document.getElementById("btn-guardar-asistencia")?.addEventListener("click", guardarAsistencia);

async function guardarAsistencia() {
    const grado = document.getElementById("select-grado-attendance")?.value;
    const seccion = document.getElementById("select-seccion-attendance")?.value;
    const fecha = document.getElementById("input-fecha-attendance")?.value;
    const feedback = document.getElementById("save-feedback");

    if (!grado || !seccion || !fecha) {
        if (feedback) feedback.textContent = "Selecciona grado, sección y fecha.";
        return;
    }

    const registros = [];
    asistenciaActual.forEach(estudiante => {
        const radio = document.querySelector(`input[name="estado-${estudiante.estudiante_id}"]:checked`);
        if (radio) registros.push({ estudiante_id: estudiante.estudiante_id, estado: radio.value });
    });

    if (!registros.length) {
        if (feedback) feedback.textContent = "Marca al menos un estudiante.";
        return;
    }

    try {
        const response = await apiFetch("/api/asistencia", {
            method: "POST",
            body: JSON.stringify({ fecha, grado, seccion, registros }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || "No se pudo guardar la asistencia.");
        }

        if (feedback) feedback.textContent = "Asistencia guardada correctamente.";
        await cargarAsistencia();
        await actualizarEstadisticasHoy();

    } catch (error) {
        console.error(error);
        if (feedback) feedback.textContent = error.message;
    }
}

/* ===================== ESTADÍSTICAS (MENÚ) ===================== */
async function actualizarEstadisticasHoy() {
    try {
        const response = await apiFetch("/api/estadisticas/hoy");
        if (!response.ok) throw new Error("Error obteniendo estadísticas.");

        const data = await response.json();

        document.getElementById("stat-total").textContent = data.total ?? 0;
        document.getElementById("stat-presentes").textContent = data.presentes ?? 0;
        document.getElementById("stat-tardes").textContent = data.tardes ?? 0;
        document.getElementById("stat-ausentes").textContent = data.ausentes ?? 0;

    } catch (error) {
        console.error("Error cargando estadísticas:", error);
    }
}

/* ===================== REPORTES ===================== */
async function cargarReportes() {
    const grado = document.getElementById("select-grado-reports")?.value;
    const seccion = document.getElementById("select-seccion-reports")?.value;

    if (!grado || !seccion) return;

    try {
        const params = new URLSearchParams({ grado, seccion });
        const response = await apiFetch(`/api/reportes?${params.toString()}`);
        if (!response.ok) throw new Error("No se pudieron cargar los reportes.");

        const data = await response.json();
        renderizarReportes(data);

    } catch (error) {
        console.error("Error reportes:", error);
    }
}

function renderizarReportes(registros) {
    const tbody = document.getElementById("tbody-reports");
    const empty = document.getElementById("reports-empty");
    if (!tbody) return;

    tbody.innerHTML = "";

    let presentes = 0, tardes = 0, ausentes = 0;

    registros.forEach(registro => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${registro.fecha || "—"}</td>
            <td>${registro.nombre || ""} ${registro.apellido || ""}</td>
            <td><span class="stamp stamp-${registro.estado}">${registro.estado || "—"}</span></td>
        `;
        tbody.appendChild(tr);

        if (registro.estado === "presente") presentes++;
        if (registro.estado === "tarde") tardes++;
        if (registro.estado === "ausente") ausentes++;
    });

    document.getElementById("report-presentes").textContent = presentes;
    document.getElementById("report-tardes").textContent = tardes;
    document.getElementById("report-ausentes").textContent = ausentes;

    if (empty) empty.hidden = registros.length > 0;
}

document.getElementById("select-grado-reports")?.addEventListener("change", cargarReportes);
document.getElementById("select-seccion-reports")?.addEventListener("change", cargarReportes);

/* ===================== DESCARGAR PDF ===================== */
document.getElementById("btn-descargar-reporte-pdf")?.addEventListener("click", descargarReportePDF);

async function descargarReportePDF() {
    const feedback = document.getElementById("report-pdf-feedback");

    try {
        const grado = document.getElementById("select-grado-reports")?.value;
        const seccion = document.getElementById("select-seccion-reports")?.value;

        if (!grado || !seccion) {
            if (feedback) feedback.textContent = "Selecciona grado y sección.";
            return;
        }

        const params = new URLSearchParams({ grado, seccion });
        const response = await apiFetch(`/api/reportes/pdf?${params.toString()}`);

        if (!response.ok) throw new Error("No se pudo generar el PDF.");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "reporte-asistencia.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        if (feedback) feedback.textContent = "Reporte descargado correctamente.";

    } catch (error) {
        console.error("Error PDF:", error);
        if (feedback) feedback.textContent = error.message;
    }
}

/* ===================== INICIALIZAR SESIÓN ===================== */
if (token) {
    entrarAlSistema();
} else {
    if (app) app.hidden = true;
    if (screenLogin) screenLogin.hidden = false;
    mostrarLogin();
}