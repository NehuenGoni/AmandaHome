/**
 * Datos legales y de contacto del negocio. Los valores "COMPLETAR" deben
 * reemplazarse con los datos reales antes de publicar las páginas legales.
 */
export const BUSINESS = {
  name: "Amanda Home & Deco",
  legalName: "Salinas Nancy Antonia",
  cuit: "27-22052821-4",
  address: "Av. El Callao 1585, Grand Bourg",
  streetAddress: "Av. El Callao 1585",
  locality: "Grand Bourg",
  region: "Buenos Aires",
  postalCode: "B1615DDE",
  countryCode: "AR",
  /** Coordenadas aproximadas de Grand Bourg: ajustar con las exactas de la ficha de Google Maps. */
  geo: { latitude: -34.4906, longitude: -58.7239 },
  /** Formato schema.org: días + rango horario (dos turnos). */
  openingHours: [
    { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "09:30", closes: "13:00" },
    { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "16:30", closes: "20:00" },
  ],
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Av.+El+Callao+1585,+Grand+Bourg,+Buenos+Aires",
  city: "Buenos Aires, Argentina",
  phone: "11 3758-2353",
  whatsappNumber: "5491137582353",
  whatsappUrl: "https://wa.me/5491137582353",
  email: "homedecoamanda@gmail.com",
  instagramUrl: "https://www.instagram.com/homedecoamanda/",
  consumerDefenseUrl: "https://www.argentina.gob.ar/produccion/defensadelconsumidor",
  /** Días corridos para ejercer el arrepentimiento (Ley 24.240, art. 34). */
  withdrawalDays: 10,
} as const;
