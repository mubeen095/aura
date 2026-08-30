#!/usr/bin/env python3
"""SkillGarage static dev server.

Serves the site like `python3 -m http.server 8099` with two additions:

1. Next.js image proxy responses were snapshot locally as files whose NAMES
   include the query string (e.g. `_next/image?url=...&w=1920&q=75`). The
   stock handler strips the query before looking up the file, so those never
   load. This handler falls back to the full `path?query` filename.
2. When a snapshot file is missing, the image is fetched on demand from the
   live CDN and cached under the requested filename, so everything the page
   hydrates keeps working even if the snapshot is incomplete.
"""
import os
import sys
import posixpath
import urllib.parse
import urllib.request
import mimetypes
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

CDN_SWAP = 'https://public-cdn.skillgarage.in/'


class Handler(SimpleHTTPRequestHandler):
    server_version = 'SkillGarageDev/1.0'

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_GET(self):
        if self.path.startswith('/__backend/'):
            return self._proxy_backend()
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith('/__backend/'):
            return self._proxy_backend()
        return super().do_POST()

    def _proxy_backend(self):
        import json
        import http.client
        rest = self.path[len('/__backend'):]
        target = 'https://backend.growthx.club' + rest
        parts = urllib.parse.urlsplit(target)
        body = None
        if self.command == 'POST':
            length = int(self.headers.get('Content-Length') or 0)
            body = self.rfile.read(length) if length else b'{}'
        conn = http.client.HTTPSConnection(parts.hostname, timeout=20)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
            'Origin': 'https://app.growthx.club',
            'Referer': 'https://app.growthx.club/',
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': self.headers.get('Content-Type', 'application/json'),
        }
        if body is not None:
            headers['Content-Length'] = str(len(body))
        conn.request(self.command, parts.path + (('?' + parts.query) if parts.query else ''), body=body, headers=headers)
        res = conn.getresponse()
        data = res.read()
        self.send_response(res.status)
        ctype = res.getheader('Content-Type') or 'application/json'
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)
        conn.close()

    def translate_path(self, path):
        parts = urllib.parse.urlsplit(path)
        plain = posixpath.normpath(urllib.parse.unquote(parts.path))
        words = [w for w in plain.split('/') if w]
        base = os.path.join(self.directory, *words) if words else self.directory
        if os.path.exists(base):
            return base
        if parts.query and '_next/image' in parts.path:
            raw = posixpath.normpath(parts.path + '?' + parts.query)
            words = [w for w in raw.split('/') if w]
            if words:
                cand = os.path.join(self.directory, *words)
                if os.path.isfile(cand):
                    return cand
                low = os.path.join(self.directory, *(w.lower() for w in words))
                if os.path.isfile(low):
                    return low
                legacy = os.path.join(self.directory, *(w.lower().replace('%3a', ':') for w in words))
                if os.path.isfile(legacy):
                    return legacy
                fetched = self._fetch_proxy(parts.query, words)
                if fetched:
                    return fetched
        return base

    def _fetch_proxy(self, query, words):
        """Download a missing proxy image from the CDN and cache it locally."""
        print('PROXY MISS, fetching:', query[:120], file=sys.stderr)
        target = None
        for part in query.split('&'):
            if part.startswith('url='):
                target = urllib.parse.unquote(part[4:])
                break
        if not target:
            return None
        if target.startswith(CDN_SWAP):
            target = 'https://public-cdn.growthx.club/' + target[len(CDN_SWAP):]
        try:
            req = urllib.request.Request(target, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=15) as res:
                data = res.read()
        except Exception:
            return None
        cand = os.path.join(self.directory, *words)
        try:
            os.makedirs(os.path.dirname(cand), exist_ok=True)
            with open(cand, 'wb') as f:
                f.write(data)
            low = os.path.join(self.directory, *(w.lower() for w in words))
            with open(low, 'wb') as f:
                f.write(data)
            print('PROXY CACHED:', target, '->', os.path.basename(cand)[:60], file=sys.stderr)
        except Exception as e:
            print('PROXY CACHE FAIL:', repr(e), file=sys.stderr)
            return None
        return cand

    def guess_type(self, path):
        if '_next/image' in self.path:
            q = urllib.parse.urlsplit(self.path).query
            for part in q.split('&'):
                if part.startswith('url='):
                    up = urllib.parse.unquote(part[4:])
                    ext = os.path.splitext(up)[1] or '.webp'
                    return mimetypes.guess_type('x' + ext)[0] or 'application/octet-stream'
        return super().guess_type(path)


if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
    host = sys.argv[2] if len(sys.argv) > 2 else '0.0.0.0'
    ThreadingHTTPServer((host, port), Handler).serve_forever()