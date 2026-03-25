# Database Entity Relationship Diagram

This diagram visualizes the primary tables and their relationships within the supply inventory system based on your Supabase schema.

```erDiagram
    categories ||--o{ inventory_items : has
    categories ||--o{ receiving_records : categorizes
    
    inventory_items ||--o{ assigned_items : assigned
    inventory_items ||--o{ distributions : distributed
    inventory_items ||--o{ inventory_history : history
    inventory_items ||--o{ receiving_records : received
    inventory_items ||--o{ user_transactions : transactions
    
    assigned_items ||--o{ item_status_history : status_history
    
    supply_requests ||--o{ distributions : fulfilled
    supply_requests ||--o{ receipts : generates
    
    user_transactions ||--o{ receipts : generates
    
    profiles ||--o{ assigned_items : receives
    profiles ||--o{ supply_requests : requests
    profiles ||--o{ user_roles : role
    profiles ||--o{ office_logs : logs
    profiles ||--o{ chat_messages : messages
    profiles ||--o{ notifications : notifications

    offices ||--o{ profiles : assigned
    offices ||--o{ supply_requests : requests

    profiles {
        uuid id PK
        string full_name
        string email
        string status
        string office_location
    }

    offices {
        uuid id PK
        string office_name
    }

    user_roles {
        uuid id PK
        uuid user_id FK
        string role
    }

    categories {
        uuid id PK
        string name
    }

    inventory_items {
        uuid id PK
        uuid category_id FK
        string item_name
        int stock_quantity
        float unit_cost
    }

    assigned_items {
        uuid id PK
        uuid inventory_item_id FK
        uuid user_id FK
        string condition_status
        string possession_status
    }

    supply_requests {
        uuid id PK
        uuid user_id FK
        string item_name
        int quantity
        string status
    }

    distributions {
        uuid id PK
        uuid inventory_item_id FK
        uuid request_id FK
        int quantity
    }

    receipts {
        uuid id PK
        uuid request_id FK
        uuid user_id FK
        string receipt_number
    }

    user_transactions {
        uuid id PK
        uuid inventory_item_id FK
        uuid user_id FK
        string transaction_type
        int quantity
    }

    inventory_history {
        uuid id PK
        uuid inventory_item_id FK
        string action
        int quantity_change
    }

    item_status_history {
        uuid id PK
        uuid assigned_item_id FK
        string previous_condition_status
        string new_condition_status
    }

    receiving_records {
        uuid id PK
        uuid inventory_item_id FK
        int quantity
        float unit_cost
    }

    office_logs {
        uuid id PK
        uuid user_id FK
        string old_office
        string new_office
    }

    chat_messages {
        uuid id PK
        uuid sender_id FK
        uuid receiver_id FK
        string message
    }

    notifications {
        uuid id PK
        uuid user_id FK
        string title
    }

    damaged_returns {
        uuid id PK
        string item_name
        int quantity
        string reason
    }
```
