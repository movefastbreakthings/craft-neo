<?php

namespace benf\neo\models;

use benf\neo\Plugin as Neo;
use benf\neo\elements\Block;
use benf\neo\models\BlockTypeGroup;
use Craft;
use craft\base\Model;
use craft\behaviors\FieldLayoutBehavior;
use craft\base\GqlInlineFragmentInterface;
use craft\db\Table;
use craft\helpers\Db;
use craft\helpers\Json;
use craft\helpers\StringHelper;

/**
 * Class BlockType
 *
 * @package benf\neo\models
 * @author Spicy Web <plugins@spicyweb.com.au>
 * @author Benjamin Fleming
 * @since 2.0.0
 */
class BlockType extends Model implements GqlInlineFragmentInterface
{
    /**
     * @var int|null The block type ID.
     */
    public $id;

    /**
     * @var int|null The field ID.
     */
    public $fieldId;

    /**
     * @var int|null The field layout ID.
     */
    public $fieldLayoutId;

    /**
     * @var int|null The ID of the block type group this block type belongs to, if any.
     * @since 2.13.0
     */
    public $groupId;

    /**
     * @var string|null The block type's name.
     */
    public $name;

    /**
     * @var string|null The block type's handle.
     */
    public $handle;

    /**
     * @var int|null The maximum number of blocks of this type allowed in this block type's field.
     */
    public $maxBlocks;

    /**
     * @var int|null The maximum number of blocks of this type allowed under one parent block.
     * @since 2.8.0
     */
    public $maxSiblingBlocks;

    /**
     * @var int|null The maximum number of child blocks.
     */
    public $maxChildBlocks;

    /**
     * @var array|string|null The child block types of this block type, either as an array of block type handles, the
     * string '*' representing all of the Neo field's block types, or null if no child block types.
     */
    public $childBlocks;

    /**
     * @var bool Whether this is at the top level of its field.
     */
    public $topLevel = true;

    /**
     * @var int|null The sort order.
     */
    public $sortOrder;

    /**
     * @var string
     */
    public $uid;

    /**
     * @var bool
     */
    public $hasFieldErrors = false;

    /**
     * @var Field|null The Neo field associated with this block type.
     */
    private $_field;

    /**
     * @var BlockTypeGroup|null The block type group this block type belongs to, if any.
     */
    private $_group;

    /**
     * @inheritdoc
     */
    public function __construct($config = [])
    {
        // `childBlocks` might be a string representing an array
        if (isset($config['childBlocks']) && !is_array($config['childBlocks'])) {
            $config['childBlocks'] = Json::decodeIfJson($config['childBlocks']);
        }

        parent::__construct($config);
    }

    /**
     * @inheritdoc
     */
    public function behaviors()
    {
        return [
            'fieldLayout' => [
                'class' => FieldLayoutBehavior::class,
                'elementType' => Block::class,
            ],
        ];
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['id', 'fieldId', 'sortOrder'], 'number', 'integerOnly' => true],
            [['maxBlocks', 'maxChildBlocks'], 'integer', 'min' => 0],
        ];
    }

    /**
     * Returns the block type's handle as the string representation.
     *
     * @return string
     */
    public function __toString(): string
    {
        return (string)$this->handle;
    }

    /**
     * Returns whether this block type is new.
     *
     * @return bool
     */
    public function getIsNew(): bool
    {
        return (!$this->id || strpos($this->id, 'new') === 0);
    }

    /**
     * Returns the Neo field associated with this block type.
     *
     * @return \benf\neo\Field|null
     */
    public function getField()
    {
        $fieldsService = Craft::$app->getFields();

        if (!$this->_field && $this->fieldId) {
            $this->_field = $fieldsService->getFieldById($this->fieldId);
        }

        return $this->_field;
    }

    /**
     * Returns the block type group this block type belongs to, if any.
     *
     * @return BlockTypeGroup|null
     * @since 2.13.0
     */
    public function getGroup()
    {
        if ($this->_group === null && $this->groupId !== null) {
            $this->_group = Neo::$plugin->blockTypes->getGroupById($this->groupId);
        }

        return $this->_group;
    }

    /**
     * @inheritdoc
     */
    public function getFieldContext(): string
    {
        return 'global';
    }

    /**
     * @inheritdoc
     */
    public function getEagerLoadingPrefix(): string
    {
        return $this->handle;
    }

    /**
     * Returns the block type config.
     *
     * @return array
     * @since 2.9.0
     */
    public function getConfig(): array
    {
        $group = $this->getGroup();
        $config = [
            'childBlocks' => $this->childBlocks,
            'field' => $this->getField()->uid,
            'group' => $group ? $group->uid : null,
            'handle' => $this->handle,
            'maxBlocks' => (int)$this->maxBlocks,
            'maxChildBlocks' => (int)$this->maxChildBlocks,
            'maxSiblingBlocks' => (int)$this->maxSiblingBlocks,
            'name' => $this->name,
            'sortOrder' => (int)$this->sortOrder,
            'topLevel' => (bool)$this->topLevel,
        ];
        $fieldLayout = $this->getFieldLayout();

        // Field layout ID might not be set even if the block type already had one -- just grab it from the block type
        $fieldLayout->id = $fieldLayout->id ?? $this->fieldLayoutId;
        $fieldLayoutConfig = $fieldLayout->getConfig();

        // No need to bother with the field layout if it has no tabs
        if ($fieldLayoutConfig !== null) {
            $fieldLayoutUid = $fieldLayout->uid ??
                ($fieldLayout->id ? Db::uidById(Table::FIELDLAYOUTS, $fieldLayout->id) : null) ??
                StringHelper::UUID();

            if (!$fieldLayout->uid) {
                $fieldLayout->uid = $fieldLayoutUid;
            }

            $config['fieldLayouts'][$fieldLayoutUid] = $fieldLayoutConfig;
        }

        return $config;
    }
}
