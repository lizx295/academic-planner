/* =====================================================================
   Banco de universidades del Ecuador (nacionales reconocidas).
   Fuente: registro público de instituciones de educación superior
   (SENESCYT / CACES, corte 2026). Cada entrada incluye aliases para
   buscar por sigla o nombre corto además del nombre oficial.
   ===================================================================== */

export interface University {
  name: string;
  city: string;
  aliases: string[];
}

export const UNIVERSITIES: University[] = [
  // Sierra centro-norte
  { name: "Escuela Politécnica Nacional", city: "Quito", aliases: ["EPN", "Politécnica Nacional"] },
  { name: "Universidad Central del Ecuador", city: "Quito", aliases: ["UCE", "Central", "Central del Ecuador"] },
  { name: "Pontificia Universidad Católica del Ecuador", city: "Quito", aliases: ["PUCE", "Católica del Ecuador", "Católica Quito"] },
  { name: "Universidad de las Fuerzas Armadas ESPE", city: "Sangolquí", aliases: ["ESPE", "Fuerzas Armadas"] },
  { name: "Universidad San Francisco de Quito", city: "Quito", aliases: ["USFQ", "San Francisco"] },
  { name: "Universidad de las Américas", city: "Quito", aliases: ["UDLA", "Las Américas"] },
  { name: "Universidad Internacional del Ecuador", city: "Quito", aliases: ["UIDE", "Internacional"] },
  { name: "Universidad UTE", city: "Quito", aliases: ["UTE", "Equinoccial", "Tecnológica Equinoccial"] },
  { name: "Universidad Internacional SEK", city: "Quito", aliases: ["UISEK", "SEK", "Particular Internacional SEK"] },
  { name: "Universidad Tecnológica Indoamérica", city: "Quito", aliases: ["UTI", "Indoamérica"] },
  { name: "Universidad Tecnológica Israel", city: "Quito", aliases: ["UISRAEL", "Israel"] },
  { name: "Universidad Tecnológica América", city: "Quito", aliases: ["UNITA", "Tecnológica América"] },
  { name: "Universidad Metropolitana", city: "Quito", aliases: ["UMET", "Metropolitana del Ecuador"] },
  { name: "Universidad de Los Hemisferios", city: "Quito", aliases: ["Hemisferios"] },
  { name: "Universidad de Especialidades Turísticas", city: "Quito", aliases: ["UCT", "Especialidades Turísticas"] },
  { name: "Universidad Iberoamericana del Ecuador", city: "Quito", aliases: ["UNIB.E", "Iberoamericana"] },
  { name: "Universidad Andina Simón Bolívar", city: "Quito", aliases: ["UASB", "Andina", "Simón Bolívar"] },
  { name: "Universidad Politécnica Salesiana", city: "Cuenca", aliases: ["UPS", "Salesiana"] },
  { name: "Universidad Nacional de Educación", city: "Azogues", aliases: ["UNAE", "Nacional de Educación"] },
  { name: "Universidad Politécnica Estatal del Carchi", city: "Tulcán", aliases: ["UPEC", "Politécnica del Carchi"] },
  { name: "Universidad Técnica del Norte", city: "Ibarra", aliases: ["UTN", "Técnica del Norte"] },
  { name: "Universidad de Otavalo", city: "Otavalo", aliases: ["UDOTAVALO", "Otavalo"] },
  { name: "Universidad de Investigación de Tecnología Experimental Yachay", city: "Urcuquí", aliases: ["Yachay", "Yachay Tech"] },
  { name: "Universidad Técnica de Ambato", city: "Ambato", aliases: ["UTA", "Técnica de Ambato"] },
  { name: "Universidad Nacional de Chimborazo", city: "Riobamba", aliases: ["UNACH", "Chimborazo"] },
  { name: "Escuela Superior Politécnica de Chimborazo", city: "Riobamba", aliases: ["ESPOCH", "Politécnica de Chimborazo"] },
  { name: "Universidad Técnica de Cotopaxi", city: "Latacunga", aliases: ["UTC", "Técnica de Cotopaxi"] },
  { name: "Universidad Regional Autónoma de los Andes", city: "Ambato", aliases: ["UNIANDES", "Autónoma de los Andes"] },
  { name: "Universidad Estatal de Bolívar", city: "Guaranda", aliases: ["UEB", "Estatal de Bolívar"] },

  // Sierra centro-sur
  { name: "Universidad de Cuenca", city: "Cuenca", aliases: ["UCuenca", "Cuenca"] },
  { name: "Universidad del Azuay", city: "Cuenca", aliases: ["UAZUAY", "del Azuay"] },
  { name: "Universidad Católica de Cuenca", city: "Cuenca", aliases: ["UCACUE", "Católica de Cuenca"] },
  { name: "Universidad Nacional de Loja", city: "Loja", aliases: ["UNL", "Nacional de Loja"] },
  { name: "Universidad Técnica Particular de Loja", city: "Loja", aliases: ["UTPL", "Técnica Particular", "Particular de Loja"] },
  { name: "Universidad Estatal Amazónica", city: "Puyo", aliases: ["UEA", "Estatal Amazónica"] },
  { name: "Universidad Regional Amazónica IKIAM", city: "Tena", aliases: ["IKIAM", "Regional Amazónica"] },

  // Costa
  { name: "Universidad de Guayaquil", city: "Guayaquil", aliases: ["UG", "de Guayaquil"] },
  { name: "Escuela Superior Politécnica del Litoral", city: "Guayaquil", aliases: ["ESPOL", "Politécnica del Litoral"] },
  { name: "Universidad Católica de Santiago de Guayaquil", city: "Guayaquil", aliases: ["UCSG", "Católica de Guayaquil"] },
  { name: "Universidad Laica Vicente Rocafuerte de Guayaquil", city: "Guayaquil", aliases: ["ULVR", "Vicente Rocafuerte"] },
  { name: "Universidad de Especialidades Espíritu Santo", city: "Samborondón", aliases: ["UEES", "Espíritu Santo"] },
  { name: "Universidad Tecnológica Ecotec", city: "Samborondón", aliases: ["ECOTEC", "Tecnológica Ecotec"] },
  { name: "Universidad Casa Grande", city: "Guayaquil", aliases: ["UCG", "Casa Grande"] },
  { name: "Universidad Agraria del Ecuador", city: "Guayaquil", aliases: ["UAE", "Agraria del Ecuador"] },
  { name: "Universidad Bolivariana del Ecuador", city: "Durán", aliases: ["UBE", "Bolivariana del Ecuador"] },
  { name: "Universidad del Pacífico - Escuela de Negocios", city: "Guayaquil", aliases: ["UPACIFICO", "Pacífico", "Escuela de Negocios"] },
  { name: "Universidad Tecnológica Empresarial de Guayaquil", city: "Guayaquil", aliases: ["UTEG", "Empresarial de Guayaquil"] },
  { name: "Universidad de las Artes", city: "Guayaquil", aliases: ["UARTES", "de las Artes"] },
  { name: "Universidad Tecnológica del Ecuador", city: "Guayaquil", aliases: ["UTEC", "Tecnológica del Ecuador"] },
  { name: "Universidad Técnica de Babahoyo", city: "Babahoyo", aliases: ["UTB", "Técnica de Babahoyo"] },
  { name: "Universidad Técnica Estatal de Quevedo", city: "Quevedo", aliases: ["UTEQ", "Estatal de Quevedo"] },
  { name: "Universidad Técnica de Machala", city: "Machala", aliases: ["UTMACH", "Técnica de Machala"] },
  { name: "Universidad Tecnológica San Antonio de Machala", city: "Machala", aliases: ["UTSAM", "San Antonio de Machala"] },
  { name: "Universidad Técnica de Manabí", city: "Portoviejo", aliases: ["UTM", "Técnica de Manabí"] },
  { name: "Universidad San Gregorio de Portoviejo", city: "Portoviejo", aliases: ["USGP", "San Gregorio"] },
  { name: "Escuela Superior Politécnica Agropecuaria de Manabí Manuel Félix López", city: "Calceta", aliases: ["ESPAM", "Politécnica Agropecuaria", "Manuel Félix López"] },
  { name: "Universidad Laica Eloy Alfaro de Manabí", city: "Manta", aliases: ["ULEAM", "Eloy Alfaro"] },
  { name: "Universidad Estatal del Sur de Manabí", city: "Jipijapa", aliases: ["UNESUM", "Sur de Manabí"] },
  { name: "Universidad Estatal Península de Santa Elena", city: "Santa Elena", aliases: ["UPSE", "Península de Santa Elena"] },
  { name: "Universidad Estatal de Milagro", city: "Milagro", aliases: ["UNEMI", "Estatal de Milagro"] },
];

const VOWEL_VARIANTS: Record<string, string> = {
  a: "aáàäâãå",
  e: "eéèëê",
  i: "iíìïî",
  o: "oóòöôõ",
  u: "uúùüû",
  n: "nñ",
  c: "cç",
  y: "yý",
};

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeRegex(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Convierte un término a un regex insensible a acentos. */
function accentAwareRegex(token: string): RegExp {
  const pattern = [...token]
    .map((ch) => {
      const variants = VOWEL_VARIANTS[ch];
      return variants ? `[${variants}]` : escapeRegex(ch);
    })
    .join("");
  return new RegExp(pattern, "i");
}

/** Busca universidades por nombre, ciudad o sigla (sin acentos). */
export function searchUniversities(query: string, limit = 7): University[] {
  const tokens = normalizeText(query)
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return [];

  const scored: Array<{ uni: University; score: number }> = [];
  for (const uni of UNIVERSITIES) {
    const haystack = normalizeText([uni.name, uni.city, ...uni.aliases].join(" "));
    if (!tokens.every((t) => haystack.includes(t))) continue;

    const normName = normalizeText(uni.name);
    let score = 1;
    if (normName.startsWith(tokens[0])) score += 4;
    else if (normName.includes(tokens[0])) score += 3;
    else if (normalizeText(uni.city).includes(tokens[0])) score += 2;
    else score += 1;
    scored.push({ uni, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.uni);
}

export interface HighlightPart {
  text: string;
  hit: boolean;
}

/** Divide el nombre resaltando la primera coincidencia de la búsqueda. */
export function highlightName(name: string, query: string): HighlightPart[] {
  const token = normalizeText(query).split(/\s+/).filter(Boolean)[0];
  if (!token) return [{ text: name, hit: false }];
  const re = accentAwareRegex(token);
  const match = re.exec(name);
  if (!match) return [{ text: name, hit: false }];

  const parts: HighlightPart[] = [];
  if (match.index > 0) parts.push({ text: name.slice(0, match.index), hit: false });
  parts.push({ text: match[0], hit: true });
  const tail = name.slice(match.index + match[0].length);
  if (tail) parts.push({ text: tail, hit: false });
  return parts;
}

/** Si el texto coincide exactamente con una universidad del banco. */
export function findExactUniversity(name: string): University | undefined {
  const norm = normalizeText(name.trim());
  return UNIVERSITIES.find((u) => normalizeText(u.name) === norm);
}