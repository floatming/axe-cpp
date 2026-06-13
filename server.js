const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = parseInt(process.env.PORT) || 80;
const PUBLIC_DIR = path.join(__dirname, 'public');

//  MIME 类型
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

// 静态文件服务
function serveStatic(req, res) {
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

// 解析 JSON body
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

// 编译并运行 C++ 代码
async function compileAndRun(req, res) {
  const { code, stdin } = await parseBody(req);

  if (!code) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ output: '', error: '请输入C++代码' }));
    return;
  }

  const tmpDir = '/tmp/cpp_online';
  const srcFile = path.join(tmpDir, 'main.cpp');
  const outFile = path.join(tmpDir, 'main.out');

  try {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(srcFile, code);

    // 编译（2>&1 把 stderr 合并到 stdout，所以从 stdout 读错误信息）
    const compileCmd = `g++ -std=c++17 -O2 -o "${outFile}" "${srcFile}" 2>&1`;
    exec(compileCmd, { timeout: 10000 }, (compileErr, compileStdout) => {
      // 编译失败时，错误信息在 compileStdout 里（因为 2>&1）
      if (compileErr) {
        const compileError = (compileStdout && compileStdout.trim()) || compileErr.message;
        try { fs.unlinkSync(srcFile); } catch {}
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ output: '', error: compileError }));
        return;
      }

      // 运行（超时5秒）
      const runCmd = `"${outFile}"`;
      const child = exec(runCmd, { timeout: 5000, maxBuffer: 1024 * 1024 });

      let inputSent = false;
      if (stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
        inputSent = true;
      }

      let output = '';
      let errorOutput = '';
      child.stdout.on('data', d => output += d);
      child.stderr.on('data', d => errorOutput += d);

      child.on('close', (code, signal) => {
        try {
          fs.unlinkSync(srcFile);
          fs.unlinkSync(outFile);
        } catch {}

        let error = errorOutput;
        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          error = '运行超时（超过5秒），程序已被终止。';
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ output, error }));
      });

      child.on('error', (err) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ output: '', error: err.message }));
      });
    });
  } catch (e) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ output: '', error: '服务器错误: ' + e.message }));
  }
}

// 主服务器
const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST' && req.url === '/compile') {
    compileAndRun(req, res);
  } else {
    serveStatic(req, res);
  }
});

function startServer(port) {
  server.listen(port, () => {
    const url = `http://axe.local${port === 80 ? '' : ':' + port}`;
    console.log(`
✅ AXE的C++ 编译器已启动！`);
    console.log(`   本机访问: ${url}`);
    console.log(`   按 Ctrl+C 停止服务器
`);
  });

  server.on('error', (err) => {
    if (err.code === 'EACCES' && port === 80) {
      console.log(`⚠️  80端口需要管理员权限，自动切换到 8080 端口...`);
      startServer(8080);
    } else if (err.code === 'EADDRINUSE') {
      console.log(`❌ 端口 ${port} 已被占用，请先停止其他服务。`);
      process.exit(1);
    } else {
      console.log(`❌ 启动失败:`, err.message);
      process.exit(1);
    }
  });
}

startServer(PORT);
