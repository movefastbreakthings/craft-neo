import $ from 'jquery'
import Garnish from 'garnish'
import Craft from 'craft'
import NS from '../namespace'
import QuickField from '../plugins/quickfield/QuickField'

const _defaults = {
  namespace: [],
  html: '',
  layout: [],
  id: -1,
  blockId: null,
  blockName: ''
}

export default Garnish.Base.extend({

  _templateNs: [],
  _blockName: '',

  init (settings = {}) {
    settings = Object.assign({}, _defaults, settings)

    this._templateNs = NS.parse(settings.namespace)
    this._id = settings.id | 0
    this._blockId = settings.blockId

    this.setBlockName(settings.blockName)

    this.$container = $(settings.html).find('.layoutdesigner')
    this.$container.removeAttr('id')

    NS.enter(this._templateNs)

    this._fld = new Craft.FieldLayoutDesigner(this.$container, {
      customizableTabs: true,
      customizableUi: true,
      elementPlacementInputName: NS.fieldName('elementPlacements[__TAB_NAME__][]'),
      elementConfigInputName: NS.fieldName('elementConfigs[__ELEMENT_KEY__]')
    })

    NS.leave()

    this._tabObserver = new window.MutationObserver(() => {
      const selector = '[data-type=benf\\\\neo\\\\fieldlayoutelements\\\\ChildBlocksUiElement]'
      const $uiLibraryElement = this._fld.$uiLibraryElements.filter(selector)
      const $tabUiElement = this._fld.$tabContainer.find(selector)
      $uiLibraryElement.toggleClass(
        'hidden',
        $tabUiElement.length > 0 || $('body.dragging .draghelper' + selector).length > 0
      )
      if ($tabUiElement.hasClass('velocity-animating')) {
        $tabUiElement.removeClass('hidden')
      }
    })

    for (const tab of settings.layout) {
      const $tab = this.addTab(tab.name)

      for (const element of tab.elements) {
        this.addElementToTab($tab, element)
      }
    }

    this._initQuickFieldPlugin()
  },

  getId () {
    return this._id
  },

  getBlockId () {
    return this._blockId
  },

  getBlockName () { return this._blockName },
  setBlockName (name) {
    this._blockName = name
  },

  /**
   * @see Craft.FieldLayoutDesigner.addTab
   */
  addTab (name = 'Tab' + (this._fld.tabGrid.$items.length + 1)) {
    const fld = this._fld
    const $tab = $(`
      <div class="fld-tab">
        <div class="tabs">
          <div class="tab sel draggable">
            <span>${name}</span>
            <a class="settings icon" title="${Craft.t('neo', 'Rename')}"></a>
          </div>
        </div>
        <div class="fld-tabcontent"></div>
      </div>
    `).appendTo(fld.$tabContainer)

    fld.tabGrid.addItems($tab)
    fld.tabDrag.addItems($tab)

    this.$container.appendTo(document.body)

    fld.initTab($tab)
    this._tabObserver.observe($tab.children('.fld-tabcontent')[0], { childList: true, subtree: true })

    return $tab
  },

  /**
   * @see Craft.FieldLayoutDesigner.ElementDrag.onDragStop
   */
  addElementToTab ($tab, element) {
    const $elementContainer = $tab.find('.fld-tabcontent')
    let $element = null

    if (element.type === 'craft\\fieldlayoutelements\\CustomField') {
      const $unusedField = this._fld.$fields.filter(`[data-id="${element.id}"]`)

      // If a field's not required, `element.config.required` should either be `false` or
      // an empty string, but it seems there was a bug in earlier Craft 3.5 that caused it
      // to be saved as the string `'0'`
      const isRequired = element.config.required && element.config.required !== '0'
      $element = $unusedField.clone().toggleClass('fld-required', isRequired)
      const $required = $(`<span class="fld-required-indicator" title="${Craft.t('app', 'This field is required')}"></span>`)
      let $requiredAppendee = $element.find('.fld-element-label')

      // If `element.config.label` isn't set, this just means the field label hasn't been
      // overridden in any way, so we don't need to do anything to it
      if (element.config.label) {
        // Do we need to hide the label?
        if (element.config.label === '__blank__') {
          $requiredAppendee.remove()

          if (isRequired) {
            $requiredAppendee = $element.find('.fld-attribute')
          }
        } else {
          $requiredAppendee.children('h4').text(element.config.label)
        }
      }

      if (isRequired) {
        $requiredAppendee.append($required)
      }

      $unusedField.addClass('hidden')
    } else {
      $element = this._fld.$uiLibraryElements.filter(function () {
        const $this = $(this)
        const type = $this.data('type')
        const style = $this.data('config').style

        return type === element.type && (!style || style === element.config.style)
      }).clone()
      let newLabel = null

      switch (element.type) {
        case 'craft\\fieldlayoutelements\\Tip':
          newLabel = element.config.tip
          break

        case 'craft\\fieldlayoutelements\\Heading':
          newLabel = element.config.heading
          break

        case 'craft\\fieldlayoutelements\\Template':
          newLabel = element.config.template
          break
      }

      if (newLabel) {
        const $label = $element.find('.fld-element-label')
        $label.text(newLabel)
        $label.toggleClass('code', element.type === 'craft\\fieldlayoutelements\\Template')
      }
    }

    $element.removeClass('unused')
    $elementContainer.append($element)
    $element.data('config', element.config)
    $element.data('settings-html', element['settings-html'])
    this._fld.initElement($element)
    this._fld.elementDrag.addItems($element)
  },

  getLayoutStructure () {
    const tabs = []
    const elementProperties = ['config', 'id', 'type']

    this._fld.$tabContainer.children('.fld-tab').each(function () {
      const $tab = $(this)
      const tabName = $tab.find('.tab span').text()
      const tabElements = []

      $tab.find('.fld-element').each(function () {
        const $element = $(this)
        const elementData = {}

        elementProperties
          .filter(prop => typeof $element.data(prop) !== 'undefined')
          .forEach(prop => { elementData[prop] = $element.data(prop) })

        // Do settings-html separately so we can replace the IDs
        if ($element.data('settings-html')) {
          elementData['settings-html'] = $element.data('settings-html').replace(
            /(id|for)="element-([0-9a-z]+)-([a-z-]+)/g,
            `$1="element-$2-${Date.now()}-$3`
          )
        }

        tabElements.push(elementData)
      })

      tabs.push({ name: tabName, elements: tabElements })
    })

    return tabs
  },

  _initQuickFieldPlugin () {
    if (QuickField) {
      const quickField = new QuickField(this._fld)
      quickField.applyHistory()
      this._quickField = quickField
    }
  }
})
