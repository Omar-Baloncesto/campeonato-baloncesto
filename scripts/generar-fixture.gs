/**
 * Generador de FIXTURE para Google Sheets — equivalente a la macro de Excel
 * "CrearFixture", pero manteniendo las 12 columnas que lee la web
 * (ID_Partido, FechaNumero, ...), para no romper /fixture ni /predicciones.
 *
 * Replica del Excel:
 *   - Pide los 6 equipos y su color por nombre (mismos RGB).
 *   - Orden EXACTO de los 15 partidos (5 fechas x 3).
 *   - Ida y vuelta (la vuelta invierte local/visitante, +5 semanas).
 *   - Encabezado azul, letra blanca, negrita cursiva.
 *   - Texto blanco sobre fondos negro / gris / morado.
 *   - Horas 16:30 / 17:45 / 19:00 y una fecha por semana.
 *   - Diferencia automática (=MarcadorLocal - MarcadorVisitante).
 *   - Bordes y centrado en toda la tabla.
 *
 * Ejecutar con la hoja abierta (usa cuadros de diálogo).
 */
function crearFixture() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Colores por nombre — mismos valores RGB que el Excel.
  const mapaColores = {
    amarillo: '#FFFF00',
    azul: '#87CEEB',
    blanco: '#FFFFFF',
    negro: '#000000',
    verde: '#00FF00',
    rojo: '#FF0000',
    naranja: '#FFA500',
    morado: '#800080',
    gris: '#808080',
    fucsia: '#FF00FF',
  };
  // Fondos oscuros que llevan texto blanco (igual que el Excel).
  const fondoOscuro = { '#000000': true, '#808080': true, '#800080': true };

  // ---- 1) Nombres y colores de los 6 equipos ----
  const equipos = [];
  const colores = {}; // nombreEquipo -> hex
  for (let i = 1; i <= 6; i++) {
    let r = ui.prompt('Equipos', 'Ingrese el nombre del equipo ' + i, ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) return;
    const nombre = r.getResponseText().trim();
    equipos.push(nombre);

    r = ui.prompt(
      'Color del equipo',
      'Color para "' + nombre + '" (Amarillo, Azul, Blanco, Negro, Verde, Rojo, Naranja, Morado, Gris, Fucsia)',
      ui.ButtonSet.OK_CANCEL
    );
    if (r.getSelectedButton() !== ui.Button.OK) return;
    const nombreColor = r.getResponseText().trim().toLowerCase();
    colores[nombre] = mapaColores[nombreColor] || '#FFFFFF';
  }

  // ---- 2) Fecha de inicio (dd/mm/aaaa) ----
  let r = ui.prompt('Fecha de inicio', 'Ingrese la fecha de inicio (dd/mm/aaaa):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const partes = r.getResponseText().trim().split(/[\/\-.]/);
  const fechaInicio = new Date(
    parseInt(partes[2], 10),
    parseInt(partes[1], 10) - 1,
    parseInt(partes[0], 10)
  );

  // ---- 3) Orden EXACTO del Excel (base 0). [local, visitante] ----
  const orden = [
    [0, 5], [1, 4], [2, 3], // Fecha 1: 1-6, 2-5, 3-4
    [1, 3], [0, 4], [2, 5], // Fecha 2: 2-4, 1-5, 3-6
    [4, 2], [5, 3], [0, 1], // Fecha 3: 5-3, 6-4, 1-2
    [3, 0], [1, 2], [4, 5], // Fecha 4: 4-1, 2-3, 5-6
    [3, 4], [0, 2], [5, 1], // Fecha 5: 4-5, 1-3, 6-2
  ];
  const horas = ['16:30', '17:45', '19:00'];
  const MS_SEMANA = 7 * 24 * 60 * 60 * 1000;

  // ---- 4) Construir filas: ida + vuelta ----
  const filas = [];
  const nRonda = orden.length;

  // Ida (fechas 1..5)
  for (let i = 0; i < nRonda; i++) {
    const fechaNum = Math.floor(i / 3) + 1;
    const fecha = new Date(fechaInicio.getTime() + (fechaNum - 1) * MS_SEMANA);
    filas.push([
      'P-' + (i + 1), fechaNum,
      equipos[orden[i][0]], 'vs', equipos[orden[i][1]],
      fecha, horas[i % 3], '', '', '', '', '',
    ]);
  }
  // Vuelta (fechas 6..10, local/visitante invertidos)
  for (let i = 0; i < nRonda; i++) {
    const fechaNum = Math.floor(i / 3) + 6;
    const fecha = new Date(fechaInicio.getTime() + (fechaNum - 1) * MS_SEMANA);
    filas.push([
      'P-' + (nRonda + i + 1), fechaNum,
      equipos[orden[i][1]], 'vs', equipos[orden[i][0]],
      fecha, horas[i % 3], '', '', '', '', '',
    ]);
  }

  // ---- 5) Crear / limpiar la hoja FIXTURE ----
  let hoja = ss.getSheetByName('FIXTURE');
  if (!hoja) hoja = ss.insertSheet('FIXTURE');
  else hoja.clear();

  const encabezado = [
    'ID_Partido', 'FechaNumero', 'Local', 'vs', 'Visitante', 'Fecha', 'Hora',
    'MarcadorLocal', 'MarcadorVisitante', 'Diferencia', 'W.O.', 'Equipo Ausente',
  ];
  const totalCols = encabezado.length;
  const totalFilas = filas.length + 1;

  // La hora se guarda como texto ("16:30") para que la web la lea tal cual.
  hoja.getRange(2, 7, filas.length, 1).setNumberFormat('@');

  hoja.getRange(1, 1, 1, totalCols).setValues([encabezado]);
  hoja.getRange(2, 1, filas.length, totalCols).setValues(filas);

  // ---- 6) Encabezado: azul, letra blanca, negrita cursiva ----
  hoja.getRange(1, 1, 1, totalCols)
    .setBackground('#0066CC')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontStyle('italic')
    .setFontSize(12)
    .setWrap(true);

  // ---- 7) Anchos de columna ----
  const anchos = [90, 100, 180, 40, 180, 110, 80, 120, 140, 100, 60, 200];
  anchos.forEach((w, idx) => hoja.setColumnWidth(idx + 1, w));

  // ---- 8) Colorear equipos (Local = col 3, Visitante = col 5) ----
  for (let f = 0; f < filas.length; f++) {
    const fila = f + 2;
    const cLocal = colores[filas[f][2]];
    const cVis = colores[filas[f][4]];
    if (cLocal) {
      hoja.getRange(fila, 3)
        .setBackground(cLocal)
        .setFontColor(fondoOscuro[cLocal] ? '#FFFFFF' : '#000000')
        .setFontWeight('bold')
        .setFontStyle('italic');
    }
    if (cVis) {
      hoja.getRange(fila, 5)
        .setBackground(cVis)
        .setFontColor(fondoOscuro[cVis] ? '#FFFFFF' : '#000000')
        .setFontWeight('bold')
        .setFontStyle('italic');
    }
  }

  // ---- 9) Diferencia automática (=H - I) ----
  const formulas = [];
  for (let f = 2; f <= totalFilas; f++) formulas.push(['=H' + f + '-I' + f]);
  hoja.getRange(2, 10, formulas.length, 1).setFormulas(formulas);

  // ---- 10) Centrado, formato de fecha y bordes ----
  hoja.getRange(1, 1, totalFilas, totalCols)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, true);

  hoja.getRange(2, 6, filas.length, 1).setNumberFormat('dd/mm/yyyy');
}
