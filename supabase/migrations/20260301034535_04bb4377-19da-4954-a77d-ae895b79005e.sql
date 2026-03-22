
ALTER TABLE distributions DROP CONSTRAINT distributions_inventory_item_id_fkey;
ALTER TABLE distributions ADD CONSTRAINT distributions_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE;

ALTER TABLE inventory_history DROP CONSTRAINT inventory_history_inventory_item_id_fkey;
ALTER TABLE inventory_history ADD CONSTRAINT inventory_history_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE;

ALTER TABLE receiving_records DROP CONSTRAINT receiving_records_inventory_item_id_fkey;
ALTER TABLE receiving_records ADD CONSTRAINT receiving_records_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE;
