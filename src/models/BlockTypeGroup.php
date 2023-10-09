<?php
namespace benf\neo\models;

use Craft;
use craft\base\Model;

/**
 * Class BlockTypeGroup
 *
 * @package benf\neo\models
 * @author Spicy Web <craft@spicyweb.com.au>
 * @author Benjamin Fleming
 * @since 2.0.0
 */
class BlockTypeGroup extends Model
{
	/**
	 * @var int|null The block type group ID.
	 */
	public $id;

	/**
	 * @var int|null The field ID.
	 */
	public $fieldId;

	/**
	 * @var string|null The block type group name.
	 */
	public $name;

	/**
	 * @var int|null The sort order.
	 */
	public $sortOrder;

	/**
	 * @var string
	 */
	public $uid;

	/**
	 * @inheritdoc
	 */
	public function rules()
	{
		return [
			[['id', 'fieldId', 'sortOrder' ], 'number', 'integerOnly' => true],
		];
	}

	/**
	 * Returns the block type group's name as the string representation.
	 *
	 * @return string
	 */
	public function __toString(): string
	{
		return (string)$this->name;
	}

	/**
	 * Returns whether this block type group is new.
	 *
	 * @return bool
	 */
	public function getIsNew(): bool
	{
		return (!$this->id || strpos($this->id, 'new') === 0);
	}

    /**
     * Returns the block type group config.
     *
     * @return array
     * @since 2.9.0
     */
	public function getConfig(): array
	{
		return [
            'field' => Craft::$app->getFields()->getFieldById($this->fieldId)->uid,
            'name' => $this->name,
            'sortOrder' => (int)$this->sortOrder,
        ];
	}
}
