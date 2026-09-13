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
//   4. Asistencias desde la nómina       -> _ppCargarAsistencias()    [nuevo]
//   5. Llevar Marcadores a FIXTURE       -> insertarMarcadores()
//   6. Calcular TablaPosiciones          -> calcularTablaPosiciones()
//   7. Equipos Empatados (FIBA)          -> crearHojaEquiposEmpatados()
//   8. Ordenar Tabla Puntos Jugadores    -> OrdenaTablaPuntosJugadores()
//
// NO modifica ninguna función existente. Los pasos 1, 2, 5, 6, 7 y 8
// llaman tal cual a las funciones que ya están probadas y en uso; el
// menú "🏀 Campeonato" sigue funcionando exactamente igual y queda
// disponible como respaldo.
//
// El paso 3 tiene versión nueva porque el original
// (pasarPuntosAEstadisticasJugadores) SUMA sobre lo que ya había
// —correr dos veces duplicaría los puntos— y además pide la fecha por
// teclado. Esta versión deduce la fecha sola y reescribe en vez de
// sumar, así que se puede repetir sin riesgo.
//
// El paso 4 llena AsistenciasJugadores leyendo las "X" de la columna
// "en Juego" (O) de las dos nóminas de la PLANILLA.
//
// La nómina (nombres en D y dorsales en N) se llena SOLA por fórmula
// al escribir los equipos en D1 y Y1: este script NO la toca, solo la
// lee. Lo único manual es marcar con X quién jugó.
//
// Es OPCIONAL: si no hay ninguna X, el paso se omite y las asistencias
// se siguen marcando a mano como siempre.
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

// Nóminas: 12 jugadores por equipo
const PP_NOMINA_A     = [16, 27]; // filas del Equipo A
const PP_NOMINA_B     = [40, 51]; // filas del Equipo B
// La nómina se llena sola por fórmula al poner los equipos en D1/Y1.
// Solo se LEEN estas dos columnas; nunca se escriben.
const PP_COL_DORSAL   = 14; // N  N°        (fórmula)
const PP_COL_EN_JUEGO = 15; // O  en Juego  (la X, manual)

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

  const textoAsistencias = info.hayAsistencias
    ? "Asistencias: " + info.nominaA.jugaron.length + " de " + info.equipoA +
      " y " + info.nominaB.jugaron.length + " de " + info.equipoB
    : "Asistencias: NO se tocan (no hay ninguna X en la columna O)";

  // ---------- CONFIRMACIÓN ----------
  const resp = ui.alert(
    "Confirmar partido",
    "FECHA " + info.jornada + "   (" + info.fechaTexto + ")\n\n" +
    info.equipoA + "   " + info.totalA + "  -  " + info.totalB + "   " + info.equipoB + "\n\n" +
    textoAsistencias + "\n\n" +
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

    if (info.hayAsistencias) {
      _ppCargarAsistencias(ss, info);   hechos.push("AsistenciasJugadores");
    }

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
    (info.hayAsistencias
      ? "Asistencias marcadas automáticamente."
      : "⚠️ Las asistencias NO se tocaron.\nMárcalas a mano en AsistenciasJugadores,\nincluida la fila de encabezado.") +
    "\n\nYa está actualizado en la web y en los celulares.",
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

  // ----- Asistencias desde las X de la columna O (opcional) -----
  // La nómina se llena sola al escribir los equipos, así que lo que
  // decide si hay asistencias que registrar son las X, no los dorsales.
  const nominaA = _ppLeerNomina(planilla, PP_NOMINA_A);
  const nominaB = _ppLeerNomina(planilla, PP_NOMINA_B);

  if (nominaA.huerfanas || nominaB.huerfanas) {
    throw new Error(
      "Hay X en la columna \"en Juego\" (O) en filas donde no aparece\n" +
      "ningún jugador.\n\n" +
      equipoA + ": " + nominaA.huerfanas + "    " + equipoB + ": " + nominaB.huerfanas + "\n\n" +
      "Suele pasar cuando el nombre del equipo en " + PP_CELDA_EQUIPO_A + " o " +
      PP_CELDA_EQUIPO_B + "\nestá mal escrito y la nómina no carga.\n\n" +
      "Revísalo, o borra esas X de más."
    );
  }

  const hayAsistencias = nominaA.jugaron.length > 0 || nominaB.jugaron.length > 0;

  if (hayAsistencias) {

    if (!nominaA.jugaron.length || !nominaB.jugaron.length) {
      throw new Error(
        "Solo un equipo tiene marcada la asistencia.\n\n" +
        equipoA + ": " + nominaA.jugaron.length + " marcados\n" +
        equipoB + ": " + nominaB.jugaron.length + " marcados\n\n" +
        "Marca con X en la columna O a los que jugaron de los DOS equipos,\n" +
        "o borra todas las X si prefieres marcar las asistencias a mano."
      );
    }

    // Quien anotó puntos tuvo que haber jugado: cruce de control que
    // detecta X olvidadas o marcas que quedaron del partido anterior.
    _ppCruzarAnotadores(nominaA, _ppLeerEventos(planilla, PP_COLS_A), equipoA);
    _ppCruzarAnotadores(nominaB, _ppLeerEventos(planilla, PP_COLS_B), equipoB);
  }

  return {
    equipoA, equipoB, fecha, fechaTexto, jornada,
    totalA, totalB, nominaA, nominaB, hayAsistencias
  };
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
// NÓMINA: lectura de las columnas N (dorsal) y O ("en Juego")
// ============================================================
function _ppLeerNomina(planilla, rango) {

  const filas = rango[1] - rango[0] + 1;
  const datos = planilla.getRange(rango[0], PP_COL_DORSAL, filas, 2).getValues();

  const dorsales = [];
  const jugaron  = [];
  let huerfanas  = 0;

  datos.forEach(d => {
    const dorsal  = String(d[0] === null || d[0] === undefined ? "" : d[0]).trim();
    const marcado = _ppEsMarca(d[1]);

    // X en una fila donde la nómina no trajo jugador: algo está mal.
    if (!dorsal) { if (marcado) huerfanas++; return; }

    dorsales.push(dorsal);
    if (marcado) jugaron.push(dorsal);
  });

  return { dorsales, jugaron, huerfanas };
}


// Acepta varias formas de marcar: casilla de verificación, 1, X, SI...
function _ppEsMarca(v) {
  if (v === true) return true;
  const s = String(v === null || v === undefined ? "" : v).trim().toUpperCase();
  if (!s) return false;
  return ["1", "X", "SI", "SÍ", "S", "V", "TRUE", "VERDADERO", "✓"].indexOf(s) >= 0;
}


// Todo el que anotó puntos tuvo que estar en juego. Si alguien anotó
// y no está marcado, o la nómina quedó del partido anterior, aquí se
// detecta antes de escribir asistencias equivocadas.
function _ppCruzarAnotadores(nomina, eventos, nombreEquipo) {

  const marcados = {};
  nomina.jugaron.forEach(d => { marcados[d] = true; });

  const faltan = {};
  eventos.forEach(ev => {
    const d = String(ev.numero).trim();
    if (!marcados[d]) faltan[d] = true;
  });

  const lista = Object.keys(faltan);

  if (lista.length) {
    throw new Error(
      "En " + nombreEquipo + " hay dorsales que anotaron puntos pero no\n" +
      "están marcados como \"en Juego\": " + lista.join(", ") + ".\n\n" +
      "Puede ser una X olvidada, o que hayan quedado las marcas del\n" +
      "partido anterior. Borra la columna O y vuelve a marcar."
    );
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

  const planilla = ss.getSheetByName("PLANILLA");
  const estad    = ss.getSheetByName("EstadisticasJugadores");

  if (!estad) throw new Error("No se encontró la hoja 'EstadisticasJugadores'.");

  const ref = _ppMapaJugadores(ss, info);

  const eventosA = _ppLeerEventos(planilla, PP_COLS_A);
  const eventosB = _ppLeerEventos(planilla, PP_COLS_B);

  _ppEscribirEstadisticas(estad, ref.mapa, ref.idA, eventosA, info.equipoA, info.jornada);
  _ppEscribirEstadisticas(estad, ref.mapa, ref.idB, eventosB, info.equipoB, info.jornada);
}


// Devuelve { idA, idB, mapa } donde mapa["idEquipo_dorsal"] = nombre.
function _ppMapaJugadores(ss, info) {

  const jugadoresSheet = ss.getSheetByName("JUGADORES");
  const equiposSheet   = ss.getSheetByName("EQUIPOS");

  if (!jugadoresSheet) throw new Error("No se encontró la hoja 'JUGADORES'.");
  if (!equiposSheet)   throw new Error("No se encontró la hoja 'EQUIPOS'.");

  const dataEquipos = equiposSheet.getRange("A2:B" + equiposSheet.getLastRow()).getValues();

  let idA = null, idB = null;
  dataEquipos.forEach(e => {
    if (_ppNorm(e[1]) === _ppNorm(info.equipoA)) idA = e[0];
    if (_ppNorm(e[1]) === _ppNorm(info.equipoB)) idB = e[0];
  });

  if (idA === null) throw new Error("El equipo '" + info.equipoA + "' no está en la hoja EQUIPOS.");
  if (idB === null) throw new Error("El equipo '" + info.equipoB + "' no está en la hoja EQUIPOS.");

  const jugadores = jugadoresSheet.getRange("A2:D" + jugadoresSheet.getLastRow()).getValues();

  const mapa = {};
  jugadores.forEach(j => { mapa[j[2] + "_" + j[3]] = j[1]; });

  return { idA, idB, mapa };
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

  const filaEquipo = _ppBuscarBloque(estad, nombreEquipo, "EstadisticasJugadores");

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

  const nombres = estad.getRange(filaEquipo + 3, 1, 12, 1).getValues();

  for (const tipo of [1, 2, 3]) {

    const valores = [];

    for (let i = 0; i < 12; i++) {
      const nombre = String(nombres[i][0]).trim();
      const t = totales[nombre];
      valores.push([t ? t[tipo] : 0]);
    }

    estad.getRange(filaEquipo + 3, colDe[tipo], 12, 1).setValues(valores);
  }
}


// ============================================================
// PASO 4 — ASISTENCIAS desde la columna "en Juego" de la PLANILLA
//
// Escribe 1/0 para los 12 jugadores del equipo en la columna de esa
// fecha, y pone un 1 en la fila de encabezado ("Jugador"), que es la
// que alimenta las columnas Asistencia / Fechas / Fracción / % y la
// que lee la web para pintar los ✓ / ✗.
//
// Solo toca la columna de ESTA fecha y de ESTOS dos equipos: las
// demás fechas y los demás equipos quedan intactos. Reescribe, así
// que repetirlo no acumula.
// ============================================================
function _ppCargarAsistencias(ss, info) {

  const ws = ss.getSheetByName("AsistenciasJugadores");
  if (!ws) throw new Error("No se encontró la hoja 'AsistenciasJugadores'.");

  const ref = _ppMapaJugadores(ss, info);

  const nombresA = _ppNombresQueJugaron(ref.mapa, ref.idA, info.nominaA, info.equipoA);
  const nombresB = _ppNombresQueJugaron(ref.mapa, ref.idB, info.nominaB, info.equipoB);

  _ppEscribirAsistencias(ws, nombresA, info.equipoA, info.jornada);
  _ppEscribirAsistencias(ws, nombresB, info.equipoB, info.jornada);
}


// Convierte los dorsales marcados en nombres de jugador, validando
// que todos pertenezcan a ese equipo.
function _ppNombresQueJugaron(mapa, equipoID, nomina, nombreEquipo) {

  const nombres = [];
  const ajenos  = [];

  nomina.jugaron.forEach(dorsal => {
    const nombre = mapa[equipoID + "_" + dorsal];
    if (nombre) nombres.push(nombre);
    else ajenos.push(dorsal);
  });

  if (ajenos.length) {
    throw new Error(
      "En la nómina de " + nombreEquipo + " hay dorsales marcados que no\n" +
      "pertenecen a ese equipo según la hoja JUGADORES: " + ajenos.join(", ") + ".\n\n" +
      "Revisa el nombre del equipo en la PLANILLA y las X que hay\n" +
      "en la columna O."
    );
  }

  return nombres;
}


function _ppEscribirAsistencias(ws, nombresJugaron, nombreEquipo, jornada) {

  const filaTitulo = _ppBuscarBloque(ws, nombreEquipo, "AsistenciasJugadores");

  // Estructura de cada bloque (ver CrearAsistenciasJugadores):
  //   filaTitulo     -> "Equipo: XXX"
  //   filaTitulo + 1 -> fila de fechas
  //   filaTitulo + 2 -> fila "Jugador"  (marca de fechas jugadas)
  //   filaTitulo + 3 -> primer jugador (12 filas)
  const filaEncabezado = filaTitulo + 2;
  const filaPrimero    = filaTitulo + 3;

  // Columna B = fecha 1 ... columna K = fecha 10
  const col = 1 + Number(jornada);

  const jugo = {};
  nombresJugaron.forEach(n => { jugo[_ppNorm(n)] = true; });

  const nombres = ws.getRange(filaPrimero, 1, 12, 1).getValues();

  const valores = [];
  for (let i = 0; i < 12; i++) {
    const nombre = String(nombres[i][0]).trim();
    valores.push([(nombre && jugo[_ppNorm(nombre)]) ? 1 : 0]);
  }

  ws.getRange(filaPrimero, col, 12, 1).setValues(valores);

  // Marca la fecha como jugada (lo que cuenta "Fechas" y el %)
  ws.getRange(filaEncabezado, col).setValue(1);
}


// ============================================================
// UTILIDADES
// ============================================================

// Busca la fila del título "Equipo: XXX" dentro de una hoja por bloques.
function _ppBuscarBloque(ws, nombreEquipo, nombreHoja) {

  const data = ws.getDataRange().getValues();
  const buscado = _ppNorm(nombreEquipo);

  for (let i = 0; i < data.length; i++) {
    if (_ppNorm(data[i][0]).indexOf(buscado) >= 0) return i + 1;
  }

  throw new Error("No se encontró el bloque del equipo '" + nombreEquipo + "' en " + nombreHoja + ".");
}


// Normaliza nombres para comparar (sin tildes, sin dobles espacios).
function _ppNorm(v) {
  return String(v === null || v === undefined ? "" : v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
