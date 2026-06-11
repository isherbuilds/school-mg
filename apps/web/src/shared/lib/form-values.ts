function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function getRequiredString(formData: FormData, key: string) {
  const value = getString(formData, key);

  if (value.length === 0) {
    throw new Error("Invalid form value.");
  }

  return value;
}

export function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? value : undefined;
}

export function getRequiredNumber(formData: FormData, key: string) {
  return getFormInteger(getRequiredString(formData, key));
}

export function getNullableString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? value : null;
}

export function getOptionalNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? getFormInteger(value) : undefined;
}

export function getNullableNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? getFormInteger(value) : null;
}

export function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getFormInteger(value: string) {
  const number = Number(value);

  if (!Number.isFinite(number) || !Number.isInteger(number)) {
    throw new Error("Invalid form value.");
  }

  return number;
}
