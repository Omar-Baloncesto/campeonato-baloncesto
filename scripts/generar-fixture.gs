/**
 * Orden del FIXTURE (Google Apps Script) — idéntico a la macro de Excel.
 * ---------------------------------------------------------------------
 * La diferencia entre el Excel y el Google Sheets NO estaba en los equipos,
 * sino en el ORDEN de los partidos y en quién juega de local/visitante.
 * Todo eso vive en el arreglo `orden`.
 *
 * `orden` usa índices base 0:  equipo 1 = 0, equipo 2 = 1, ... equipo 6 = 5.
 * Cada par [local, visitante] respeta el lado local/visitante del Excel.
 * Está agrupado en 5 fechas de 3 partidos cada una.
 *
 * Pega este arreglo en tu Script en reemplazo del `orden` anterior. El resto
 * de tu generador (segunda ronda, horas, colores, bordes) no cambia.
 */

const orden = [
  [0, 5], [1, 4], [2, 3], // Fecha 1: 1-6, 2-5, 3-4
  [1, 3], [0, 4], [2, 5], // Fecha 2: 2-4, 1-5, 3-6
  [4, 2], [5, 3], [0, 1], // Fecha 3: 5-3, 6-4, 1-2
  [3, 0], [1, 2], [4, 5], // Fecha 4: 4-1, 2-3, 5-6
  [3, 4], [0, 2], [5, 1], // Fecha 5: 4-5, 1-3, 6-2
];

/**
 * Genera el fixture y lo escribe en la hoja FIXTURE.
 * Ajusta NOMBRE_HOJA y `equipos` a tu realidad.
 */
function generarFixture() {
  const NOMBRE_HOJA = 'FIXTURE';

  // Nombres de los 6 equipos (posición 0 = equipo 1, etc.).
  const equipos = [
    'Equipo 1',
    'Equipo 2',
    'Equipo 3',
    'Equipo 4',
    'Equipo 5',
    'Equipo 6',
  ];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(NOMBRE_HOJA) || ss.insertSheet(NOMBRE_HOJA);

  // Encabezado (mismas columnas que lee la app: A=id, B=jornada, C=local,
  // D=vs, E=visitante, F=fecha, G=hora, H=marcador local, I=marcador visitante).
  const encabezado = [
    'ID', 'Jornada', 'Local', '', 'Visitante', 'Fecha', 'Hora', 'ML', 'MV',
  ];

  const filas = [encabezado];
  const PARTIDOS_POR_FECHA = 3;

  for (let i = 0; i < orden.length; i++) {
    const [localIdx, visitanteIdx] = orden[i];
    const jornada = Math.floor(i / PARTIDOS_POR_FECHA) + 1; // 1..5

    filas.push([
      i + 1,                    // ID (1..15)
      'Fecha ' + jornada,       // Jornada
      equipos[localIdx],        // Local
      'vs',                     // separador
      equipos[visitanteIdx],    // Visitante
      '',                       // Fecha (a completar)
      '',                       // Hora  (a completar)
      '',                       // Marcador local
      '',                       // Marcador visitante
    ]);
  }

  hoja.clearContents();
  hoja.getRange(1, 1, filas.length, encabezado.length).setValues(filas);
}
