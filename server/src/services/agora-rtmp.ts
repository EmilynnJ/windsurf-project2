const APP_ID = process.env.AGORA_APP_ID!;
const CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID!;
const CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET!;
const authHeader = Buffer.from(`${CUSTOMER_ID}:${CUSTOMER_SECRET}`).toString('base64');
const BASE = `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording`;

export async function acquireResource(channelName: string, uid: string): Promise<string> {
  const res = await fetch(`${BASE}/acquire`, {
    method: 'POST',
    headers: { Authorization: `Basic ${authHeader}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ cname: channelName, uid, clientRequest: { resourceExpiredHour: 24 } })
  });
  const { resourceId } = await res.json();
  return resourceId;
}

export async function startRecording(channelName: string, uid: string, resourceId: string, token: string): Promise<string> {
  const res = await fetch(`${BASE}/resourceid/${resourceId}/mode/mix/start`, {
    method: 'POST',
    headers: { Authorization: `Basic ${authHeader}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cname: channelName,
      uid,
      clientRequest: {
        token,
        recordingConfig: { maxIdleTime: 30, streamTypes: 2, channelType: 0 },
        storageConfig: {
          vendor: 1,
          region: 0,
          bucket: process.env.STORAGE_BUCKET || process.env.AWS_S3_BUCKET || '',
          accessKey: process.env.STORAGE_ACCESS_KEY || process.env.AWS_ACCESS_KEY || '',
          secretKey: process.env.STORAGE_SECRET_KEY || process.env.AWS_SECRET_KEY || ''
        }
      }
    })
  });
  const { sid } = await res.json();
  return sid;
}

export async function stopRecording(channelName: string, uid: string, resourceId: string, sid: string): Promise<void> {
  await fetch(`${BASE}/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`, {
    method: 'POST',
    headers: { Authorization: `Basic ${authHeader}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ cname: channelName, uid, clientRequest: {} })
  });
}
