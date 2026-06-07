import { engineReady } from '../engine'

/** True when the currently selected engine can run a request. */
export async function aiActionsAvailable(): Promise<boolean> {
  return engineReady()
}
