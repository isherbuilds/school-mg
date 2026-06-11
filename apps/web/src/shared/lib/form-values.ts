import { m } from "@tsu-stack/i18n/messages";

export function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : m.school_setup_page__save_failed();
}

export function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function getOptionalString(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  return value.length > 0 ? value : undefined;
}

export function getRequiredNumber(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  if (value.length === 0) {
    throw new Error(m.school_setup_page__save_failed());
  }
  return getFormInteger(value);
}

export function getNullableString(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  return value.length > 0 ? value : null;
}

export function getOptionalNumber(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  return value.length > 0 ? getFormInteger(value) : undefined;
}

export function getNullableNumber(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  return value.length > 0 ? getFormInteger(value) : null;
}

export function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getFormInteger(value: string) {
  const number = Number(value);

  if (!Number.isFinite(number) || !Number.isInteger(number)) {
    throw new Error(m.school_setup_page__save_failed());
  }

  return number;
}
