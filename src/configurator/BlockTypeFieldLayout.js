import $ from 'jquery'

import Garnish from 'garnish'
import Craft from 'craft'

import NS from '../namespace'

const _defaults = {
	namespace: [],
	html: '',
	layout: [],
	blockId: null,
	blockName: ''
}

export default Garnish.Base.extend({

	_templateNs: [],
	_blockName: '',

	init(settings = {})
	{
		settings = Object.assign({}, _defaults, settings)

		this._templateNs = NS.parse(settings.namespace)
		this._blockId = settings.blockId

		this.setBlockName(settings.blockName)

		this.$container = $(settings.html)
		this.$container.removeAttr('id')

		NS.enter(this._templateNs)

		this._fld = new Craft.FieldLayoutDesigner(this.$container, {
			customizableTabs: true,
			fieldInputName: NS.fieldName('fieldLayout[__TAB_NAME__][]'),
			requiredFieldInputName: NS.fieldName('requiredFields[]')
		})

		NS.leave()

		this.$instructions = this.$container.find('.instructions')

		for(let tab of settings.layout)
		{
			let $tab = this.addTab(tab.name)

			for(let field of tab.fields)
			{
				this.addFieldToTab($tab, field.id, field.required == 1)
			}
		}

		this._updateInstructions()
		this._initReasonsPlugin()
	},

	getBlockId()
	{
		return this._blockId
	},

	getBlockName() { return this._blockName },
	setBlockName(name)
	{
		this._blockName = name

		this._updateInstructions()
	},

	/**
	 * @see Craft.FieldLayoutDesigner.addTab
	 */
	addTab(name = 'Tab' + (this._fld.tabGrid.$items.length + 1))
	{
		const fld = this._fld
		const $tab = $(`
			<div class="fld-tab">
				<div class="tabs">
					<div class="tab sel draggable">
						<span>${name}</span>
						<a class="settings icon" title="${Craft.t('Rename')}"></a>
					</div>
				</div>
				<div class="fld-tabcontent"></div>
			</div>
		`).appendTo(fld.$tabContainer)

		fld.tabGrid.addItems($tab)
		fld.tabDrag.addItems($tab)

		// In order for tabs to be added to the FLD, the FLD must be visible in the DOM.
		// To ensure this, the FLD is momentarily placed in the root body element, then after the tab has been added,
		// it is placed back in the same position it was.

		const $containerNext = this.$container.next()
		const $containerParent = this.$container.parent()

		this.$container.appendTo(document.body)

		fld.initTab($tab)

		if($containerNext.length > 0)
		{
			$containerNext.before(this.$container)
		}
		else
		{
			$containerParent.append(this.$container)
		}

		return $tab
	},

	/**
	 * @see Craft.FieldLayoutDesigner.FieldDrag.onDragStop
	 */
	addFieldToTab($tab, fieldId, required = null)
	{
		required = !!required

		const $unusedField = this._fld.$allFields.filter(`[data-id="${fieldId}"]`)
		const $unusedGroup = $unusedField.closest('.fld-tab')
		const $field = $unusedField.clone().removeClass('unused')
		const $fieldContainer = $tab.find('.fld-tabcontent')

		$unusedField.addClass('hidden')
		if($unusedField.siblings(':not(.hidden)').length === 0)
		{
			$unusedGroup.addClass('hidden')
			this._fld.unusedFieldGrid.removeItems($unusedGroup)
		}

		let $fieldInput = $field.find('.id-input')
		if($fieldInput.length === 0)
		{
			let tabName = $tab.find('.tab > span').text()
			let inputName = this._fld.getFieldInputName(tabName)

			$fieldInput = $(`<input class="id-input" type="hidden" name="${inputName}" value="${fieldId}">`)
			$field.append($fieldInput)
		}

		$field.prepend(`<a class="settings icon" title="${Craft.t('Edit')}"></a>`);
		$fieldContainer.append($field)
		this._fld.initField($field)
		this._fld.fieldDrag.addItems($field)

		this.toggleFieldRequire(fieldId, required)
	},

	toggleFieldRequire(fieldId, required = null)
	{
		const $field = this._fld.$tabContainer.find(`[data-id="${fieldId}"]`)
		const isRequired = $field.hasClass('fld-required')

		if(required === null || required !== isRequired)
		{
			const $editButton = $field.find('.settings')
			const menuButton = $editButton.data('menubtn')
			const menu = menuButton.menu
			const $options = menu.$options
			const $requiredOption = $options.filter('.toggle-required')

			this._fld.toggleRequiredField($field, $requiredOption)
		}
	},

	_updateInstructions()
	{
		if(this.$instructions)
		{
			this.$instructions.html(Craft.t("For block type {blockType}", {blockType: this.getBlockName() || '&hellip;'}))
		}
	},

	_initReasonsPlugin()
	{
		if(Craft.ReasonsPlugin)
		{
			const id = this.getBlockId()
			const conditionals = Craft.ReasonsPlugin.neoData.conditionals[id]
			const reasons = new Craft.ReasonsPlugin.FieldLayoutDesigner(this.$container, conditionals)

			reasons.settings.formSelector = '.fieldlayoutform'

			reasons.init()

			reasons.$conditionalsInput.prop('name', `neo[reasons][${id}]`)
			reasons.$conditionalsIdInput.prop('name', `neo[reasonsId][${id}]`)

			this._reasons = reasons
		}
	}
})
