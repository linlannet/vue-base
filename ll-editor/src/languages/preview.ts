/**
 * 轻量 Markdown -> HTML 渲染（无第三方依赖）。
 * 支持：标题(#~######)、粗体 **x**、斜体 *x*、行内码 `x`、代码块 ```、无序列表 -/*、有序列表 1.、引用 >、链接 [t](u)、段落与换行。
 * 由于编辑器内预览场景，仅做基础转义与格式化，不追求 CommonMark 完全兼容。
 */
export function renderMarkdown(src: string): string {
  const esc = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const inline = (s: string): string =>
    esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  let listType: '' | 'ul' | 'ol' = ''
  const closeList = (): void => {
    if (listType) {
      out.push(`</${listType}>`)
      listType = ''
    }
  }
  while (i < lines.length) {
    const line = lines[i]
    const codeFence = line.match(/^```(.*)$/)
    if (codeFence) {
      closeList()
      const buf: string[] = []
      i += 1
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(esc(lines[i]))
        i += 1
      }
      i += 1 // 跳过结束 ```
      out.push(`<pre><code>${buf.join('\n')}</code></pre>`)
      continue
    }
    if (!line.trim()) {
      closeList()
      i += 1
      continue
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      closeList()
      const lvl = h[1].length
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`)
      i += 1
      continue
    }
    const quote = line.match(/^>\s?(.*)$/)
    if (quote) {
      closeList()
      out.push(`<blockquote>${inline(quote[1])}</blockquote>`)
      i += 1
      continue
    }
    const ul = line.match(/^[-*]\s+(.*)$/)
    if (ul) {
      if (listType !== 'ul') {
        closeList()
        out.push('<ul>')
        listType = 'ul'
      }
      out.push(`<li>${inline(ul[1])}</li>`)
      i += 1
      continue
    }
    const ol = line.match(/^\d+\.\s+(.*)$/)
    if (ol) {
      if (listType !== 'ol') {
        closeList()
        out.push('<ol>')
        listType = 'ol'
      }
      out.push(`<li>${inline(ol[1])}</li>`)
      i += 1
      continue
    }
    closeList()
    out.push(`<p>${inline(line)}</p>`)
    i += 1
  }
  closeList()
  return out.join('\n')
}

/** 取知识库文件的渲染视图：md -> html，其余原样展示 */
export function renderKBPreview(language: string, content: string): string {
  if (language === 'markdown' || language === 'md') return renderMarkdown(content)
  return `<pre><code>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
}
