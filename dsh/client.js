// dsh-settings-tidy - Browser half.
// Helpers to keep the (crowded) settings sidebar tidy.
// No build step: hand-written lazy-CJS bundle (window.__ModuleLoader__.load).
// It adds a "整理" section with tidy controls, a compact-nav CSS mode,
// and DOM-based grouping/hiding of the settings sidebar sections.

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

/* Nav (sidebar sections) grouping & hiding containers */
.dst-navroot { display: contents; }
.dst-navgroup { display: contents; }
.dst-navgroup-h { display:flex; align-items:center; gap:6px; cursor:pointer; user-select:none;
  color: var(--dsw-alias-label-tertiary); font-size:11px; font-weight:600; letter-spacing:.05em;
  text-transform:uppercase; padding:10px 12px 4px; }
.dst-navgroup-h:hover { color: var(--dsw-alias-label-secondary); }
.dst-navgroup-count { color: var(--dsw-alias-label-tertiary); font-size:10px; font-weight:400; }
.dst-navgroup-arrow { flex:none; font-size:10px; transition: transform .15s ease; }
.dst-navgroup[data-open="false"] .dst-navgroup-arrow { transform: rotate(-90deg); }
.dst-navgroup[data-open="false"] { display:none; }
.dst-navcell-hidden { display:none !important; }
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

    // ---- DOM organizer for the settings SIDEBAR sections ------------------
    // The settings modal's left rail renders each section as a
    // <button class="VOzbGW_navCell"> inside <div class="VOzbGW_navList">.
    // React doesn't expose section ids in the DOM, so we identify each cell by
    // its label text (the very text the user sees). The organizer lets users:
    //   1) hide sections they don't use (cells get display:none), and
    //   2) fold sections into named, collapsible groups (re-parented nodes).
    // It is a pure DOM pass that never mutates React-managed text/attributes.
    var NAV_NS = 'data-dsh-tidy-nav-arranged'
    var NAV_GROUPS = {
      '通用': '通用',
      '通用设置': '通用',
      'general': '通用',
      '插件': '插件与扩展',
      'plugins': '插件与扩展',
      '插件管理': '插件与扩展',
      '模型': '模型与连接',
      'models': '模型与连接',
      'Agent': 'Agent 与预设',
      '代理': 'Agent 与预设',
      'agent': 'Agent 与预设',
      'agent-presets': 'Agent 与预设',
      '预设': 'Agent 与预设',
      '整理': '整理',
      'tidy': '整理'
    }

    // Keep hide toggles applied without tearing down group wrappers on every
    // observer tick: this walks all live nav cells (whether wrapped or not) and
    // toggles the hide class based on the persisted map.
    function syncNavHidden(rootDocument) {
      var navList = rootDocument.querySelector('nav.VOzbGW_nav .VOzbGW_navList')
      if (!navList) return
      var hidden = (loadPrefs().navHidden) || {}
      var cells = navList.querySelectorAll('.VOzbGW_navCell')
      var hiddenKeys = {}
      for (var k in hidden) { if (hidden[k]) hiddenKeys[k.toLowerCase()] = true }
      Array.prototype.forEach.call(cells, function (cell) {
        var lbl = cell.querySelector('.VOzbGW_navLabel') || cell
        var key = (lbl.textContent || '').trim().toLowerCase()
        var shouldHide = !!hiddenKeys[key]
        if (shouldHide) cell.classList.add('dst-navcell-hidden')
        else if (cell.classList.contains('dst-navcell-hidden')) cell.classList.remove('dst-navcell-hidden')
      })
    }

    function arrangeNav(rootDocument) {
      if (typeof rootDocument === 'undefined' || !rootDocument.body) return
      var navList = rootDocument.querySelector('nav.VOzbGW_nav .VOzbGW_navList')
      if (!navList) return
      var prefs = loadPrefs()
      var enabled = prefs.tidyNav
      if (!enabled) {
        // Tear down any wrappers we created and revert hide classes.
        navList.querySelectorAll('[data-dst-navroot="1"]').forEach(function (n) { n.remove() })
        navList.removeAttribute(NAV_NS)
        Array.prototype.slice.call(navList.children).forEach(function (cell) {
          if (cell.classList && cell.classList.contains('dst-navcell-hidden')) cell.classList.remove('dst-navcell-hidden')
        })
        return
      }
      // Re-parenting live cells on every DOM tick risks losing React's re-created
      // cells; only re-arrange once per open (NAV_NS is cleared when the modal
      // closes). Between passes we just keep hide state in sync.
      if (navList.getAttribute(NAV_NS) === '1') {
        syncNavHidden(rootDocument)
        return
      }
      navList.querySelectorAll('[data-dst-navroot="1"]').forEach(function (n) { n.remove() })
      navList.removeAttribute(NAV_NS)
      var cells = Array.prototype.slice.call(navList.children).filter(function (n) {
        return n.classList && n.classList.contains('VOzbGW_navCell')
      })
      if (cells.length === 0) return
      var hidden = prefs.navHidden || {}
      var groups = prefs.navGroups || {}
      function labelOf(cell) {
        var lbl = cell.querySelector('.VOzbGW_navLabel') || cell
        return (lbl.textContent || '').trim()
      }
      function mapValue(map, key) {
        if (!key) return undefined
        if (map[key] !== undefined) return map[key]
        return map[key.toLowerCase()]
      }
      // First pass: compute plan and collect cells per group.
      var plan = cells.map(function (cell) {
        var key = labelOf(cell)
        var manual = mapValue(groups, key)
        var grp = manual || (mapValue(NAV_GROUPS, key) || '')
        var isHidden = !!mapValue(hidden, key)
        return { cell: cell, key: key, grp: grp, isHidden: isHidden }
      })
      // Collect consecutive same-group runs.
      var runs = []
      var current = null
      plan.forEach(function (item) {
        if (item.isHidden) {
          item.cell.classList.add('dst-navcell-hidden')
          // Hidden cells are not part of any group run.
          if (current) { runs.push(current); current = null }
          return
        }
        if (item.grp) {
          if (current && current.grp === item.grp) {
            current.cells.push(item.cell)
          } else {
            if (current) runs.push(current)
            current = { grp: item.grp, cells: [item.cell] }
          }
        } else {
          if (current) runs.push(current)
          current = null
          // Ungrouped cells stay as-is (no wrapping).
        }
      })
      if (current) runs.push(current)
      // Build a display:contents root that re-parents cells.
      var root = rootDocument.createElement('div')
      root.setAttribute('data-dst-navroot', '1')
      root.className = 'dst-navroot'
      // For each run, create a group wrapper with header.
      runs.forEach(function (run) {
        var panel = rootDocument.createElement('div')
        panel.className = 'dst-navgroup'
        panel.setAttribute('data-open', '1')
        var head = rootDocument.createElement('div')
        head.className = 'dst-navgroup-h'
        head.setAttribute('role', 'button')
        head.setAttribute('tabindex', '0')
        var arrow = rootDocument.createElement('span')
        arrow.className = 'dst-navgroup-arrow'; arrow.textContent = '▾'
        var title = rootDocument.createElement('span')
        title.textContent = run.grp
        var count = rootDocument.createElement('span')
        count.className = 'dst-navgroup-count'; count.textContent = '(' + run.cells.length + ')'
        head.appendChild(arrow); head.appendChild(title); head.appendChild(count)
        head.addEventListener('click', function () {
          var open = panel.getAttribute('data-open') === '1'
          panel.setAttribute('data-open', open ? '0' : '1')
        })
        head.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); head.click() }
        })
        panel.appendChild(head)
        // Re-parent the live cell nodes into the group body. Moving (not
        // cloning) DOM nodes preserves React's root-delegated click handlers.
        run.cells.forEach(function (cell) {
          panel.appendChild(cell)
        })
        root.appendChild(panel)
      })
      navList.appendChild(root)
      navList.setAttribute(NAV_NS, '1')
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
          var t = window.setTimeout(function () {
            if (prefs.tidyNav) arrangeNav(document)
          }, 50)
          return function () { window.clearTimeout(t) }
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
        h('p', { style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: '13px', margin: '0 0 8px' } }, '当安装了大量插件时，设置侧边栏会变得又长又乱。这里提供了几种让它保持整洁的方式。'),
        row('紧凑模式', '缩小侧边栏导航的间距，让更多分区一屏放下。',
          toggle(prefs.compact, function (v) { update({ compact: v }) })),
        row('侧边栏分区整理', '把设置侧边栏的分区归入折叠组，并可隐藏不常用的分区。',
          toggle(prefs.tidyNav, function (v) { update({ tidyNav: v }) })),
        row('保留最后一次打开的分区', '再次打开设置时自动回到上次查看的分区（原生功能；此处为提示）。',
          h('span', { style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: '12px' } }, '原生行为')),

        // ---- 分区显示设置 ----
        h('details', { style: { marginTop: '8px', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '10px', padding: '10px 14px' }, open: true },
          h('summary', { style: { cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, '分区显示设置'),
          h('p', { style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: '12px', margin: '6px 0 10px' } },
            '勾选启用分区整理后，可在此设置每个分区的显示/隐藏和分组归属。'),
          SectionSettings({ prefs: prefs, update: update })
        )
      )
    }

    // ---- 分区显示设置子组件（读取 DOM 获取可用分区列表）----
    function SectionSettings({ prefs, update }) {
      var React
      try { React = require('react') } catch (e) { React = { useState: function (x) { return [x, function () {}] }, useEffect: function () {}, useMemo: function (x) { return x() }, createElement: function () { return null } } }
      var h = React.createElement
      var useState = React.useState
      var useEffect = React.useEffect
      var useMemo = React.useMemo

      var [sections, setSections] = useState([])
      useEffect(function () {
        function read() {
          var navList = document.querySelector('nav.VOzbGW_nav .VOzbGW_navList')
          if (!navList) return
          var cells = Array.prototype.slice.call(navList.children).filter(function (n) {
            return n.classList && n.classList.contains('VOzbGW_navCell')
          })
          var items = cells.map(function (cell) {
            var lbl = cell.querySelector('.VOzbGW_navLabel') || cell
            return (lbl.textContent || '').trim()
          }).filter(function (l) { return l !== '整理' })
          // Deduplicate while preserving order.
          var seen = {}
          var result = []
          items.forEach(function (l) { if (!seen[l]) { seen[l] = true; result.push(l) } })
          setSections(result)
        }
        read()
        // Re-read when the modal might have updated.
        var timer = window.setTimeout(read, 300)
        return function () { window.clearTimeout(timer) }
      }, [])

      var hidden = prefs.navHidden || {}
      var groups = prefs.navGroups || {}

      function toggleHidden(key) {
        var next = Object.assign({}, hidden)
        if (next[key]) delete next[key]
        else next[key] = true
        update({ navHidden: next })
      }
      function setGroup(key, val) {
        var next = Object.assign({}, groups)
        if (val) next[key] = val
        else delete next[key]
        update({ navGroups: next })
      }

      if (sections.length === 0) {
        return h('div', { style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: '12px', padding: '4px 0' } }, '暂未检测到设置分区。请先打开设置面板。')
      }

      var GROUP_OPTIONS = [
        { value: '', label: '不分组' },
        { value: '通用', label: '通用' },
        { value: '插件与扩展', label: '插件与扩展' },
        { value: '模型与连接', label: '模型与连接' },
        { value: 'Agent 与预设', label: 'Agent 与预设' },
        { value: '整理', label: '整理' }
      ]

      var rows = sections.map(function (key) {
        var isHidden = !!hidden[key]
        var grp = groups[key] || ''
        return h('div', {
          key: key,
          style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--dsw-alias-border-l2)', fontSize: '13px' }
        },
          h('span', { style: { flex: '1', color: 'var(--dsw-alias-label-primary)', opacity: isHidden ? '0.5' : '1' } }, key),
          h('button', {
            type: 'button',
            onClick: function () { toggleHidden(key) },
            style: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-primary)', borderRadius: '999px', padding: '2px 10px', fontSize: '11px', cursor: 'pointer', flex: 'none' }
          }, isHidden ? '隐藏' : '显示'),
          h('select', {
            value: grp,
            onChange: function (e) { setGroup(key, e.target.value) },
            style: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', borderRadius: '6px', padding: '2px 4px', fontSize: '11px', cursor: 'pointer', flex: 'none', maxWidth: '110px' }
          }, GROUP_OPTIONS.map(function (opt) {
            return h('option', { key: opt.value, value: opt.value }, opt.label)
          }))
        )
      })
      return h('div', {}, rows)
    }

    function apply(ctx) {
      var React
      try { React = require('react') } catch (error) { console.error('[dsh-settings-tidy] react unavailable: ' + error); return }

      applyStyle(ctx)

      // Re-apply the sidebar-section organizer whenever the settings modal opens
      // (the nav is mounted lazily; a light observer keeps us in sync).
      if (typeof MutationObserver === 'function') {
        var observer = new MutationObserver(function () {
          if (loadPrefs().tidyNav) arrangeNav(document)
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
    exports.inject = ['slots']
    return module.exports
  }
})

//# sourceMappingURL=client.js.map