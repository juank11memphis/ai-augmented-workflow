// Match the model identity accepted when the persisted run is created.
export function supportedModelId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(value);
}
