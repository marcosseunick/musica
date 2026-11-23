// Integração com Dropbox API v2 (OAuth2 Refresh Token + Upload de arquivos + Links compartilháveis)
// Inclui fallback local em /public/materials/uploads caso o token do Dropbox ainda não esteja ativo.
const fs = require('fs');
const path = require('path');
const { HttpError, badRequest } = require('./http');

const ENV_PATH = path.join(__dirname, '..', '..', '.env');
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

// Cache em memória do access_token temporário gerado a partir do refresh_token
let cachedAccessToken = null;
let cachedTokenExpiresAt = 0;

// Escapa caracteres Unicode (> 0x7F) para o cabeçalho HTTP Dropbox-API-Arg
function toDropboxHeaderJson(obj) {
  return JSON.stringify(obj).replace(/[\u007f-\uffff]/g, (ch) => {
    return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
  });
}

// Sanitiza o nome do arquivo mantendo extensão e caracteres seguros
function sanitizeFileName(rawName) {
  const base = path.basename(String(rawName || 'material.pdf'))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
  return base || 'material.pdf';
}

function getDropboxConfig() {
  const appKey = (process.env.DROPBOX_APP_KEY || '').trim();
  const appSecret = (process.env.DROPBOX_APP_SECRET || '').trim();
  const refreshToken = (process.env.DROPBOX_REFRESH_TOKEN || '').trim();
  const accessToken = (process.env.DROPBOX_ACCESS_TOKEN || '').trim();

  return {
    appKey,
    appSecret,
    refreshToken,
    accessToken,
    hasAppCredentials: Boolean(appKey && appSecret),
    isConnected: Boolean((appKey && appSecret && refreshToken) || accessToken),
    authorizeUrl: appKey
      ? `https://www.dropbox.com/oauth2/authorize?client_id=${encodeURIComponent(appKey)}&token_access_type=offline&response_type=code`
      : null,
  };
}

// Persiste ou atualiza uma chave no arquivo .env e em process.env
function saveEnvVar(key, value) {
  process.env[key] = value;
  let content = '';
  try {
    content = fs.readFileSync(ENV_PATH, 'utf8');
  } catch {
    content = '';
  }

  const regex = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}="${value}"`;
  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    content = content.trimEnd() + `\n${line}\n`;
  }
  fs.writeFileSync(ENV_PATH, content, 'utf8');
}

// Troca o código de autorização (gerado pelo usuário no navegador) por um refresh_token permanente
async function exchangeAuthorizationCode(code) {
  const { appKey, appSecret } = getDropboxConfig();
  if (!appKey || !appSecret) {
    throw badRequest('DROPBOX_APP_KEY e DROPBOX_APP_SECRET não estão configurados no .env.');
  }

  const cleanCode = String(code || '').trim();
  if (!cleanCode) {
    throw badRequest('Informe o código de autorização gerado pelo Dropbox.');
  }

  const body = new URLSearchParams({
    code: cleanCode,
    grant_type: 'authorization_code',
    client_id: appKey,
    client_secret: appSecret,
  });

  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.error_description || data.error || 'Falha ao validar código no Dropbox.';
    throw badRequest(`Dropbox OAuth: ${detail}`);
  }

  if (data.refresh_token) {
    saveEnvVar('DROPBOX_REFRESH_TOKEN', data.refresh_token);
  } else if (data.access_token) {
    saveEnvVar('DROPBOX_ACCESS_TOKEN', data.access_token);
  }

  cachedAccessToken = data.access_token || null;
  cachedTokenExpiresAt = Date.now() + ((data.expires_in || 14400) - 300) * 1000;

  return {
    connected: true,
    hasRefreshToken: Boolean(data.refresh_token),
  };
}

// Obtém um access_token válido (do cache, do refresh_token ou do DROPBOX_ACCESS_TOKEN)
async function getValidAccessToken() {
  if (cachedAccessToken && Date.now() < cachedTokenExpiresAt) {
    return cachedAccessToken;
  }

  const { appKey, appSecret, refreshToken, accessToken } = getDropboxConfig();

  if (appKey && appSecret && refreshToken) {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: appKey,
      client_secret: appSecret,
    });

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) {
      const detail = data.error_description || data.error || 'Não foi possível renovar o token do Dropbox.';
      throw new HttpError(502, `Erro de autenticação no Dropbox: ${detail}`);
    }

    cachedAccessToken = data.access_token;
    cachedTokenExpiresAt = Date.now() + ((data.expires_in || 14400) - 300) * 1000;
    return cachedAccessToken;
  }

  if (accessToken) {
    return accessToken;
  }

  return null;
}

// Converte link compartilhado do Dropbox para visualização/download direto do PDF (?raw=1)
function toDirectDropboxUrl(sharedUrl) {
  try {
    const u = new URL(sharedUrl);
    u.searchParams.delete('dl');
    u.searchParams.set('raw', '1');
    return u.toString();
  } catch {
    return sharedUrl;
  }
}

// Cria ou recupera um link público compartilhável para um caminho no Dropbox
async function getOrCreateSharedLink(accessToken, dropboxPath) {
  const createRes = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: dropboxPath }),
  });

  const createData = await createRes.json().catch(() => ({}));
  if (createRes.ok && createData.url) {
    return toDirectDropboxUrl(createData.url);
  }

  // Caso o link já exista, a própria resposta 409 pode trazê-lo ou consultamos list_shared_links
  const existingUrl = createData?.error?.shared_link_already_exists?.metadata?.url;
  if (existingUrl) {
    return toDirectDropboxUrl(existingUrl);
  }

  const listRes = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: dropboxPath, direct_only: true }),
  });

  const listData = await listRes.json().catch(() => ({}));
  if (listRes.ok && Array.isArray(listData.links) && listData.links.length > 0) {
    return toDirectDropboxUrl(listData.links[0].url);
  }

  const errSummary = createData?.error_summary || 'Verifique se a permissão sharing.write está ativa no App do Dropbox.';
  throw new HttpError(502, `Arquivo enviado ao Dropbox, mas falhou ao gerar link público (${errSummary}).`);
}

// Faz upload de um Buffer para o Dropbox (se conectado) ou salva localmente em /public/materials/uploads
async function uploadMaterialFile({ buffer, originalName, lessonId }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw badRequest('O arquivo enviado está vazio.');
  }

  const safeName = sanitizeFileName(originalName);
  const timestamp = Date.now();
  const folder = lessonId ? `aula-${lessonId}` : 'geral';
  const accessToken = await getValidAccessToken();

  // 1. Upload para o Dropbox quando conectado
  if (accessToken) {
    const dropboxPath = `/materials/${folder}/${timestamp}_${safeName}`;
    const apiArg = toDropboxHeaderJson({
      path: dropboxPath,
      mode: 'add',
      autorename: true,
      mute: true,
    });

    const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Dropbox-API-Arg': apiArg,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });

    const uploadData = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      const summary = uploadData?.error_summary || 'Verifique se a permissão files.content.write está ativa no App do Dropbox.';
      throw new HttpError(502, `Falha no upload para o Dropbox: ${summary}`);
    }

    const finalPath = uploadData.path_lower || uploadData.path_display || dropboxPath;
    const sharedUrl = await getOrCreateSharedLink(accessToken, finalPath);

    return {
      provider: 'dropbox',
      file_url: sharedUrl,
      file_name: safeName,
      dropbox_path: uploadData.path_display || finalPath,
    };
  }

  // 2. Fallback local caso o Dropbox ainda não tenha sido autorizado com o código OAuth
  const relativeUrl = `/materials/uploads/${folder}/${timestamp}_${safeName}`;
  const targetPath = path.join(PUBLIC_DIR, relativeUrl);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, buffer);

  return {
    provider: 'local',
    file_url: relativeUrl,
    file_name: safeName,
  };
}

module.exports = {
  getDropboxConfig,
  exchangeAuthorizationCode,
  uploadMaterialFile,
  sanitizeFileName,
};
