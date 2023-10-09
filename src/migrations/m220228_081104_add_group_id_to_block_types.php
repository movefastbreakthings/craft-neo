<?php

namespace benf\neo\migrations;

use benf\neo\Field;
use benf\neo\Plugin as Neo;
use benf\neo\elements\Block;
use benf\neo\models\BlockTypeGroup;
use Craft;
use craft\db\Migration;

/**
 * m220228_081104_add_group_id_to_block_types migration.
 *
 * @package benf\neo\migrations
 * @author Spicy Web <plugins@spicyweb.com.au>
 * @since 2.13.0
 */
class m220228_081104_add_group_id_to_block_types extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp()
    {
        $projectConfig = Craft::$app->getProjectConfig();

        if (!$this->db->columnExists('{{%neoblocktypes}}', 'groupId')) {
            $this->addColumn('{{%neoblocktypes}}', 'groupId', $this->integer()->after('fieldLayoutId'));
            $this->createIndex(null, '{{%neoblocktypes}}', ['groupId'], false);
            $this->addForeignKey(null, '{{%neoblocktypes}}', ['groupId'], '{{%neoblocktypegroups}}', ['id'], 'SET NULL', null);
        }

        // Set group IDs where necessary
        if (version_compare($projectConfig->get('plugins.neo.schemaVersion', true), '2.13.0', '<')) {
            foreach (Craft::$app->getFields()->getAllFields() as $field) {
                if (!($field instanceof Field)) {
                    continue;
                }

                $groups = $field->getGroups();

                // If the field had no groups, then clearly no group IDs to set
                if (empty($groups)) {
                    continue;
                }

                $items = array_merge($field->getBlockTypes(), $groups);
                usort($items, function ($a, $b) {
                    return (int)$a->sortOrder > (int)$b->sortOrder ? 1 : -1;
                });

                $currentGroup = null;

                foreach ($items as $item) {
                    if ($item instanceof BlockTypeGroup) {
                        $currentGroup = $item;
                        $groupPath = 'neoBlockTypeGroups.' . $item->uid;

                        if ($projectConfig->get($groupPath) === null) {
                            $projectConfig->set($groupPath, $item->getConfig());
                        }
                    } else {
                        $blockTypePath = 'neoBlockTypes.' . $item->uid;

                        if ($projectConfig->get($blockTypePath) === null) {
                            $projectConfig->set($blockTypePath, $item->getConfig());
                        }

                        $projectConfig->set($blockTypePath . '.group', $currentGroup ? $currentGroup->uid : null);
                    }
                }
            }
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    public function safeDown()
    {
        echo "m220228_081104_add_group_id_to_block_types cannot be reverted.\n";
        return false;
    }
}
