const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export function initDriveTokenClient(
  onSuccess: (accessToken: string) => void,
  onError: (err: Error) => void
): any {
  return (window as any).google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: (response: any) => {
      if (response.error) {
        console.error('[GSI] token error:', response.error, response.error_description);
        onError(new Error(response.error));
      } else {
        onSuccess(response.access_token);
      }
    },
    error_callback: (err: any) => {
      console.error('[GSI] error_callback:', err);
      onError(new Error(err.type || 'token_error'));
    },
  });
}

export async function uploadToGoogleSlides(
  blob: Blob,
  fileName: string,
  accessToken: string
): Promise<string> {
  const metadata = {
    name: fileName,
    mimeType: 'application/vnd.google-apps.presentation',
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form }
  );
  if (!response.ok) throw new Error(`Drive upload failed: ${response.status}`);
  const file = await response.json();
  return file.webViewLink as string;
}
