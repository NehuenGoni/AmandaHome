export interface Province {
  /** Código de provincia usado por la API de MiCorreo (Correo Argentino). */
  code: string;
  name: string;
}

/** Las 24 provincias argentinas con su código MiCorreo. */
export const PROVINCES: Province[] = [
  { code: "B", name: "Buenos Aires" },
  { code: "C", name: "Ciudad Autónoma de Buenos Aires" },
  { code: "K", name: "Catamarca" },
  { code: "H", name: "Chaco" },
  { code: "U", name: "Chubut" },
  { code: "X", name: "Córdoba" },
  { code: "W", name: "Corrientes" },
  { code: "E", name: "Entre Ríos" },
  { code: "P", name: "Formosa" },
  { code: "Y", name: "Jujuy" },
  { code: "L", name: "La Pampa" },
  { code: "F", name: "La Rioja" },
  { code: "M", name: "Mendoza" },
  { code: "N", name: "Misiones" },
  { code: "Q", name: "Neuquén" },
  { code: "R", name: "Río Negro" },
  { code: "A", name: "Salta" },
  { code: "J", name: "San Juan" },
  { code: "D", name: "San Luis" },
  { code: "Z", name: "Santa Cruz" },
  { code: "S", name: "Santa Fe" },
  { code: "G", name: "Santiago del Estero" },
  { code: "V", name: "Tierra del Fuego" },
  { code: "T", name: "Tucumán" },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Busca una provincia por nombre (tolerante a acentos/mayúsculas, para
 * direcciones viejas cargadas como texto libre) o por código MiCorreo.
 */
export function findProvince(nameOrCode: string): Province | undefined {
  const normalized = normalize(nameOrCode);
  return PROVINCES.find(
    (p) => p.code.toLowerCase() === normalized || normalize(p.name) === normalized,
  );
}
