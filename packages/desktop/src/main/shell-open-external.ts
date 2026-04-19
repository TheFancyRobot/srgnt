import { parseSync, SOpenExternalRequest } from '@srgnt/contracts';

export function createShellOpenExternalHandler(
  openExternal: (url: string) => Promise<void>,
) {
  return async (_event: Electron.IpcMainInvokeEvent, rawPayload: unknown): Promise<void> => {
    const { url } = parseSync(SOpenExternalRequest, rawPayload);
    await openExternal(url);
  };
}
