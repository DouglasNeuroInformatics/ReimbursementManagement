import { z } from "zod";

export const CODES_SECONDAIRES = [
  { code: "36001", description: "Recouvrement coûts fond spécial Douglas Recherche" },
  { code: "39755", description: "Avance dépenses à être redistribuées" },
  { code: "52010", description: "Réactifs" },
  { code: "52490", description: "Autres fournitures - laboratoires" },
  { code: "53200", description: "Substances radioactives" },
  { code: "53320", description: "Films radiologiques" },
  { code: "53389", description: "Glace sèche" },
  { code: "61495", description: "Contrats de service - équipement médical" },
  { code: "61630", description: "Contrat de serv - Entr. des logiciels" },
  { code: "61795", description: "Services achetés autres (Dropbox,…)" },
  { code: "62590", description: "Petits équip non cap - Autres (A1)*" },
  { code: "64010", description: "Livres, revues et abonnements (articles scientifiques)" },
  { code: "64040", description: "Papeterie et fournitures de bureau" },
  { code: "61640", description: "Contrat de services - Équip. Inform." },
  { code: "58045", description: "Lait maternisé" },
  { code: "58005", description: "Viande" },
  { code: "58030", description: "Fruits et légumes" },
  { code: "64050", description: "Fournitures - imprimerie" },
  { code: "65030", description: "Logiciels non capitalisés" },
  { code: "65090", description: "Autres fournitures - informatique" },
  { code: "65510", description: "Frais de poste - Taxi (champion) - messagerie" },
  { code: "65530", description: "Téléphone (Vidéotron)" },
  { code: "66340", description: "Représ voy- Dép, héb, repas - synd (Per diem)" },
  { code: "66390", description: "Services traiteurs" },
  { code: "67195", description: "Honoraires professionnels - Autres" },
  { code: "67250", description: "Cotisations - Autres (Visa étudiant)" },
  { code: "67432", description: "Publicité - Autres" },
  { code: "67850", description: "Transport banque de cerveaux" },
  { code: "67851", description: "Compensation - sujet de recherche" },
] as const;

export const CODE_SECONDAIRE_VALUES = CODES_SECONDAIRES.map((c) => c.code) as [
  string,
  ...string[],
];

export const codeSecondaireSchema = z.enum(CODE_SECONDAIRE_VALUES);

export const isValidCode = (code: string): boolean =>
  CODE_SECONDAIRE_VALUES.includes(code);
