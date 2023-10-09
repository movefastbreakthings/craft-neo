# Events

## BlockTypeEvent

A `BlockTypeEvent` is triggered before and after a block type is saved.

### Example

```php
use benf\neo\events\BlockTypeEvent;
use benf\neo\services\BlockTypes;
use yii\base\Event;

Event::on(BlockTypes::class, BlockTypes::EVENT_BEFORE_SAVE_BLOCK_TYPE, function (BlockTypeEvent $event) {
    // Your code here...
});

Event::on(BlockTypes::class, BlockTypes::EVENT_AFTER_SAVE_BLOCK_TYPE, function (BlockTypeEvent $event) {
    // Your code here...
});
```

## FilterBlockTypesEvent

A `FilterBlockTypesEvent` is triggered for a Neo field when loading a Craft element editor page that includes that field. It allows for filtering which block types or block type groups belonging to that field are allowed to be used, depending on the element being edited.

### Example

This example removes the ability to use a block type with the handle `quote`, and a block type group with the name `Structure`, from a `contentBlocks` Neo field when loading an entry from the `blog` section.

```php
use benf\neo\assets\FieldAsset;
use benf\neo\events\FilterBlockTypesEvent;
use craft\elements\Entry;
use yii\base\Event;

Event::on(FieldAsset::class, FieldAsset::EVENT_FILTER_BLOCK_TYPES, function (FilterBlockTypesEvent $event) {
    $element = $event->element;
    $field = $event->field;

    if ($element instanceof Entry && $element->section->handle === 'blog' && $field->handle === 'contentBlocks') {
        $filteredBlockTypes = [];
        foreach ($event->blockTypes as $type) {
            if ($type->handle !== 'quote') {
                $filteredBlockTypes[] = $type;
            }
        }

        $filteredGroups = [];
        foreach ($event->blockTypeGroups as $group) {
            if ($group->name !== 'Structure') {
                $filteredGroups[] = $group;
            }
        }

        $event->blockTypes = $filteredBlockTypes;
        $event->blockTypeGroups = $filteredGroups;
    }
});
```
