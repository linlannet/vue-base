import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import type { EditorDoc, Diagnostic } from '../core/types'

// 配置 monaco worker（P1 用前端自带 worker；P3 可由插件扩展语言 worker）
// 注意：仅在宿主未提供 MonacoEnvironment 时设置默认，避免覆盖宿主（demo / RuoYi-AI）
// 注入的 worker 配置。库 external monaco 后，内置 ?worker 构造器在 CDN / 宿主场景会失效，
// 因此由宿主通过 getWorkerUrl 等方式提供 worker（详见 design.md §2.1）。
const _globalEnv = self as unknown as { MonacoEnvironment?: monaco.Environment }
if (!_globalEnv.MonacoEnvironment) {
  _globalEnv.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      switch (label) {
        case 'json':
          return new jsonWorker()
        case 'css':
        case 'scss':
        case 'less':
          return new cssWorker()
        case 'html':
        case 'handlebars':
        case 'razor':
          return new htmlWorker()
        case 'typescript':
        case 'javascript':
          return new tsWorker()
        default:
          return new editorWorker()
      }
    }
  }
}

// 关闭 Monaco 内建 JS/TS 语言服务的诊断校验。
// 背景：接口/函数脚本（magic-script）不是标准 JS——含 db/http 等注入全局对象、
// 顶层 return 等扩展语法。标准 tsMode worker 的 _doValidate 对此类脚本会抛
// Uncaught (in promise)，worker 反复崩溃重启导致页面卡死。
// 官方 magic-editor 使用自定义 'magicscript' 语言（不起 ts worker）规避；
// ll-editor 的诊断应走自身 Diagnostic 管线（EditorHost.setDiagnostics），
// 因此在此全局关闭 ts 诊断（保留 javascript 语法高亮）。
monaco.languages.typescript?.javascriptDefaults?.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true
})
monaco.languages.typescript?.typescriptDefaults?.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true
})

/**
 * monaco 编辑器宿主封装（框架无关）：负责创建编辑器实例、模型、主题、内容读写。
 */
export class EditorHost {
  readonly editor: monaco.editor.IStandaloneCodeEditor
  private models = new Map<string, monaco.editor.ITextModel>()
  private changeCb?: (doc: EditorDoc) => void

  constructor(
    container: HTMLElement,
    options?: { theme?: string; language?: string; editorOptions?: Record<string, unknown> }
  ) {
    this.editor = monaco.editor.create(container, {
      theme: options?.theme ?? 'vs',
      automaticLayout: true,
      minimap: { enabled: true },
      glyphMargin: true,
      fontSize: 14,
      scrollBeyondLastLine: false,
      ...(options?.editorOptions || {})
    })
  }

  onContentChange(cb: (doc: EditorDoc) => void): void {
    this.changeCb = cb
    this.editor.onDidChangeModelContent(() => {
      const model = this.editor.getModel()
      if (model && this.changeCb) {
        this.changeCb({
          id: model.uri.toString(),
          name: model.uri.path.split('/').pop() ?? 'untitled',
          language: model.getLanguageId(),
          content: model.getValue(),
          updatedAt: Date.now()
        })
      }
    })
  }

  getOrCreateModel(doc: EditorDoc): monaco.editor.ITextModel {
    let model = this.models.get(doc.id)
    if (!model) {
      model = monaco.editor.createModel(doc.content, doc.language, monaco.Uri.parse(`inmemory://${doc.id}`))
      this.models.set(doc.id, model)
    }
    return model
  }

  setActive(doc: EditorDoc): void {
    const model = this.getOrCreateModel(doc)
    this.editor.setModel(model)
  }

  getValue(id: string): string | undefined {
    return this.models.get(id)?.getValue()
  }

  setValue(id: string, content: string): void {
    this.models.get(id)?.setValue(content)
  }

  removeModel(id: string): void {
    const model = this.models.get(id)
    if (model) {
      model.dispose()
      this.models.delete(id)
    }
  }

  private debugLineIds: string[] = []

  /** 点击左侧 glyph 边栏时回调（用于打/取消断点），参考 linlan-editor 的 gutter 交互 */
  onGlyphMarginClick(cb: (line: number) => void): void {
    this.editor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        e.target.position
      ) {
        cb(e.target.position.lineNumber)
      }
    })
  }

  /** 高亮当前命中断点行；line 为空则清除 */
  setDebugLine(line?: number): string[] {
    if (this.debugLineIds.length) {
      this.debugLineIds = this.editor.deltaDecorations(this.debugLineIds, [])
    }
    if (line != null) {
      const model = this.editor.getModel()
      if (model) {
        const l = Math.min(Math.max(line, 1), model.getLineCount())
        this.debugLineIds = this.editor.deltaDecorations([], [
          {
            range: new monaco.Range(l, 1, l, 1),
            options: { isWholeLine: true, className: 'll-editor-debug-line' }
          }
        ])
      }
    }
    return this.debugLineIds
  }

  /** 将诊断渲染为编辑器内波浪线（Problems 面板 + monaco markers） */
  setDiagnostics(diagnostics: Diagnostic[]): void {
    const model = this.editor.getModel()
    if (!model) return
    const markers: monaco.editor.IMarkerData[] = diagnostics.map((d) => ({
      severity: d.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      message: d.message,
      startLineNumber: d.line,
      startColumn: d.column,
      endLineNumber: d.line,
      endColumn: d.column + 1
    }))
    monaco.editor.setModelMarkers(model, 'll-editor', markers)
  }

  setTheme(theme: string): void {
    monaco.editor.setTheme(theme)
  }

  dispose(): void {
    this.models.forEach((m) => m.dispose())
    this.models.clear()
    this.editor.dispose()
  }
}
