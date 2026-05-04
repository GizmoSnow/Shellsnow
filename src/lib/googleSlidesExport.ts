const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export async function getDriveAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.error) reject(new Error(response.error));
        else resolve(response.access_token);
      },
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
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

export async function exportToGoogleSlides(
  blob: Blob,
  fileName: string,
  onStatus: (status: string) => void
): Promise<void> {
  onStatus('Connecting to Google Drive...');
  const accessToken = await getDriveAccessToken();
  onStatus('Uploading to Google Slides...');
  const slidesUrl = await uploadToGoogleSlides(blob, fileName, accessToken);
  onStatus('Done!');
  window.open(slidesUrl, '_blank');
}
