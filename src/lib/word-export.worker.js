// Word 导出打包 Worker：在独立线程中运行 html-docx-js，避免阻塞主线程。
// 由 src/app.js 的 exportWord() 创建并通信；worker 自身不依赖 DOM。
importScripts('./html-docx.min.js');

self.onmessage = function (e) {
  const { id, html } = e.data;
  try {
    const blob = self.htmlDocx.asBlob(html);
    const reader = new FileReaderSync();
    const arrayBuffer = reader.readAsArrayBuffer(blob);
    // transfer 所有权，避免把几 MB 的 docx 在主线程再拷贝一次。
    self.postMessage({ id, success: true, arrayBuffer }, [arrayBuffer]);
  } catch (err) {
    self.postMessage({ id, success: false, error: err.message || String(err) });
  }
};
