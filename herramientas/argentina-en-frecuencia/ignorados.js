// Lista colaborativa de indicativos a ignorar por defecto.
// Esta lista puede ser actualizada por la comunidad.
// Incluir aquí indicativos de especiales
// de los cuales no se puede inferir la provincia.
const INDICATIVOS_IGNORADOS_POR_DEFECTO = new Set([
  // Ejemplos de indicativos de eventos especiales que podrían no contar:
  "LT4RCA", "LT4YOTA", "LO44SUSJ",
  // ... agregar más indicativos aquí a medida que se necesite.
]);