// ===== CodeMirror 编辑器初始化 =====
const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
  mode: 'text/x-c++src',
  theme: 'dracula',
  lineNumbers: true,
  indentUnit: 4,
  smartIndent: true,
  tabSize: 4,
  indentWithTabs: false,
  lineWrapping: false,
  matchBrackets: true,
  autoCloseBrackets: true,
  extraKeys: {
    'Ctrl-Enter': runCode,
    'Cmd-Enter': runCode,
  }
});

// 默认代码示例
const defaultCode = `#include <iostream>
#include <string>
using namespace std;

int main() {
    cout << "Hello, C++!" << endl;
    cout << "请输入你的名字: ";

    string name;
    cin >> name;
    cout << "你好, " << name << "!" << endl;

    return 0;
}`;

editor.setValue(defaultCode);

// ===== DOM 元素 =====
const btnRun = document.getElementById('btn-run');
const btnStop = document.getElementById('btn-stop');
const btnTheme = document.getElementById('btn-theme');
const btnExample = document.getElementById('btn-example');
const btnClear = document.getElementById('btn-clear');
const btnClearOutput = document.getElementById('btn-clear-output');
const btnFontDec = document.getElementById('btn-font-dec');
const btnFontInc = document.getElementById('btn-font-inc');
const stdinInput = document.getElementById('stdin-input');
const outputArea = document.getElementById('output-area');
const statusLabel = document.getElementById('status-label');
const footerStatus = document.getElementById('footer-status');
const footerTime = document.getElementById('footer-time');

let isRunning = false;
let startTime = 0;

// ===== 运行代码 =====
function runCode() {
  if (isRunning) return;

  const code = editor.getValue();
  if (!code.trim()) {
    setOutput('', '请输入C++代码后再运行。', 'error');
    return;
  }

  isRunning = true;
  startTime = Date.now();
  btnRun.style.display = 'none';
  btnStop.style.display = 'flex';
  statusLabel.textContent = '⏳ 正在编译...';
  statusLabel.style.color = 'var(--yellow)';
  footerStatus.textContent = '编译中...';
  outputArea.innerHTML = '<span class="output-placeholder">⏳ 正在编译和运行代码...</span>';

  const stdin = stdinInput.value;

  fetch('/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, stdin })
  })
  .then(res => res.json())
  .then(data => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    footerTime.textContent = `运行时间: ${elapsed}s`;

    if (data.error) {
      // 编译错误
      if (data.error.includes('error:') || data.error.includes('undefined') || data.error.includes('syntax')) {
        setOutput(data.output, data.error, 'compile-error');
      } else {
        setOutput(data.output, data.error, 'error');
      }
      statusLabel.textContent = '❌ 运行出错';
      statusLabel.style.color = 'var(--red)';
      footerStatus.textContent = '运行出错';
    } else {
      setOutput(data.output, '', 'success');
      statusLabel.textContent = '✅ 运行成功';
      statusLabel.style.color = 'var(--green)';
      footerStatus.textContent = `运行成功 (${elapsed}s)`;
    }
  })
  .catch(err => {
    setOutput('', '网络错误: ' + err.message, 'error');
    statusLabel.textContent = '❌ 请求失败';
    statusLabel.style.color = 'var(--red)';
    footerStatus.textContent = '请求失败';
  })
  .finally(() => {
    isRunning = false;
    btnRun.style.display = 'flex';
    btnStop.style.display = 'none';
  });
}

// ===== 设置输出 =====
function setOutput(output, error, type) {
  let html = '';
  if (output) {
    const cls = type === 'success' ? 'output-success' : (type === 'compile-error' ? 'output-compile-error' : '');
    html += `<div class="${cls}">${escapeHtml(output)}</div>`;
  }
  if (error) {
    html += `<div class="output-error">${escapeHtml(error)}</div>`;
  }
  if (!html) {
    html = '<div class="output-placeholder">（无输出）</div>';
  }
  outputArea.innerHTML = html;
  outputArea.scrollTop = outputArea.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== stdin 输入框：Enter 直接运行代码 =====
// Enter = 运行代码，Shift+Enter = 换行
stdinInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    runCode();
  }
});

// ===== 事件绑定 =====
btnRun.addEventListener('click', runCode);

btnStop.addEventListener('click', () => {
  isRunning = false;
  statusLabel.textContent = '⚠️ 已停止';
  statusLabel.style.color = 'var(--yellow)';
  footerStatus.textContent = '已停止';
  btnRun.style.display = 'flex';
  btnStop.style.display = 'none';
});

// 主题切换
let darkMode = true;
btnTheme.addEventListener('click', () => {
  darkMode = !darkMode;
  if (darkMode) {
    document.documentElement.classList.remove('light');
    editor.setOption('theme', 'dracula');
    btnTheme.textContent = '🌙';
  } else {
    document.documentElement.classList.add('light');
    editor.setOption('theme', 'default');
    btnTheme.textContent = '☀️';
  }
});

// 示例代码
const examples = [
  { name: 'Hello World', code: defaultCode },
  { name: '斐波那契', code: `#include <iostream>
using namespace std;

// 递归斐波那契
int fib(int n) {
    if (n <= 1) return n;
    return fib(n-1) + fib(n-2);
}

int main() {
    cout << "斐波那契数列前15项:" << endl;
    for (int i = 0; i < 15; i++) {
        cout << "fib(" << i << ") = " << fib(i) << endl;
    }
    return 0;
}` },
  { name: '冒泡排序', code: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> arr = {64, 34, 25, 12, 22, 11, 90};

    cout << "排序前: ";
    for (int x : arr) cout << x << " ";
    cout << endl;

    // 冒泡排序
    for (int i = 0; i < arr.size() - 1; i++) {
        for (int j = 0; j < arr.size() - i - 1; j++) {
            if (arr[j] > arr[j+1]) {
                swap(arr[j], arr[j+1]);
            }
        }
    }

    cout << "排序后: ";
    for (int x : arr) cout << x << " ";
    cout << endl;

    return 0;
}` },
  { name: '素数判断', code: `#include <iostream>
#include <cmath>
using namespace std;

bool isPrime(int n) {
    if (n < 2) return false;
    for (int i = 2; i <= sqrt(n); i++) {
        if (n % i == 0) return false;
    }
    return true;
}

int main() {
    cout << "100以内的素数:" << endl;
    int count = 0;
    for (int i = 2; i <= 100; i++) {
        if (isPrime(i)) {
            cout << i << " ";
            count++;
            if (count % 10 == 0) cout << endl;
        }
    }
    cout << "\\n\\n共有 " << count << " 个素数" << endl;
    return 0;
}` }
];

let exampleIdx = 0;
btnExample.addEventListener('click', () => {
  exampleIdx = (exampleIdx + 1) % examples.length;
  editor.setValue(examples[exampleIdx].code);
  footerStatus.textContent = '已加载示例: ' + examples[exampleIdx].name;
});

// 清空代码
btnClear.addEventListener('click', () => {
  if (confirm('确定要清空代码吗？')) {
    editor.setValue('');
  }
});

// 清空输出
btnClearOutput.addEventListener('click', () => {
  outputArea.innerHTML = '<div class="output-placeholder">输出已清空</div>';
});

// 字体大小调整
btnFontDec.addEventListener('click', () => {
  const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-size'));
  const next = Math.max(10, current - 1);
  document.documentElement.style.setProperty('--font-size', next + 'px');
  editor.setOption('fontSize', next + 'px');
});

btnFontInc.addEventListener('click', () => {
  const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-size'));
  const next = Math.min(24, current + 1);
  document.documentElement.style.setProperty('--font-size', next + 'px');
  editor.setOption('fontSize', next + 'px');
});

// 快捷键提示
footerStatus.textContent = '就绪 | Ctrl+Enter 运行代码 | 输入区 Enter 直接运行';
