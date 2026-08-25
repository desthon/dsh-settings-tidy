// dsh-settings-tidy - Browser half.
// Helpers to keep the (crowded) settings sidebar tidy.
// No build step: hand-written lazy-CJS bundle (window.__ModuleLoader__.load).
// It adds a "整理" section with useful tidy controls, a compact-nav CSS mode,
// and (opt-in) DOM-based grouping of the Plugins→配置 cards.

window.__ModuleLoader__.load({
  id: 'dsh-settings-tidy',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    // ------------------------------------------------------------------
    // Persisted preference (localStorage) so choices survive reloads.
    // ------------------------------------------------------------------
    var STORE_KEY = 'dsh-settings-tidy'
    function loadPrefs() {
      try {
        var raw = window.localStorage.getItem(STORE_KEY)
        if (raw) return JSON.parse(raw) || {}
      } catch (e) {}
      return {}
    }
    function savePrefs(prefs) {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(prefs))
      } catch (e) {}
    }

    // ---- CSS ------------------------------------------------------------
    var CSS = `
[data-dsh-tidy="compact"] .VOzbGW_nav { gap: 10px; padding: 14px 10px 0; width: 168px; }
[data-dsh-tidy="compact"] .VOzbGW_navCell { height: 34px; padding: 6px 12px 6px 10px; font-size: 13px; }
[data-dsh-tidy="compact"] .VOzbGW_navTitle { font-size: 14px; padding: 0 10px; }
[data-dsh-tidy="compact"] .VOzbGW_navList { gap: 2px; }
[data-dsh-tidy="compact"] .VOzbGW_panel { max-height: min(760px, calc(100vh - 40px)); }
[data-dsh-tidy="compact"] .VOzbGW_nav { overflow-y: auto; }

/* Group containers the organizer inserts around plug-in cards */
.dst-group { margin: 2px 0 8px; }
.dst-group-h { display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none;
  color: var(--dsw-alias-label-secondary); font-size:12px; font-weight:600; letter-spacing:.02em;
  padding:8px 4px 4px; }
.dst-group-h:hover { color: var(--dsw-alias-label-primary); }
.dst-group-count { color: var(--dsw-alias-label-tertiary); font-size:11px; font-weight:400; }
.dst-group-arrow { flex:none; font-size:11px; transition: transform .15s ease; }
.dst-group[data-open="false"] .dst-group-arrow { transform: rotate(-90deg); }
.dst-group[data-open="false"] .dst-group-body { display: none; }
.dst-group-body { }
.dst-empty { color: var(--dsw-alias-label-tertiary); font-size:12px; padding:2px 4px 8px; }
`

    function applyStyle(host) {
      if (typeof document === 'undefined') return
      var tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-settings-tidy'
      tag.textContent = CSS
      document.head.appendChild(tag)
      if (host && typeof host.effect === 'function') host.effect(function () { return function () { tag.remove() } }, 'dsh-settings-tidy: styles')
    }

    // Apply preference to documentElement (used by the shell classes to vary compact nav)
    function syncRootAttr(prefs) {
      if (typeof document === 'undefined') return
      if (prefs.compact) document.documentElement.setAttribute('data-dsh-tidy', 'compact')
      else document.documentElement.removeAttribute('data-dsh-tidy')
    }

    // ---- DOM organizer for Plugins→配置 cards ----------------------------
    // The configurable tab lives inside the Plugins section (its cards are <li class*=card> 
    // under a <ul class*=cards>). We can't re-render React from outside, but we can re-wrap
    // stable card nodes into collapsible groups keyed by a prefix / keyword, and stay out of
    // React's way (no mutation of React-managed attributes/text; only re-parent + add wrappers).
    // We re-run on DOM changes and keep positions/order.
    var ORGANIZER_NS = 'data-dsh-tidy-grouped'

    function organizeCards(rootDocument) {
      if (typeof rootDocument === 'undefined' || !rootDocument.body) return
      var list = rootDocument.querySelector('ul[class*="cards"]')
      if (!list) return
      if (list.getAttribute(ORGANIZER_NS) === '1') return
      var items = Array.prototype.slice.call(list.children)
      if (items.length === 0) return
      // Build a stable grouping key per card from its text (first ~40 chars).
      function groupKeyOf(card) {
        var text = (card.textContent || '').trim()
        var lower = text.toLowerCase()
        // Heuristic buckets for common DeepSeek/Harness config namespaces.
        if (/模型|model|provider|llm/.test(lower)) return 'AI / 模型'
        if (/网络|web|search|搜索|api.key|密钥/.test(lower)) return '网络与密钥'
        if (/终端|bash|shell|command|命令/.test(lower)) return '终端 / Shell'
        if (/代理|agent|preset|会话|session/.test(lower)) return 'Agent / 会话'
        if (/插件|插件|plugin|inventory/.test(lower)) return '插件'
        if (/路径|目录|workspace|工作区|storage|存储/.test(lower)) return '文件与存储'
        return '其他配置'
      }
      var groups = []
      var order = []
      items.forEach(function (card, i) {
        var key = groupKeyOf(card)
        var existing = order.indexOf(key)
        if (existing === -1) { order.push(key); groups[key] = { key: key, cards: [] } }
        groups[key].cards.push({ card: card, index: i })
      })
      // Build a widget container in place of the raw <ul>'s children (list stays, we detach its children).
      // Remove any prior group wrappers to be idempotent.
      list.querySelectorAll('[data-dst-group-root="1"]').forEach(function (n) { n.remove() })
      var root = rootDocument.createElement('div')
      root.setAttribute('data-dst-group-root', '1')
      root.style.display = 'contents'
      order.forEach(function (key) {
        var g = groups[key]
        if (!g) return
        var panel = rootDocument.createElement('div')
        panel.className = 'dst-group'
        panel.setAttribute('data-open', '1')
        var head = rootDocument.createElement('div')
        head.className = 'dst-group-h'
        head.setAttribute('role', 'button')
        head.setAttribute('tabindex', '0')
        var arrow = rootDocument.createElement('span')
        arrow.className = 'dst-group-arrow'; arrow.textContent = '▾'
        var title = rootDocument.createElement('span')
        title.textContent = key
        var count = rootDocument.createElement('span')
        count.className = 'dst-group-count'; count.textContent = '(' + g.cards.length + ')'
        head.appendChild(arrow); head.appendChild(title); head.appendChild(count)
        head.addEventListener('click', function () {
          var open = panel.getAttribute('data-open') === '1'
          panel.setAttribute('data-open', open ? '0' : '1')
        })
        head.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); head.click() }
        })
        var body = rootDocument.createElement('div')
        body.className = 'dst-group-body'
        // Re-parent each card into body (React keeps alive; we only move DOM nodes).
        g.cards.slice().sort(function (a, b) { return a.index - b.index }).forEach(function (entry) {
          body.appendChild(entry.card)
        })
        panel.appendChild(head); panel.appendChild(body)
        root.appendChild(panel)
      })
      list.appendChild(root)
      list.setAttribute(ORGANIZER_NS, '1')
    }

    // ---- Settings section component -------------------------------------
    function SettingsTidySection(props) {
      var React
      try { React = require('react') } catch (e) { React = { useState: function (x) { return [x, function () {}] }, useEffect: function () {}, createElement: function () { return null } } }
      var h = React.createElement
      var useState = React.useState
      var useEffect = React.useEffect

      function usePrefs() {
        var pair = useState(loadPrefs)
        var prefs = pair[0], setPrefs = pair[1]
        useEffect(function () {
          syncRootAttr(prefs)
          savePrefs(prefs)
          if (prefs.groupCards) {
            var t = window.setTimeout(function () { organizeCards(document) }, 50)
            return function () { window.clearTimeout(t) }
          }
        }, [prefs])
        return [prefs, function (patch) { setPrefs(Object.assign({}, loadPrefs(), patch)) }]
      }
      var prefsPair = usePrefs()
      var prefs = prefsPair[0], update = prefsPair[1]

      var row = function (label, hint, children) {
        return h('div', { style: { padding: '12px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)', display: 'flex', alignItems: 'center', gap: '12px' } },
          h('div', { style: { flex: 1 } },
            h('div', { style: { color: 'var(--dsw-alias-label-primary)', fontSize: '14px' } }, label),
            hint ? h('div', { style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: '12px', marginTop: '2px' } }, hint) : null
          ),
          children
        )
      }
      var toggle = function (on, onChange) {
        return h('button', {
          type: 'button',
          onClick: function () { onChange(!on) },
          style: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-primary)', borderRadius: '999px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', flex: 'none' }
        }, on ? '开启' : '关闭')
      }

      return h('div', { style: { maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--dsw-alias-label-primary)' } },
        h('h2', { style: { margin: '0 0 4px', fontSize: '18px', fontWeight: 600 } }, '设置整理'),
        h('p', { style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: '13px', margin: '0 0 8px' } }, '当安装了大量插件时，设置侧边栏会变得很长。这里提供了几种让它保持整洁的方式。'),
        row('紧凑模式', '缩小侧边栏导航的间距，让更多分区一屏放下。',
          toggle(prefs.compact, function (v) { update({ compact: v }) })),
        row('插件卡片分组', '把「插件 → 配置」里的卡片按类型折叠成组，可点击展开。',
          toggle(prefs.groupCards, function (v) { update({ groupCards: v }) })),
        row('保留最后一次打开的分区', '再次打开设置时自动回到上次查看的分区（原生功能；此处为提示）。',
          h('span', { style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: '12px' } }, '原生行为')),
        h('div', { style: { marginTop: '12px' } },
          h('details', {},
            h('summary', { style: { cursor: 'pointer', fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' } }, '什么是「卡片分组」？'),
            h('p', { style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: '12px', lineHeight: 1.6, margin: '8px 0 0' } },
              'dsh 的「插件 → 配置」页会每个插件显示一张配置卡片。本插件按关键字（模型 / 网络 / 终端 / Agent / 插件 / 存储 等）把它们归类到可折叠的分组中，便于快速找到某个插件的配置。所有配置仍然在原生页面中，不改变任何插件的行为。')
          )
        )
      )
    }

    function apply(ctx) {
      var React
      try { React = require('react') } catch (error) { console.error('[dsh-settings-tidy] react unavailable: ' + error); return }

      applyStyle(ctx)

      // Re-apply organized grouping whenever the settings modal opens (the cards are
      // mounted lazily; a light observer keeps us in sync while it is open).
      if (typeof MutationObserver === 'function') {
        var observer = new MutationObserver(function () {
          var p = loadPrefs()
          if (p.groupCards) organizeCards(document)
        })
        if (typeof ctx.effect === 'function') {
          ctx.effect(function () {
            observer.observe(document.body, { childList: true, subtree: true })
            return function () { observer.disconnect() }
          }, 'dsh-settings-tidy: observer')
        } else {
          observer.observe(document.body, { childList: true, subtree: true })
        }
      }

      if (typeof ctx.inject !== 'function') return
      ctx.inject(['slots'], function (scope) {
        scope.slots.inject('settings.section', function () {
          return scope.slots.register(
            {
              name: 'settings.section',
              id: 'tidy',
              order: 900,
              label: '整理',
              locale: undefined
            },
            SettingsTidySection
          )
        })
      })

      // Apply the current preference once at load (nav could be rendered already).
      syncRootAttr(loadPrefs())
    }

    exports.apply = apply
    return module.exports
  }
})

//# sourceMappingURL=client.js.map
