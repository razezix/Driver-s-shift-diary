import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TripStore } from './store.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicDir = join(root, 'public');
const dataFile = process.env.TRIPS_FILE || join(root, 'data', 'trips.json');
const port = Number(process.env.PORT) || 3000;
const store = new TripStore(dataFile);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 100_000) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('INVALID_JSON');
  }
}

async function serveStatic(pathname, response) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = resolve(publicDir, relativePath);
  const pathFromPublic = relative(publicDir, filePath);
  if (pathFromPublic.startsWith('..') || isAbsolute(pathFromPublic)) {
    sendJson(response, 403, { error: 'Доступ запрещён' });
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream',
      'cache-control': 'no-cache'
    });
    response.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') sendJson(response, 404, { error: 'Не найдено' });
    else throw error;
  }
}

export function createAppServer(appStore = store) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

      if (request.method === 'GET' && url.pathname === '/api/day') {
        const date = url.searchParams.get('date');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
          sendJson(response, 400, { error: 'Укажите date в формате YYYY-MM-DD' });
          return;
        }
        sendJson(response, 200, await appStore.getDay(date));
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/trips') {
        const result = await appStore.add(await readJson(request));
        if (result.status === 'invalid') {
          sendJson(response, 400, { error: 'Ошибка проверки данных', details: result.errors });
          return;
        }
        sendJson(response, result.status === 'created' ? 201 : 200, {
          trip: result.trip,
          duplicate: result.status === 'duplicate'
        });
        return;
      }

      if (url.pathname.startsWith('/api/')) {
        sendJson(response, 404, { error: 'Маршрут API не найден' });
        return;
      }

      if (request.method !== 'GET') {
        sendJson(response, 405, { error: 'Метод не поддерживается' });
        return;
      }

      await serveStatic(url.pathname, response);
    } catch (error) {
      if (error.message === 'INVALID_JSON') sendJson(response, 400, { error: 'Некорректный JSON' });
      else if (error.message === 'BODY_TOO_LARGE') sendJson(response, 413, { error: 'Слишком большой запрос' });
      else {
        console.error(error);
        sendJson(response, 500, { error: 'Внутренняя ошибка сервера' });
      }
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createAppServer().listen(port, () => {
    console.log(`Дневник смен запущен: http://localhost:${port}`);
  });
}
