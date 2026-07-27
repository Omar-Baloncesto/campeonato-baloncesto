/**
 * Generador de FIXTURE (Google Apps Script).
 *
 * Lee equipos y colores desde la hoja "EQUIPOS" (columna B = nombre,
 * columna F = color) y escribe el fixture en la hoja "FIXTURE" con las 12
 * columnas que lee la web (/fixture, /predicciones).
 *
 * El orden de los 15 partidos y el lado local/visitante son IDÉNTICOS a la
 * macro de Excel "CrearFixture". Ese orden vive en el arreglo `orden`:
 *   índices base 0 (equipo 1 = 0 ... equipo 6 = 5), cada par [local, visitante],
 *   agrupado en 5 fechas de 3 partidos. La segunda ronda invierte los lados.
 */
function generarFixture() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const equiposSheet = ss.getSheetByName("EQUIPOS");
  const partidosSheet = ss.getSheetByName("FIXTURE");

  partidosSheet.clear();

  // ===== MAPA DE COLORES =====
  const datosEquipos = equiposSheet.getRange("B2:F").getValues();

  let colores = {};
  datosEquipos.forEach(fila => {
    const nombre = String(fila[0]).trim();
    const color = String(fila[4]).trim();

    if (nombre && color) {
      colores[nombre] = color;
    }
  });

  // ===== LISTA DE EQUIPOS =====
  const equipos = equiposSheet.getRange("B2:B").getValues()
    .flat()
    .map(e => String(e).trim())
    .filter(e => e != "");

  if (equipos.length !== 6) {
    SpreadsheetApp.getUi().alert("⚠️ Esta versión está diseñada para 6 equipos.");
    return;
  }

  // ===== PEDIR FECHA DE INICIO =====
  const ui = SpreadsheetApp.getUi();

  let respuesta = ui.prompt(
    "Fecha de inicio del campeonato",
    "Ingrese la fecha en formato DD/MM/AAAA (Ej: 25/03/2026):",
    ui.ButtonSet.OK_CANCEL
  );

  if (respuesta.getSelectedButton() !== ui.Button.OK) {
    ui.alert("Operación cancelada");
    return;
  }

  let textoFecha = respuesta.getResponseText().trim();
  let partes = textoFecha.split("/");

  if (partes.length !== 3) {
    ui.alert("Formato inválido. Usa DD/MM/AAAA");
    return;
  }

  let dia = parseInt(partes[0], 10);
  let mes = parseInt(partes[1], 10) - 1;
  let anio = parseInt(partes[2], 10);

  let fechaInicio = new Date(anio, mes, dia);

  if (isNaN(fechaInicio.getTime())) {
    ui.alert("Fecha inválida");
    return;
  }

  // ===== FIXTURE EXACTO COMO EL EXCEL =====
  // [local, visitante] base 0 (equipo 1 = 0 ... equipo 6 = 5).
  let partidos = [];

  const orden = [
    [0,5],[1,4],[2,3],   // Fecha 1: 1-6, 2-5, 3-4
    [1,3],[0,4],[2,5],   // Fecha 2: 2-4, 1-5, 3-6
    [4,2],[5,3],[0,1],   // Fecha 3: 5-3, 6-4, 1-2
    [3,0],[1,2],[4,5],   // Fecha 4: 4-1, 2-3, 5-6
    [3,4],[0,2],[5,1]    // Fecha 5: 4-5, 1-3, 6-2
  ];

  for (let i = 0; i < orden.length; i++) {

    let local = equipos[orden[i][0]];
    let visitante = equipos[orden[i][1]];

    let fechaNum = Math.floor(i / 3) + 1;

    let fecha = new Date(fechaInicio.getTime() + (fechaNum - 1) * 7 * 24 * 60 * 60 * 1000);

    let hora = (i % 3 === 0) ? "16:30" :
               (i % 3 === 1) ? "17:45" : "19:00";

    // Cada fila tiene 12 elementos.
    // Columnas A-J: como antes. Columnas K y L: vacías (se llenan al marcar W.O.)
    partidos.push([
      "P-" + (i + 1),
      fechaNum,
      local,
      "vs",
      visitante,
      fecha,
      hora,
      "", "", "",
      "", ""    // K (W.O.) y L (Equipo Ausente)
    ]);
  }

  // ===== SEGUNDA RONDA (invierte local y visitante, +5 semanas) =====
  const segunda = partidos.map((p, index) => {

    let fechaNum = p[1] + 5;

    return [
      "P-" + (partidos.length + index + 1),
      fechaNum,
      p[4],
      "vs",
      p[2],
      new Date(p[5].getTime() + 5 * 7 * 24 * 60 * 60 * 1000),
      p[6],
      "", "", "",
      "", ""    // K y L vacías
    ];
  });

  const total = partidos.concat(segunda);

  // ===== ENCABEZADOS =====
  partidosSheet.appendRow([
    "ID_Partido","FechaNumero","Local","vs","Visitante",
    "Fecha","Hora","MarcadorLocal","MarcadorVisitante","Diferencia",
    "W.O.","Equipo Ausente"
  ]);

  // ===== FORMATO ENCABEZADOS =====
  const ultimaColumna = partidosSheet.getLastColumn();

  const rangoTitulos = partidosSheet.getRange(1, 1, 1, ultimaColumna);

  rangoTitulos
    .setBackground("#D9EAF7")
    .setFontWeight("bold")
    .setFontStyle("italic")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true);

  // ===== INSERTAR DATOS =====
  partidosSheet.getRange(2,1,total.length,total[0].length).setValues(total);

  // ===== ANCHO DE COLUMNAS =====
  partidosSheet.setColumnWidth(1, 100);
  partidosSheet.setColumnWidth(2, 110);
  partidosSheet.setColumnWidth(3, 180);
  partidosSheet.setColumnWidth(4, 50);
  partidosSheet.setColumnWidth(5, 180);
  partidosSheet.setColumnWidth(6, 110);
  partidosSheet.setColumnWidth(7, 90);
  partidosSheet.setColumnWidth(8, 120);
  partidosSheet.setColumnWidth(9, 140);
  partidosSheet.setColumnWidth(10, 100);
  partidosSheet.setColumnWidth(11, 80);   // W.O.
  partidosSheet.setColumnWidth(12, 200);  // Equipo Ausente

  // ===== BORDES =====
  const totalFilas = total.length + 1;
  const totalColumnas = total[0].length;

  partidosSheet.getRange(1, 1, totalFilas, totalColumnas)
    .setBorder(true,true,true,true,true,true);

  // ===== CENTRAR COLUMNAS =====
  const columnasCentrar = [1,2,4,6,7,8,9,10,11,12];

  columnasCentrar.forEach(col => {
    partidosSheet.getRange(1, col, totalFilas, 1)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
  });

  // ===== DIFERENCIA AUTOMÁTICA =====
  for (let i = 2; i <= totalFilas; i++) {
    partidosSheet.getRange("J" + i)
      .setFormula(`=H${i}-I${i}`);
  }

  // ===== COLORES AUTOMÁTICOS =====
  for (let i = 0; i < total.length; i++) {

    let fila = i + 2;

    let local = String(total[i][2]).trim();
    let visitante = String(total[i][4]).trim();

    let colorLocal = colores[local];
    let colorVisitante = colores[visitante];

    if (colorLocal) {
      let textoLocal = getColorTexto(colorLocal);

      partidosSheet.getRange(fila, 3)
        .setBackground(colorLocal)
        .setFontColor(textoLocal)
        .setFontWeight("bold");
    }

    if (colorVisitante) {
      let textoVisitante = getColorTexto(colorVisitante);

      partidosSheet.getRange(fila, 5)
        .setBackground(colorVisitante)
        .setFontColor(textoVisitante)
        .setFontWeight("bold");
    }
  }
}

/**
 * Devuelve "#FFFFFF" (texto blanco) para fondos oscuros y "#000000" (texto
 * negro) para fondos claros, calculando la luminancia del color de fondo.
 * Acepta colores en formato "#RRGGBB".
 */
function getColorTexto(colorFondo) {
  let hex = String(colorFondo).replace("#", "").trim();
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) return "#000000";

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Luminancia percibida (0 = oscuro, 255 = claro).
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b);

  return luminancia < 140 ? "#FFFFFF" : "#000000";
}
