import type { ErrorCode, ValidationIssueCode } from "./errorCodes.ts";
import { DEFAULT_LOCALE, type Locale, SUPPORTED_LOCALES } from "./locales.ts";

// English server-side fallback strings. Render only when the frontend lacks a
// translation for a given code (version skew). The frontend's errors.json is
// the authoritative source for what users actually see.
const EN: Record<ErrorCode, string> = {
  INTERNAL_ERROR: "Internal server error",
  VALIDATION_ERROR: "Validation error",
  AUTH_REQUIRED: "Authentication required",
  AUTH_INVALID_TOKEN: "Invalid or expired token",
  AUTH_INVALID_CREDENTIALS: "Invalid credentials",
  AUTH_EMAIL_IN_USE: "Email already in use",
  AUTH_REFRESH_TOKEN_MISSING: "No refresh token provided",
  AUTH_REFRESH_TOKEN_INVALID: "Invalid refresh token",
  AUTH_REFRESH_TOKEN_EXPIRED: "Refresh token expired",
  AUTH_CSRF_FAILED: "CSRF check failed: missing X-Requested-With header",
  AUTH_FORBIDDEN_ROLE: "Access denied. Required role(s): {{roles}}",
  AUTH_RATE_LIMITED: "Too many requests — please wait a minute and try again",
  USER_NOT_FOUND: "User not found",
  USER_SUPERVISOR_INVALID_ROLE:
    "Assigned supervisor must have SUPERVISOR or FINANCIAL_ADMIN role",
  SUPERVISOR_NOT_FOUND: "Supervisor not found",
  ACCOUNT_NOT_FOUND: "Account not found",
  ACCOUNT_NUMBER_DUPLICATE: "Account number already exists for this supervisor",
  ACCOUNT_NOT_SUPERVISOR_ROLE: "Target user does not have a supervisor role",
  ACCOUNT_OWN_ONLY: "Can only view your own accounts",
  REQUEST_NOT_FOUND: "Request not found",
  REQUEST_ACCESS_DENIED: "Access denied",
  REQUEST_OWNER_ONLY_EDIT: "Only the request owner can edit it",
  REQUEST_WRONG_STATUS_EDIT: "Cannot edit request with status: {{status}}",
  REQUEST_WRONG_STATUS_DELETE: "Cannot delete request with status: {{status}}",
  REQUEST_WRONG_STATUS_SUBMIT: "Cannot submit request with status: {{status}}",
  REQUEST_WRONG_STATUS_REVISE: "Cannot revise request with status: {{status}}",
  TRAVEL_DETAILS_REQUIRED: "Travel details are required before submission",
  TRAVEL_DESTINATION_REQUIRED: "Destination is required",
  TRAVEL_PURPOSE_REQUIRED: "Purpose is required",
  LINKED_ADVANCE_MISSING: "Linked travel advance does not exist",
  LINKED_ADVANCE_NOT_OWNED: "Linked travel advance does not belong to you",
  LINKED_ADVANCE_WRONG_TYPE: "Linked request is not a travel advance",
  LINKED_ADVANCE_NOT_PAID: "Linked travel advance must be paid",
  APPROVAL_WRONG_STATUS: "Cannot {{verb}} request with status: {{status}}",
  APPROVAL_WRONG_SUPERVISOR:
    "This request is assigned to a different supervisor",
  APPROVAL_ACCOUNT_NOT_FOUND: "Account not found for this supervisor",
  APPROVAL_ACCOUNT_INACTIVE: "Selected account is inactive",
  APPROVAL_ALREADY_APPROVED: "You have already approved this request",
  APPROVAL_ITEMS_NOT_CLASSIFIED:
    "All items must be classified with a code secondaire before final approval",
  APPROVAL_PAID_WRONG_STATUS:
    "Cannot mark paid request with status: {{status}}",
  CLASSIFICATION_WRONG_STATUS:
    "Cannot classify items on request with status: {{status}}",
  CLASSIFICATION_ITEM_NOT_FOUND: "{{itemLabel}} not found in this request",
  DOCUMENT_NOT_FOUND: "Document not found",
  DOCUMENT_OWNER_ONLY_UPLOAD: "Only the request owner can upload documents",
  DOCUMENT_OWNER_ONLY_DELETE: "Only the request owner can delete documents",
  DOCUMENT_REQUEST_WRONG_STATUS:
    "Cannot upload documents to request with status: {{status}}",
  DOCUMENT_FILE_FIELD_REQUIRED: "A 'file' field is required",
  DOCUMENT_FILE_TOO_LARGE: "File exceeds maximum size of {{maxMb}}MB",
  DOCUMENT_TYPE_NOT_ALLOWED: "File type '{{fileType}}' is not allowed",
  DOCUMENT_ITEM_MISMATCH: "Item does not belong to this request",
};

const FR: Record<ErrorCode, string> = {
  INTERNAL_ERROR: "Erreur interne du serveur",
  VALIDATION_ERROR: "Erreur de validation",
  AUTH_REQUIRED: "Authentification requise",
  AUTH_INVALID_TOKEN: "Jeton invalide ou expiré",
  AUTH_INVALID_CREDENTIALS: "Identifiants invalides",
  AUTH_EMAIL_IN_USE: "Cette adresse courriel est déjà utilisée",
  AUTH_REFRESH_TOKEN_MISSING: "Aucun jeton de rafraîchissement fourni",
  AUTH_REFRESH_TOKEN_INVALID: "Jeton de rafraîchissement invalide",
  AUTH_REFRESH_TOKEN_EXPIRED: "Jeton de rafraîchissement expiré",
  AUTH_CSRF_FAILED:
    "Contrôle CSRF échoué : en-tête X-Requested-With manquant",
  AUTH_FORBIDDEN_ROLE: "Accès refusé. Rôle(s) requis : {{roles}}",
  AUTH_RATE_LIMITED:
    "Trop de requêtes — veuillez attendre une minute et réessayer",
  USER_NOT_FOUND: "Utilisateur introuvable",
  USER_SUPERVISOR_INVALID_ROLE:
    "Le superviseur assigné doit avoir le rôle SUPERVISEUR ou ADMIN FINANCIER",
  SUPERVISOR_NOT_FOUND: "Superviseur introuvable",
  ACCOUNT_NOT_FOUND: "Compte introuvable",
  ACCOUNT_NUMBER_DUPLICATE:
    "Ce numéro de compte existe déjà pour ce superviseur",
  ACCOUNT_NOT_SUPERVISOR_ROLE:
    "L'utilisateur cible n'a pas un rôle de superviseur",
  ACCOUNT_OWN_ONLY: "Vous ne pouvez consulter que vos propres comptes",
  REQUEST_NOT_FOUND: "Demande introuvable",
  REQUEST_ACCESS_DENIED: "Accès refusé",
  REQUEST_OWNER_ONLY_EDIT:
    "Seul le propriétaire de la demande peut la modifier",
  REQUEST_WRONG_STATUS_EDIT:
    "Modification impossible pour une demande au statut : {{status}}",
  REQUEST_WRONG_STATUS_DELETE:
    "Suppression impossible pour une demande au statut : {{status}}",
  REQUEST_WRONG_STATUS_SUBMIT:
    "Soumission impossible pour une demande au statut : {{status}}",
  REQUEST_WRONG_STATUS_REVISE:
    "Révision impossible pour une demande au statut : {{status}}",
  TRAVEL_DETAILS_REQUIRED:
    "Les détails du voyage sont requis avant la soumission",
  TRAVEL_DESTINATION_REQUIRED: "La destination est requise",
  TRAVEL_PURPOSE_REQUIRED: "L'objet est requis",
  LINKED_ADVANCE_MISSING: "L'avance de voyage liée n'existe pas",
  LINKED_ADVANCE_NOT_OWNED: "L'avance de voyage liée ne vous appartient pas",
  LINKED_ADVANCE_WRONG_TYPE:
    "La demande liée n'est pas une avance de voyage",
  LINKED_ADVANCE_NOT_PAID: "L'avance de voyage liée doit être payée",
  APPROVAL_WRONG_STATUS:
    "Action impossible ({{verb}}) sur une demande au statut : {{status}}",
  APPROVAL_WRONG_SUPERVISOR: "Cette demande est assignée à un autre superviseur",
  APPROVAL_ACCOUNT_NOT_FOUND: "Compte introuvable pour ce superviseur",
  APPROVAL_ACCOUNT_INACTIVE: "Le compte sélectionné est inactif",
  APPROVAL_ALREADY_APPROVED: "Vous avez déjà approuvé cette demande",
  APPROVAL_ITEMS_NOT_CLASSIFIED:
    "Tous les éléments doivent être classés avec un code secondaire avant l'approbation finale",
  APPROVAL_PAID_WRONG_STATUS:
    "Impossible de marquer payée une demande au statut : {{status}}",
  CLASSIFICATION_WRONG_STATUS:
    "Classification impossible pour une demande au statut : {{status}}",
  CLASSIFICATION_ITEM_NOT_FOUND:
    "{{itemLabel}} introuvable dans cette demande",
  DOCUMENT_NOT_FOUND: "Document introuvable",
  DOCUMENT_OWNER_ONLY_UPLOAD:
    "Seul le propriétaire de la demande peut téléverser des documents",
  DOCUMENT_OWNER_ONLY_DELETE:
    "Seul le propriétaire de la demande peut supprimer des documents",
  DOCUMENT_REQUEST_WRONG_STATUS:
    "Téléversement impossible vers une demande au statut : {{status}}",
  DOCUMENT_FILE_FIELD_REQUIRED: "Un champ « file » est requis",
  DOCUMENT_FILE_TOO_LARGE:
    "Le fichier dépasse la taille maximale de {{maxMb}} Mo",
  DOCUMENT_TYPE_NOT_ALLOWED:
    "Le type de fichier « {{fileType}} » n'est pas autorisé",
  DOCUMENT_ITEM_MISMATCH: "L'élément n'appartient pas à cette demande",
};

const MESSAGES: Record<Locale, Record<ErrorCode, string>> = {
  "en-CA": EN,
  "fr-CA": FR,
};

function interpolate(
  template: string,
  details?: Record<string, unknown>,
): string {
  if (!details) return template;
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => details[key] !== undefined ? String(details[key]) : `{{${key}}}`,
  );
}

export function translateError(
  code: ErrorCode,
  locale: Locale,
  details?: Record<string, unknown>,
): string {
  const template = MESSAGES[locale]?.[code] ?? MESSAGES[DEFAULT_LOCALE][code] ??
    code;
  return interpolate(template, details);
}

// Subset of Zod issue codes we care about. Validation issues become structured
// so the frontend can map them to localized field-level messages.
type ZodIssueLike = {
  code: string;
  path: (string | number | symbol)[];
  validation?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  type?: string;
  received?: unknown;
  expected?: unknown;
  options?: unknown;
};

export function mapZodIssue(issue: ZodIssueLike): {
  path: string;
  code: ValidationIssueCode;
  meta?: Record<string, unknown>;
} {
  const path = issue.path.map((p) => String(p)).join(".");
  if (issue.code === "invalid_type" && issue.received === "undefined") {
    return { path, code: "VALIDATION_REQUIRED" };
  }
  if (issue.code === "invalid_type") {
    return {
      path,
      code: "VALIDATION_TYPE",
      meta: { expected: issue.expected, received: issue.received },
    };
  }
  if (issue.code === "invalid_string" && issue.validation === "email") {
    return { path, code: "VALIDATION_EMAIL" };
  }
  if (issue.code === "too_small") {
    return {
      path,
      code: "VALIDATION_MIN",
      meta: { min: Number(issue.minimum), type: issue.type },
    };
  }
  if (issue.code === "too_big") {
    return {
      path,
      code: "VALIDATION_MAX",
      meta: { max: Number(issue.maximum), type: issue.type },
    };
  }
  if (issue.code === "invalid_enum_value") {
    return {
      path,
      code: "VALIDATION_ENUM",
      meta: { options: issue.options },
    };
  }
  return { path, code: "VALIDATION_INVALID" };
}

export function parseAcceptLanguage(header: string | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const tags = header.split(",").map((part) => part.split(";")[0].trim());
  for (const tag of tags) {
    if ((SUPPORTED_LOCALES as readonly string[]).includes(tag)) {
      return tag as Locale;
    }
    const lang = tag.split("-")[0].toLowerCase();
    const match = SUPPORTED_LOCALES.find((l) => l.split("-")[0] === lang);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}
