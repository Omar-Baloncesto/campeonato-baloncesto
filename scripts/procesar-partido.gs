// ============================================================
// ⚡ PROCESAR PARTIDO — un solo clic por planilla
// ============================================================
//
// Ejecuta, en el orden correcto, toda la cadena que hoy se corre
// a mano después de llenar cada PLANILLA:
//
//   1. Calcular Puntos por Cuarto        -> calcularPuntosPorCuarto()
//   2. Pasar Puntos a ListaEquipos       -> pasarPuntosAListaEquipos()
//   3. Pasar Puntos a EstadisticasJug.   -> _ppCargarEstadisticas()   [nuevo]
//   4. Llevar Marcadores a FIXTURE       -> insertarMarcadores()
//   5. Calcular TablaPosiciones          -> calcularTablaPosiciones()
//   6. Equipos Empatados (FIBA)          -> crearHojaEquiposEmpatados()
//   7. Ordenar Tabla Puntos Jugadores    -> OrdenaTablaPuntosJugadores()
//
// NO modifica ninguna función existente. Los pasos 1, 2, 4, 5, 6 y 7
// llaman tal cual a las funciones que ya están probadas y en uso; el
// menú "🏀 Campeonato" sigue funcionando exactamente igual y queda
// disponible como respaldo.
//
// El paso 3 es el único que necesitó una versión nueva, porque el
// original (pasarPuntosAEstadisticasJugadores) SUMA sobre lo que ya
// había —correr dos veces duplicaría los puntos— y además pide la
// fecha por teclado. Esta versión deduce la fecha sola y reescribe en
// vez de sumar, así que se puede repetir sin riesgo.
//
// NADA de esto toca los scripts de creación del torneo.
// ============================================================


// ===== Celdas de la PLANILLA (planilla FIBA) =====
const PP_CELDA_EQUIPO_A = "D1";
const PP_CELDA_EQUIPO_B = "Y1";
const PP_CELDA_FECHA    = "M3";

// Puntaje progresivo: filas 14-53, 4 bloques de 40
const PP_FILA_INI   = 14;
const PP_FILA_FIN   = 53;
const PP_COLS_A     = [22, 26, 30, 34]; // V, Z, AD, AH
const PP_COLS_B     = [25, 29, 33, 37]; // Y, AC, AG, AK

// FIXTURE (índices base 0 sobre la fila leída)
const PP_FIX_JORNADA = 1;  // B  FechaNumero
const PP_FIX_LOCAL   = 2;  // C
const PP_FIX_VISITA  = 4;  // E
const PP_FIX_FECHA   = 5;  // F
const PP_FIX_FLAG    = 10; // K  W.O. / RETIRO


// ============================================================
// FUNCIÓN PRINCIPAL — es la que se asigna al botón/dibujo
// ============================================================
function ProcesarPartido() {

  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ---------- PRE-VUELO ----------
  // Se valida TODO antes de escribir una sola celda. Si algo no
  // cuadra, se aborta sin haber tocado nada.
  let info;
  try {
    info = _ppValidarPlanilla(ss);
  } catch (err) {
    ui.alert("⚠️ No se procesó nada", err.message, ui.ButtonSet.OK);
    return;
  }

  // ---------- CONFIRMACIÓN ----------
  const resp = ui.alert(
    "Confirmar partido",
    "FECHA " + info.jornada + "   (" + info.fechaTexto + ")\n\n" +
    info.equipoA + "   " + info.totalA + "  -  " + info.totalB + "   " + info.equipoB + "\n\n" +
    "Se actualizarán: ListaEquipos, EstadisticasJugadores, FIXTURE,\n" +
    "TablaPosiciones, EquiposEmpatados y PuntosJugadores.\n\n" +
    "¿Procesar este partido?",
    ui.ButtonSet.OK_CANCEL
  );

  if (resp !== ui.Button.OK) return;

  // ---------- EJECUCIÓN ----------
  const hechos = [];

  try {
    calcularPuntosPorCuarto();          hechos.push("Puntos por cuarto");
    pasarPuntosAListaEquipos();         hechos.push("ListaEquipos");
    _ppCargarEstadisticas(ss, info);    hechos.push("EstadisticasJugadores");
    insertarMarcadores();               hechos.push("Marcadores → FIXTURE");
    calcularTablaPosiciones();          hechos.push("TablaPosiciones");
    crearHojaEquiposEmpatados();        hechos.push("EquiposEmpatados");
    OrdenaTablaPuntosJugadores();       hechos.push("Ranking de jugadores");

    SpreadsheetApp.flush();

  } catch (err) {
    ui.alert(
      "❌ Se interrumpió el proceso",
      "Pasos completados:\n  ✔ " + (hechos.join("\n  ✔ ") || "(ninguno)") +
      "\n\nFalló en el paso siguiente:\n" + err.message +
      "\n\nCorrige el problema y vuelve a dar clic en el botón: " +
      "repetirlo NO duplica datos.",
      ui.ButtonSet.OK
    );
    return;
  }

  ui.alert(
    "✅ Partido procesado",
    "FECHA " + info.jornada + "\n" +
    info.equipoA + "   " + info.totalA + "  -  " + info.totalB + "   " + info.equipoB + "\n\n" +
    "Ya está actualizado en la web y en los celulares.\n\n" +
    "Recuerda marcar las asistencias de esta fecha en la hoja\n" +
    "AsistenciasJugadores (incluida la fila de encabezado).",
    ui.ButtonSet.OK
  );
}


// ============================================================
// PRE-VUELO: valida la PLANILLA y deduce la fecha (F1..F10)
// Lanza Error con mensaje claro si algo impide procesar.
// ============================================================
function _ppValidarPlanilla(ss) {

  const planilla = ss.getSheetByName("PLANILLA");
  if (!planilla) throw new Error("No se encontró la hoja 'PLANILLA'.");

  const equipoA = planilla.getRange(PP_CELDA_EQUIPO_A).getDisplayValue().trim();
  const equipoB = planilla.getRange(PP_CELDA_EQUIPO_B).getDisplayValue().trim();

  if (!equipoA || !equipoB) {
    throw new Error(
      "Falta el nombre de algún equipo en la PLANILLA.\n\n" +
      PP_CELDA_EQUIPO_A + " (Equipo A) = \"" + equipoA + "\"\n" +
      PP_CELDA_EQUIPO_B + " (Equipo B) = \"" + equipoB + "\""
    );
  }

  if (_ppNorm(equipoA) === _ppNorm(equipoB)) {
    throw new Error("Los dos equipos de la PLANILLA son el mismo: " + equipoA);
  }

  const fecha = planilla.getRange(PP_CELDA_FECHA).getValue();
  if (!(fecha instanceof Date) || isNaN(fecha.getTime())) {
    throw new Error(
      "La celda " + PP_CELDA_FECHA + " de la PLANILLA no tiene una fecha válida.\n\n" +
      "Debe ser una fecha real (no texto), con el mismo formato que usa el FIXTURE."
    );
  }

  const tz = Session.getScriptTimeZone();
  const fechaTexto = Utilities.formatDate(fecha, tz, "dd/MM/yyyy");

  // ----- Buscar el partido en FIXTURE -----
  const wsFix = ss.getSheetByName("FIXTURE");
  if (!wsFix) throw new Error("No se encontró la hoja 'FIXTURE'.");

  const ultFila = wsFix.getLastRow();
  if (ultFila < 2) throw new Error("La hoja 'FIXTURE' no tiene partidos cargados.");

  const datosFix = wsFix.getRange(2, 1, ultFila - 1, 12).getValues();

  let jornada = null;
  let flag = "";

  for (let i = 0; i < datosFix.length; i++) {

    const f = datosFix[i];
    const fFecha = f[PP_FIX_FECHA];
    if (!fFecha) continue;

    const fTexto = Utilities.formatDate(new Date(fFecha), tz, "dd/MM/yyyy");
    if (fTexto !== fechaTexto) continue;

    const local  = _ppNorm(f[PP_FIX_LOCAL]);
    const visita = _ppNorm(f[PP_FIX_VISITA]);
    const a = _ppNorm(equipoA);
    const b = _ppNorm(equipoB);

    // Acepta la planilla en cualquier orden (local/visitante)
    if ((local === a && visita === b) || (local === b && visita === a)) {
      jornada = String(f[PP_FIX_JORNADA]).trim();
      flag = String(f[PP_FIX_FLAG] || "").trim().toUpperCase();
      break;
    }
  }

  if (jornada === null) {
    throw new Error(
      "En el FIXTURE no existe un partido " + equipoA + " vs " + equipoB +
      " para el " + fechaTexto + ".\n\n" +
      "Revisa la fecha (" + PP_CELDA_FECHA + ") y los nombres de los equipos (" +
      PP_CELDA_EQUIPO_A + " y " + PP_CELDA_EQUIPO_B + ").\n" +
      "Deben escribirse igual que en el FIXTURE."
    );
  }

  if (!/^([1-9]|10)$/.test(jornada)) {
    throw new Error("El FIXTURE tiene una jornada inválida (\"" + jornada + "\") para ese partido.");
  }

  if (flag) {
    throw new Error(
      "Ese partido está marcado como \"" + flag + "\" en el FIXTURE.\n\n" +
      "Los W.O. y los retiros se manejan desde el menú\n" +
      "🏀 Campeonato → ⚠️ W.O. / Retirada, no con este botón."
    );
  }

  // ----- Validar marcadores por cuarto -----
  const acumA = planilla.getRange("AA56:AA60").getValues().flat();
  const acumB = planilla.getRange("AF56:AF60").getValues().flat();

  _ppValidarAcumulado(acumA, "Equipo A (" + equipoA + ")", "AA56:AA60");
  _ppValidarAcumulado(acumB, "Equipo B (" + equipoB + ")", "AF56:AF60");

  const totalA = Number(acumA[4]) > 0 ? Number(acumA[4]) : Number(acumA[3]);
  const totalB = Number(acumB[4]) > 0 ? Number(acumB[4]) : Number(acumB[3]);

  if (totalA === 0 && totalB === 0) {
    throw new Error(
      "La PLANILLA no tiene marcador: los dos equipos están en 0.\n\n" +
      "Llena el puntaje acumulado por cuarto en AA56:AA60 y AF56:AF60."
    );
  }

  return { equipoA, equipoB, fecha, fechaTexto, jornada, totalA, totalB };
}


// Valida que el acumulado por cuarto sean números que no retrocedan.
function _ppValidarAcumulado(arr, etiqueta, rango) {

  for (let i = 0; i < 4; i++) {
    if (arr[i] === "" || isNaN(Number(arr[i]))) {
      throw new Error(
        "El marcador acumulado del " + etiqueta + " tiene un valor no numérico.\n\n" +
        "Revisa el rango " + rango + " (cuartos 1 a 4 y prórroga)."
      );
    }
  }

  for (let i = 1; i < 4; i++) {
    if (Number(arr[i]) < Number(arr[i - 1])) {
      throw new Error(
        "El marcador acumulado del " + etiqueta + " baja en el cuarto " + (i + 1) + ".\n\n" +
        "En " + rango + " va el puntaje ACUMULADO (siempre creciente),\n" +
        "no el puntaje de cada cuarto por separado."
      );
    }
  }
}


// ============================================================
// PASO 3 (versión automática e idempotente)
//
// Diferencias con pasarPuntosAEstadisticasJugadores():
//   · No pide la fecha: la recibe ya deducida del FIXTURE.
//   · Reescribe en vez de sumar, así que repetirlo no duplica.
//   · No muestra diálogos; los errores se propagan al orquestador.
// La lectura del puntaje progresivo es idéntica a la original.
// ============================================================
function _ppCargarEstadisticas(ss, info) {

  const planilla       = ss.getSheetByName("PLANILLA");
  const estad          = ss.getSheetByName("EstadisticasJugadores");
  const jugadoresSheet = ss.getSheetByName("JUGADORES");
  const equiposSheet   = ss.getSheetByName("EQUIPOS");

  if (!estad)          throw new Error("No se encontró la hoja 'EstadisticasJugadores'.");
  if (!jugadoresSheet) throw new Error("No se encontró la hoja 'JUGADORES'.");
  if (!equiposSheet)   throw new Error("No se encontró la hoja 'EQUIPOS'.");

  // ----- ID de cada equipo -----
  const dataEquipos = equiposSheet.getRange("A2:B" + equiposSheet.getLastRow()).getValues();

  let idA = null, idB = null;
  dataEquipos.forEach(e => {
    if (_ppNorm(e[1]) === _ppNorm(info.equipoA)) idA = e[0];
    if (_ppNorm(e[1]) === _ppNorm(info.equipoB)) idB = e[0];
  });

  if (idA === null) throw new Error("El equipo '" + info.equipoA + "' no está en la hoja EQUIPOS.");
  if (idB === null) throw new Error("El equipo '" + info.equipoB + "' no está en la hoja EQUIPOS.");

  // ----- Mapa  idEquipo_dorsal -> nombre jugador -----
  const jugadores = jugadoresSheet.getRange("A2:D" + jugadoresSheet.getLastRow()).getValues();

  const mapa = {};
  jugadores.forEach(j => { mapa[j[2] + "_" + j[3]] = j[1]; });

  // ----- Leer y escribir -----
  const eventosA = _ppLeerEventos(planilla, PP_COLS_A);
  const eventosB = _ppLeerEventos(planilla, PP_COLS_B);

  _ppEscribirEstadisticas(estad, mapa, idA, eventosA, info.equipoA, info.jornada);
  _ppEscribirEstadisticas(estad, mapa, idB, eventosB, info.equipoB, info.jornada);
}


// Lee el puntaje progresivo y devuelve [{numero, tipo}] donde tipo
// es 1, 2 o 3 puntos. Misma lógica de "fila virtual" del original.
function _ppLeerEventos(planilla, cols) {

  const eventos = [];

  cols.forEach((col, bloque) => {

    const valores = planilla
      .getRange(PP_FILA_INI, col, PP_FILA_FIN - PP_FILA_INI + 1)
      .getValues();

    valores.forEach((v, i) => {

      if (v[0] !== "" && !isNaN(v[0])) {
        const filaReal = PP_FILA_INI + i;
        eventos.push({
          virtual: (bloque * 40) + (filaReal - 13),
          numero: v[0]
        });
      }

    });

  });

  eventos.sort((a, b) => a.virtual - b.virtual);

  const resultados = [];
  let anterior = null;

  eventos.forEach(ev => {

    const puntos = (anterior === null) ? ev.virtual : ev.virtual - anterior;

    if (puntos >= 1 && puntos <= 3) {
      resultados.push({ numero: ev.numero, tipo: puntos });
    }

    anterior = ev.virtual;
  });

  return resultados;
}


// Escribe los puntos de UNA fecha para los 12 jugadores de un equipo.
// Reescribe las tres columnas P1/P2/P3 de esa fecha (las que no
// anotaron quedan en 0, igual que las deja crearEstadisticasJugadores),
// por eso se puede repetir sin duplicar.
function _ppEscribirEstadisticas(estad, mapa, equipoID, eventos, nombreEquipo, jornada) {

  const data = estad.getDataRange().getValues();

  let filaEquipo = -1;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).includes(nombreEquipo)) { filaEquipo = i + 1; break; }
  }

  if (filaEquipo === -1) {
    throw new Error("No se encontró el bloque del equipo '" + nombreEquipo + "' en EstadisticasJugadores.");
  }

  const encabezados = estad.getRange(filaEquipo + 2, 1, 1, 200).getValues()[0];

  const colDe = { 1: -1, 2: -1, 3: -1 };
  encabezados.forEach((h, idx) => {
    if (h === "P1 F" + jornada) colDe[1] = idx + 1;
    if (h === "P2 F" + jornada) colDe[2] = idx + 1;
    if (h === "P3 F" + jornada) colDe[3] = idx + 1;
  });

  if (colDe[1] < 0 || colDe[2] < 0 || colDe[3] < 0) {
    throw new Error(
      "No se encontraron las columnas \"P1 F" + jornada + "\", \"P2 F" + jornada +
      "\" y \"P3 F" + jornada + "\" en el bloque de " + nombreEquipo + "."
    );
  }

  // Totalizar por jugador (se guardan PUNTOS, no cantidad de tiros)
  const totales = {};
  const sinIdentificar = {};

  eventos.forEach(ev => {

    const nombre = mapa[equipoID + "_" + ev.numero];

    if (!nombre) { sinIdentificar[ev.numero] = true; return; }

    if (!totales[nombre]) totales[nombre] = { 1: 0, 2: 0, 3: 0 };
    totales[nombre][ev.tipo] += ev.tipo;
  });

  const dorsalesRaros = Object.keys(sinIdentificar);
  if (dorsalesRaros.length) {
    throw new Error(
      "En la PLANILLA hay dorsales que no existen en la hoja JUGADORES\n" +
      "para " + nombreEquipo + ": " + dorsalesRaros.join(", ") + ".\n\n" +
      "Corrige el número o agrega el jugador y vuelve a dar clic."
    );
  }

  // Escribir las 12 filas de una sola pasada por columna
  for (const tipo of [1, 2, 3]) {

    const col = colDe[tipo];
    const valores = [];

    for (let i = 0; i < 12; i++) {
      const nombre = String(estad.getRange(filaEquipo + 3 + i, 1).getValue()).trim();
      const t = totales[nombre];
      valores.push([t ? t[tipo] : 0]);
    }

    estad.getRange(filaEquipo + 3, col, 12, 1).setValues(valores);
  }
}


// Normaliza nombres para comparar (sin tildes, sin dobles espacios).
function _ppNorm(v) {
  return String(v == null ? "" : v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
