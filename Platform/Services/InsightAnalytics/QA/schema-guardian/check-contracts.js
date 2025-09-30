import { diff } from 'openapi-diff';

export async function validateContract(currentSpec, previousSpec) {
  const result = await diff({ sourceSpec: previousSpec, destinationSpec: currentSpec });
  if (result.breakingDifferencesFound) {
    throw new Error(`Breaking changes detected: ${result.breakingDifferences.length}`);
  }
  return result;
}
